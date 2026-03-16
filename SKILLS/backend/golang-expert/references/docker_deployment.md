# Docker & Deployment Patterns for Go

## Multi-Stage Dockerfile

### Production Build (minimal image)

```dockerfile
# Stage 1: Build
FROM golang:1.23-alpine AS builder

RUN apk add --no-cache git ca-certificates tzdata

WORKDIR /app

# Cache dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source and build
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s -X main.version=$(git describe --tags --always)" \
    -o /app/server \
    ./cmd/api

# Stage 2: Runtime (scratch = smallest possible image)
FROM scratch

# Import from builder
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /app/server /server

# Non-root user (security)
USER 65534:65534

EXPOSE 8080

ENTRYPOINT ["/server"]
```

### With Distroless (slightly larger but includes glibc)

```dockerfile
FROM golang:1.23 AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-w -s" -o /server ./cmd/api

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=builder /server /server
EXPOSE 8080
ENTRYPOINT ["/server"]
```

### With Alpine (when you need a shell for debugging)

```dockerfile
FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-w -s" -o /server ./cmd/api

FROM alpine:3.19
RUN apk --no-cache add ca-certificates tzdata
RUN adduser -D -g '' appuser
USER appuser
COPY --from=builder /server /server
EXPOSE 8080
ENTRYPOINT ["/server"]
```

---

## Docker Compose for Development

```yaml
# docker-compose.yml
version: "3.9"

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: builder  # Use builder stage for hot reload
    ports:
      - "8080:8080"
    environment:
      - ENVIRONMENT=development
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_USER=postgres
      - DB_PASSWORD=postgres
      - DB_NAME=myapp_dev
      - DB_SSLMODE=disable
      - REDIS_HOST=redis
      - JWT_SECRET=dev-secret-key-at-least-32-chars!!
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - .:/app  # Mount source for hot reload
    command: go run ./cmd/api

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: myapp_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

---

## Graceful Shutdown for Containers

```go
package main

import (
    "context"
    "log/slog"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"
)

func main() {
    // Setup server
    srv := &http.Server{
        Addr:         ":8080",
        Handler:      setupRouter(),
        ReadTimeout:  15 * time.Second,
        WriteTimeout: 15 * time.Second,
        IdleTimeout:  60 * time.Second,
    }

    // Start server in goroutine
    go func() {
        slog.Info("server starting", slog.String("addr", srv.Addr))
        if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            slog.Error("server error", slog.String("error", err.Error()))
            os.Exit(1)
        }
    }()

    // Wait for interrupt signal
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
    <-quit

    slog.Info("shutting down server...")

    // Give in-flight requests time to complete
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    // Shutdown HTTP server
    if err := srv.Shutdown(ctx); err != nil {
        slog.Error("server forced to shutdown", slog.String("error", err.Error()))
    }

    // Close database connections
    if err := closeDB(); err != nil {
        slog.Error("db close error", slog.String("error", err.Error()))
    }

    // Close message broker connections
    if err := closeKafka(); err != nil {
        slog.Error("kafka close error", slog.String("error", err.Error()))
    }

    slog.Info("server exited cleanly")
}
```

---

## Kubernetes Manifests

### Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  labels:
    app: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: myapp
          image: myapp:latest
          ports:
            - containerPort: 8080
          env:
            - name: ENVIRONMENT
              value: "production"
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: myapp-secrets
                  key: db-password
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "256Mi"
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
            timeoutSeconds: 3
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 3
          lifecycle:
            preStop:
              exec:
                command: ["sh", "-c", "sleep 5"]  # Allow LB to drain
      terminationGracePeriodSeconds: 60
```

### Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp
spec:
  selector:
    app: myapp
  ports:
    - port: 80
      targetPort: 8080
  type: ClusterIP
```

---

## Makefile for Go Projects

```makefile
.PHONY: build run test lint docker-build docker-run migrate

# Variables
APP_NAME := myapp
MAIN_PATH := ./cmd/api
DOCKER_IMAGE := $(APP_NAME):latest

# Build
build:
	CGO_ENABLED=0 go build -ldflags="-w -s" -o bin/$(APP_NAME) $(MAIN_PATH)

# Run locally
run:
	go run $(MAIN_PATH)

# Test
test:
	go test -race -cover ./...

test-verbose:
	go test -race -cover -v ./...

test-coverage:
	go test -race -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html

# Lint
lint:
	golangci-lint run ./...

# Vulnerability check
vuln:
	govulncheck ./...

# Docker
docker-build:
	docker build -t $(DOCKER_IMAGE) .

docker-run:
	docker compose up -d

docker-down:
	docker compose down

# Database
migrate-up:
	go run $(MAIN_PATH) migrate up

migrate-down:
	go run $(MAIN_PATH) migrate down

# Generate
generate:
	go generate ./...

# Clean
clean:
	rm -rf bin/ coverage.out coverage.html

# All checks before commit
check: lint test vuln
```

---

## CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-go@v5
        with:
          go-version: "1.23"

      - name: Download dependencies
        run: go mod download

      - name: Lint
        uses: golangci/golangci-lint-action@v4
        with:
          version: latest

      - name: Test
        run: go test -race -coverprofile=coverage.out ./...
        env:
          DB_HOST: localhost
          DB_PORT: 5432
          DB_USER: test
          DB_PASSWORD: test
          DB_NAME: test

      - name: Vulnerability check
        run: |
          go install golang.org/x/vuln/cmd/govulncheck@latest
          govulncheck ./...

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Build Docker image
        run: docker build -t myapp:${{ github.sha }} .

      # Push to registry, deploy, etc.
```

---

## Deployment Checklist

- [ ] Multi-stage Docker build (scratch or distroless)
- [ ] Non-root user in container
- [ ] Health check endpoint (`/health`)
- [ ] Readiness endpoint (`/ready`)
- [ ] Graceful shutdown (30s timeout)
- [ ] Resource limits set (CPU, memory)
- [ ] Secrets from environment/secrets manager (never in image)
- [ ] Liveness and readiness probes configured
- [ ] Pre-stop hook for load balancer draining
- [ ] CI/CD with lint, test, vuln check, build
- [ ] Image scanning for vulnerabilities
- [ ] Structured logging (JSON in production)
