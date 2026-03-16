---
name: golang-expert
description: >
  Expert Go backend development with Clean Architecture, SOLID principles, and idiomatic Go patterns.
  Framework-agnostic: adapts to any HTTP framework (Echo, Gin, Chi, Fiber), ORM (GORM, sqlx, sqlc, Ent),
  messaging (Kafka, RabbitMQ, NATS), and HTTP client. Enforces code review before code generation,
  Clean Code (DRY, KISS, YAGNI), concurrency patterns, and proper error handling.
  Trigger: When working on Go backend development, microservices, REST/gRPC APIs, Clean Architecture,
  code review, refactoring, or architecture design in Go projects.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "2.0"
---

# Golang Expert

Expert guidance for building production-grade Go backend applications. Framework-agnostic, principle-driven, and focused on maintainability, testability, and idiomatic Go.

## When to Use

This skill should be used when:
- Building or extending Go backend applications (REST APIs, gRPC, microservices, CLI)
- Implementing or reviewing Clean Architecture in Go projects
- Reviewing Go code for quality, SOLID compliance, and best practices
- Refactoring Go code to improve architecture and maintainability
- Designing concurrency patterns (goroutines, channels, worker pools, errgroup)
- Setting up dependency injection, error handling, or configuration management
- Working with any Go framework or library stack

---

## Mandatory Workflow: Review Before Generate

**CRITICAL**: Before writing or generating any Go code, ALWAYS follow this sequence:

```
1. REVIEW existing codebase
   ├── Detect project structure (cmd/, domain/, application/, infrastructure/, interface/)
   ├── Identify frameworks and libraries in go.mod
   ├── Understand naming conventions and patterns already in use
   └── Check for existing interfaces, types, and error patterns

2. ASK if unclear
   ├── "This project uses Echo + GORM. Should I follow the same stack?"
   ├── "I see you use repository pattern with interface segregation. Should I continue this?"
   └── "The project doesn't have a clear architecture. Want me to propose one?"

3. GENERATE code that matches existing patterns
   ├── Follow the same naming conventions
   ├── Use the same error handling strategy
   ├── Match the same project structure
   └── Reuse existing interfaces and types
```

**Never generate code in isolation. Always contextualize within the existing codebase.**

---

## Core Principles

### Clean Architecture Layers

```
┌─────────────────────────────────────────┐
│         Interface/Delivery Layer        │  ← HTTP/gRPC Handlers, CLI, Consumers
├─────────────────────────────────────────┤
│        Infrastructure Layer             │  ← DB, External APIs, Message Brokers
├─────────────────────────────────────────┤
│         Application Layer               │  ← Use Cases / Interactors
├─────────────────────────────────────────┤
│           Domain Layer                  │  ← Entities, Value Objects, Interfaces
└─────────────────────────────────────────┘

Dependency Rule: Dependencies ALWAYS point inward.
Interface → Infrastructure → Application → Domain
Domain has ZERO external dependencies.
```

**Domain Layer** contains:
- Entities with business logic and validation
- Value Objects (immutable, identified by attributes)
- Repository interfaces (`domain/repository/`)
- Service interfaces (`domain/services/`)
- Domain errors (sentinel errors and custom error types)

**Application Layer** contains:
- Use cases with Input/Output structs
- Business workflow orchestration
- Transaction coordination
- No direct dependency on infrastructure details

**Infrastructure Layer** contains:
- Repository implementations (whichever ORM/driver the project uses)
- External API clients
- Message broker producers/consumers
- Cache implementations

**Interface/Delivery Layer** contains:
- HTTP handlers (whichever framework the project uses)
- gRPC server implementations
- CLI commands
- Middleware (auth, logging, rate limiting)
- Request/Response mapping

### SOLID Principles in Go

| Principle | Go Application |
|-----------|---------------|
| **SRP** | Each package/struct has one reason to change |
| **OCP** | Extend behavior via interfaces, not modification |
| **LSP** | Interface implementations are substitutable |
| **ISP** | Small, focused interfaces (`UserFinder` over monolithic `UserRepository`) |
| **DIP** | Depend on interfaces (defined in domain), not concretions |

### Clean Code Principles

| Principle | Application |
|-----------|-------------|
| **DRY** | Extract shared logic into domain services or pkg utilities |
| **KISS** | Prefer obvious solutions; avoid clever abstractions |
| **YAGNI** | Implement only what's needed now; no speculative generalization |

### Go Idioms

- **Accept interfaces, return structs**: Functions take interfaces as parameters, return concrete types
- **Make the zero value useful**: Design types so zero value is valid
- **Errors are values**: Handle explicitly, wrap with context using `fmt.Errorf("context: %w", err)`
- **Small interfaces**: Prefer 1-3 method interfaces
- **Concurrency via channels**: "Don't communicate by sharing memory, share memory by communicating"
- **Context propagation**: Always pass `context.Context` as first parameter through all layers

---

## Framework-Agnostic Decision Tree

```
Starting a new feature?
│
├── 1. Check go.mod for existing dependencies
│   ├── HTTP: Echo? Gin? Chi? Fiber? net/http?
│   ├── DB: GORM? sqlx? sqlc? Ent? pgx?
│   ├── Messaging: kafka-go? confluent-kafka? amqp? nats?
│   └── HTTP Client: resty? net/http? req?
│
├── 2. Follow detected stack — do NOT introduce new frameworks
│
├── 3. If greenfield project → ASK user which stack to use
│
└── 4. Apply Clean Architecture regardless of stack
```

---

## Project Structure

Standard layout for Clean Architecture in Go:

```
myapp/
├── cmd/
│   └── api/
│       └── main.go                    # Entry point, dependency wiring
├── domain/                            # Domain Layer (ZERO external deps)
│   ├── entity/
│   │   ├── user.go                    # Entities with business logic
│   │   └── order.go
│   ├── valueobject/
│   │   └── email.go                   # Immutable value objects
│   ├── repository/
│   │   └── user_repository.go         # Repository interfaces
│   ├── services/
│   │   └── notification_service.go    # External service interfaces
│   └── errors.go                      # Domain sentinel errors
├── application/                       # Application Layer (use cases)
│   ├── user/
│   │   ├── create_user.go
│   │   └── get_user.go
│   └── order/
│       └── create_order.go
├── infrastructure/                    # Infrastructure Layer
│   ├── persistence/
│   │   ├── user_repository.go         # Repository implementation
│   │   └── transaction.go
│   └── external/
│       ├── payment_service.go
│       └── notification_service.go
├── interface/                         # Interface/Delivery Layer
│   ├── http/
│   │   ├── handler/
│   │   │   └── user_handler.go
│   │   ├── middleware/
│   │   │   ├── auth.go
│   │   │   └── logger.go
│   │   └── router.go
│   └── grpc/                          # Or kafka/, cli/, etc.
│       └── user_server.go
├── pkg/                               # Shared utilities
│   ├── config/
│   │   └── config.go
│   └── logger/
│       └── logger.go
├── go.mod
└── go.sum
```

---

## Implementation Workflow

When implementing a new feature, follow this exact order:

### Step 1: Domain Layer

Define entities, value objects, and interfaces. No external imports.

```go
// domain/entity/user.go
package entity

type User struct {
    ID        string
    Email     string
    Name      string
    CreatedAt time.Time
}

func (u *User) Validate() error {
    if u.Email == "" {
        return errors.New("email is required")
    }
    return nil
}

// domain/repository/user_repository.go
package repository

type UserRepository interface {
    Create(ctx context.Context, user *entity.User) error
    GetByID(ctx context.Context, id string) (*entity.User, error)
}
```

### Step 2: Application Layer (Use Cases)

Orchestrate domain logic. Input/Output structs. No framework imports.

```go
// application/user/create_user.go
package user

type CreateUserInput struct {
    Email string
    Name  string
}

type CreateUserOutput struct {
    ID    string
    Email string
}

type CreateUserUseCase struct {
    userRepo repository.UserRepository
}

func NewCreateUserUseCase(userRepo repository.UserRepository) *CreateUserUseCase {
    return &CreateUserUseCase{userRepo: userRepo}
}

func (uc *CreateUserUseCase) Execute(ctx context.Context, input CreateUserInput) (*CreateUserOutput, error) {
    user := &entity.User{Email: input.Email, Name: input.Name}
    if err := user.Validate(); err != nil {
        return nil, fmt.Errorf("validation failed: %w", err)
    }
    if err := uc.userRepo.Create(ctx, user); err != nil {
        return nil, fmt.Errorf("failed to create user: %w", err)
    }
    return &CreateUserOutput{ID: user.ID, Email: user.Email}, nil
}
```

### Step 3: Infrastructure Layer

Implement domain interfaces using actual frameworks/libraries.

```go
// infrastructure/persistence/user_repository.go
// Implementation depends on the ORM the project uses (GORM, sqlx, etc.)
```

### Step 4: Interface/Delivery Layer

HTTP handlers, gRPC servers, etc. Only calls use cases.

```go
// interface/http/handler/user_handler.go
// Implementation depends on the HTTP framework (Echo, Gin, Chi, etc.)
```

### Step 5: Wire Dependencies (main.go)

Connect all layers via constructor injection.

---

## Error Handling Strategy

Layer-specific error handling:

```go
// Domain: sentinel errors
var (
    ErrNotFound      = errors.New("not found")
    ErrAlreadyExists = errors.New("already exists")
    ErrInvalidInput  = errors.New("invalid input")
)

// Application: wrap with business context
return nil, fmt.Errorf("user with email %s: %w", email, ErrAlreadyExists)

// Infrastructure: wrap with technical context
return nil, fmt.Errorf("db query for user %s: %w", id, err)

// Interface: convert to transport response (HTTP status, gRPC code)
if errors.Is(err, domain.ErrNotFound) {
    return c.JSON(http.StatusNotFound, ...)
}
```

---

## Code Review Checklist

Before generating or approving any Go code, verify:

- [ ] Domain entities have **zero** external dependencies
- [ ] Repository/service interfaces defined in `domain/` layer
- [ ] Use cases in `application/` orchestrate domain logic only
- [ ] Infrastructure implements domain interfaces
- [ ] Handlers only call use cases (no direct repo access)
- [ ] `context.Context` propagated through all layers as first parameter
- [ ] Errors wrapped with context at each layer boundary
- [ ] Dependencies injected via constructors (no globals)
- [ ] Small, focused interfaces (ISP)
- [ ] No circular dependencies between packages
- [ ] Goroutines have cancellation via context
- [ ] Channels closed by producer
- [ ] No premature abstractions (YAGNI)
- [ ] No code duplication (DRY) — but a little copying is better than a little dependency

---

## Pre-Generation Questions

Before generating code for a Go project, ALWAYS ask/determine these:

```
Project Context:
├── Is this a new project or existing?
│   ├── New → Ask: "Monolith or microservice? REST or gRPC? Which DB?"
│   └── Existing → Read go.mod and project structure first
│
├── Architecture:
│   ├── Does the project already follow Clean Architecture?
│   ├── What naming conventions are used? (entity vs model, handler vs controller)
│   └── How are errors handled? (sentinel, custom types, both?)
│
├── Stack Detection (from go.mod):
│   ├── HTTP: echo? gin? chi? fiber? net/http?
│   ├── DB: gorm? sqlx? sqlc? ent? pgx?
│   ├── Messaging: kafka-go? confluent? amqp? nats?
│   ├── Logging: zerolog? slog? zap? logrus?
│   └── Testing: testify? ginkgo? standard?
│
└── Scope:
    ├── Is this a new feature, bug fix, or refactor?
    ├── How many layers are affected?
    └── Are there existing tests to maintain?
```

---

## Detailed References

For in-depth patterns and examples, refer to these guides:

### references/clean_architecture.md
Complete layer breakdown, repository pattern, use case implementation, dependency injection, transactions, and testing strategies per layer.
**Load when**: Designing architecture, implementing repositories, setting up project structure.

### references/concurrency_patterns.md
Context usage, goroutines, channels, worker pools, errgroup, fan-out/fan-in, sync primitives, graceful shutdown, and anti-patterns.
**Load when**: Implementing concurrent operations, background workers, parallel processing.

### references/best_practices.md
Configuration management, error handling patterns, structured logging, interface design, dependency injection, package organization, performance tips, and testing patterns.
**Load when**: Setting up configuration, error handling, logging, or improving code quality.

### references/generics_patterns.md
Generic repository pattern, Result type, functional options pattern, type-safe collections (Filter, Map, Reduce, GroupBy), generic use case interface, type constraints, Set implementation.
**Load when**: Using Go 1.18+ generics, creating reusable data structures, implementing base repositories, or applying functional patterns.

### references/api_design.md
RESTful conventions, response envelopes, pagination (offset & cursor), filtering/sorting, error codes, API versioning, request validation, health checks, idempotency.
**Load when**: Designing REST APIs, implementing pagination, defining error responses, or setting up API versioning.

### references/observability.md
Structured logging (slog/zerolog), OpenTelemetry tracing, Prometheus metrics, health checks, pprof profiling, benchmarks, context-aware logging.
**Load when**: Setting up logging, tracing, metrics, health checks, or performance profiling.

### references/security_patterns.md
Input validation, SQL injection prevention, JWT authentication, RBAC authorization, password hashing (bcrypt), rate limiting, CORS, secrets management, secure HTTP headers.
**Load when**: Implementing authentication, authorization, input validation, rate limiting, or securing APIs.

### references/docker_deployment.md
Multi-stage Docker builds (scratch/distroless/alpine), docker-compose for dev, graceful shutdown, Kubernetes manifests, Makefile, GitHub Actions CI/CD.
**Load when**: Containerizing Go apps, setting up CI/CD, deploying to Kubernetes, or creating Makefiles.

---

## Quick Pattern Lookup

| Need to... | Pattern | Reference |
|-----------|---------|-----------|
| Read from database | Repository with `GetByID(ctx, id)` | `clean_architecture.md` |
| Generic CRUD | Base repository with generics | `generics_patterns.md` |
| Call external API | Client in infrastructure layer | `best_practices.md` |
| Run concurrent tasks | `errgroup` or worker pool | `concurrency_patterns.md` |
| Handle cancellation | `context.WithTimeout/WithCancel` | `concurrency_patterns.md` |
| Design REST API | RESTful conventions + envelope | `api_design.md` |
| Paginate results | Offset or cursor pagination | `api_design.md` |
| Validate request | Struct tags at handler level | `security_patterns.md` |
| Handle errors | Wrap with `fmt.Errorf("ctx: %w", err)` | `best_practices.md` |
| Authenticate users | JWT + middleware | `security_patterns.md` |
| Rate limit API | Per-IP rate limiter | `security_patterns.md` |
| Add tracing | OpenTelemetry spans | `observability.md` |
| Add metrics | Prometheus counters/histograms | `observability.md` |
| Containerize app | Multi-stage Dockerfile | `docker_deployment.md` |
| Setup CI/CD | GitHub Actions pipeline | `docker_deployment.md` |
| Functional options | `WithX()` option pattern | `generics_patterns.md` |
| Type-safe collections | Filter/Map/Reduce generics | `generics_patterns.md` |
| Manage configuration | Environment-based config struct | `best_practices.md` |

---

**Remember**: Review first, ask if unclear, then generate. Start simple, refactor when complexity demands it. Trust Go's simplicity — the obvious solution is usually the right one.
