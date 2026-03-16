# Observability Patterns for Go

## Three Pillars: Logs, Metrics, Traces

```
┌─────────────────────────────────────────┐
│              Observability              │
├──────────┬──────────┬──────────────────┤
│   Logs   │ Metrics  │    Traces        │
│ (Events) │ (Counts) │ (Request Flow)   │
├──────────┼──────────┼──────────────────┤
│ zerolog  │ prometheus│ OpenTelemetry   │
│ slog     │ OTel     │                  │
└──────────┴──────────┴──────────────────┘
```

---

## Structured Logging with slog (Go 1.21+)

### Setup

```go
package logger

import (
    "log/slog"
    "os"
)

func Setup(level string, json bool) *slog.Logger {
    var lvl slog.Level
    switch level {
    case "debug": lvl = slog.LevelDebug
    case "warn":  lvl = slog.LevelWarn
    case "error": lvl = slog.LevelError
    default:      lvl = slog.LevelInfo
    }

    opts := &slog.HandlerOptions{
        Level:     lvl,
        AddSource: true,
    }

    var handler slog.Handler
    if json {
        handler = slog.NewJSONHandler(os.Stdout, opts)
    } else {
        handler = slog.NewTextHandler(os.Stdout, opts)
    }

    logger := slog.New(handler)
    slog.SetDefault(logger)
    return logger
}
```

### Context-aware Logging

```go
package logger

import (
    "context"
    "log/slog"
)

type ctxKey string
const loggerKey ctxKey = "logger"

func WithLogger(ctx context.Context, l *slog.Logger) context.Context {
    return context.WithValue(ctx, loggerKey, l)
}

func FromContext(ctx context.Context) *slog.Logger {
    if l, ok := ctx.Value(loggerKey).(*slog.Logger); ok {
        return l
    }
    return slog.Default()
}

// Middleware: enrich logger with request metadata
func LoggerMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        requestID := r.Header.Get("X-Request-ID")
        if requestID == "" {
            requestID = uuid.New().String()
        }

        l := slog.Default().With(
            slog.String("request_id", requestID),
            slog.String("method", r.Method),
            slog.String("path", r.URL.Path),
            slog.String("remote_addr", r.RemoteAddr),
        )

        ctx := WithLogger(r.Context(), l)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

// Usage in use cases
func (uc *CreateUserUseCase) Execute(ctx context.Context, input CreateUserInput) (*Output, error) {
    log := logger.FromContext(ctx)

    log.Info("creating user", slog.String("email", input.Email))

    user, err := uc.userRepo.Create(ctx, input)
    if err != nil {
        log.Error("failed to create user",
            slog.String("email", input.Email),
            slog.String("error", err.Error()),
        )
        return nil, err
    }

    log.Info("user created", slog.String("user_id", user.ID))
    return toOutput(user), nil
}
```

---

## OpenTelemetry Tracing

### Setup

```go
package telemetry

import (
    "context"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "go.opentelemetry.io/otel/sdk/resource"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
)

func InitTracer(ctx context.Context, serviceName, exporterEndpoint string) (func(), error) {
    exporter, err := otlptracegrpc.New(ctx,
        otlptracegrpc.WithEndpoint(exporterEndpoint),
        otlptracegrpc.WithInsecure(),
    )
    if err != nil {
        return nil, fmt.Errorf("create exporter: %w", err)
    }

    res, err := resource.New(ctx,
        resource.WithAttributes(
            semconv.ServiceName(serviceName),
            semconv.ServiceVersion("1.0.0"),
        ),
    )
    if err != nil {
        return nil, fmt.Errorf("create resource: %w", err)
    }

    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter),
        sdktrace.WithResource(res),
        sdktrace.WithSampler(sdktrace.AlwaysSample()),
    )

    otel.SetTracerProvider(tp)

    cleanup := func() {
        _ = tp.Shutdown(context.Background())
    }

    return cleanup, nil
}
```

### Tracing in Use Cases

```go
import "go.opentelemetry.io/otel"

var tracer = otel.Tracer("myapp/application/user")

func (uc *CreateUserUseCase) Execute(ctx context.Context, input CreateUserInput) (*Output, error) {
    ctx, span := tracer.Start(ctx, "CreateUserUseCase.Execute")
    defer span.End()

    span.SetAttributes(
        attribute.String("user.email", input.Email),
    )

    // Downstream calls inherit the trace context via ctx
    user, err := uc.userRepo.Create(ctx, input)
    if err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, err.Error())
        return nil, err
    }

    span.SetAttributes(attribute.String("user.id", user.ID))
    return toOutput(user), nil
}
```

### Tracing in Repository

```go
var tracer = otel.Tracer("myapp/infrastructure/persistence")

func (r *userRepo) Create(ctx context.Context, user *entity.User) error {
    ctx, span := tracer.Start(ctx, "UserRepository.Create")
    defer span.End()

    if err := r.db.WithContext(ctx).Create(toModel(user)).Error; err != nil {
        span.RecordError(err)
        return fmt.Errorf("db create user: %w", err)
    }

    return nil
}
```

---

## Prometheus Metrics

### Setup

```go
package metrics

import (
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promauto"
)

var (
    // Request metrics
    HTTPRequestsTotal = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "http_requests_total",
            Help: "Total number of HTTP requests",
        },
        []string{"method", "path", "status"},
    )

    HTTPRequestDuration = promauto.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "http_request_duration_seconds",
            Help:    "HTTP request duration in seconds",
            Buckets: prometheus.DefBuckets,
        },
        []string{"method", "path"},
    )

    // Business metrics
    UsersCreatedTotal = promauto.NewCounter(
        prometheus.CounterOpts{
            Name: "users_created_total",
            Help: "Total number of users created",
        },
    )

    // Database metrics
    DBQueryDuration = promauto.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "db_query_duration_seconds",
            Help:    "Database query duration",
            Buckets: []float64{.001, .005, .01, .025, .05, .1, .25, .5, 1},
        },
        []string{"operation", "table"},
    )
)
```

### Metrics Middleware

```go
func MetricsMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()

        // Wrap ResponseWriter to capture status code
        ww := &statusWriter{ResponseWriter: w, status: 200}
        next.ServeHTTP(ww, r)

        duration := time.Since(start).Seconds()

        metrics.HTTPRequestsTotal.WithLabelValues(
            r.Method, r.URL.Path, strconv.Itoa(ww.status),
        ).Inc()

        metrics.HTTPRequestDuration.WithLabelValues(
            r.Method, r.URL.Path,
        ).Observe(duration)
    })
}

type statusWriter struct {
    http.ResponseWriter
    status int
}

func (w *statusWriter) WriteHeader(code int) {
    w.status = code
    w.ResponseWriter.WriteHeader(code)
}
```

### Expose Metrics Endpoint

```go
import "github.com/prometheus/client_golang/prometheus/promhttp"

// Add to router
e.GET("/metrics", echo.WrapHandler(promhttp.Handler()))
```

---

## Health Checks

```go
package health

import (
    "context"
    "sync"
    "time"
)

type Checker interface {
    Name() string
    Check(ctx context.Context) error
}

type dbChecker struct {
    db *sql.DB
}

func (c *dbChecker) Name() string { return "database" }
func (c *dbChecker) Check(ctx context.Context) error {
    ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
    defer cancel()
    return c.db.PingContext(ctx)
}

type redisChecker struct {
    client *redis.Client
}

func (c *redisChecker) Name() string { return "redis" }
func (c *redisChecker) Check(ctx context.Context) error {
    return c.client.Ping(ctx).Err()
}

// HealthService runs all checks
type HealthService struct {
    checkers []Checker
}

func NewHealthService(checkers ...Checker) *HealthService {
    return &HealthService{checkers: checkers}
}

type CheckResult struct {
    Name    string `json:"name"`
    Status  string `json:"status"`
    Error   string `json:"error,omitempty"`
    Latency string `json:"latency"`
}

func (s *HealthService) Check(ctx context.Context) ([]CheckResult, bool) {
    results := make([]CheckResult, len(s.checkers))
    allHealthy := true
    var wg sync.WaitGroup

    for i, checker := range s.checkers {
        wg.Add(1)
        go func(i int, c Checker) {
            defer wg.Done()
            start := time.Now()
            err := c.Check(ctx)
            latency := time.Since(start)

            result := CheckResult{
                Name:    c.Name(),
                Status:  "healthy",
                Latency: latency.String(),
            }
            if err != nil {
                result.Status = "unhealthy"
                result.Error = err.Error()
                allHealthy = false
            }
            results[i] = result
        }(i, checker)
    }

    wg.Wait()
    return results, allHealthy
}
```

---

## Profiling with pprof

```go
import _ "net/http/pprof"

// In development — add pprof endpoints
func setupDebugRoutes(e *echo.Echo) {
    debug := e.Group("/debug")
    debug.GET("/pprof/*", echo.WrapHandler(http.DefaultServeMux))
}

// Access:
// /debug/pprof/              — index
// /debug/pprof/goroutine     — goroutine stacks
// /debug/pprof/heap          — heap profile
// /debug/pprof/profile       — CPU profile (30s)
// /debug/pprof/trace         — execution trace
```

### Benchmarks

```go
func BenchmarkCreateUser(b *testing.B) {
    repo := setupTestRepo()
    uc := user.NewCreateUserUseCase(repo)

    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        _, _ = uc.Execute(context.Background(), user.CreateUserInput{
            Email: fmt.Sprintf("user%d@example.com", i),
            Name:  "Test User",
        })
    }
}

// Run: go test -bench=BenchmarkCreateUser -benchmem ./...
```

---

## Observability Checklist

- [ ] Structured logging with request_id correlation
- [ ] Log level configurable via environment
- [ ] HTTP request/response metrics (duration, status, method)
- [ ] Business metrics (users created, orders placed)
- [ ] Database query duration metrics
- [ ] Distributed tracing across service boundaries
- [ ] Health check endpoint (/health for liveness)
- [ ] Readiness endpoint (/ready for dependency checks)
- [ ] pprof endpoints in development
- [ ] Error rate alerting
- [ ] Graceful degradation logging
