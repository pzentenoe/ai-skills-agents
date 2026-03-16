# Go Best Practices & Configuration

## Configuration Management

### Environment Variables Pattern

```go
package config

import (
    "fmt"
    "os"
    "strconv"
    "strings"
)

// Config holds all configuration — adapt to your project's config library
type Config struct {
    // Server
    ServerPort  int
    ServerHost  string
    Environment string

    // Database
    DBHost     string
    DBPort     int
    DBUser     string
    DBPassword string
    DBName     string
    DBSSLMode  string

    // JWT
    JWTSecret     string
    JWTExpiration int

    // Logging
    LogLevel string
    LogJSON  bool
}

// LoadConfig loads configuration from environment
// Adapt to your project: godotenv+env, viper, envconfig, etc.
func LoadConfig() (*Config, error) {
    cfg := &Config{
        ServerPort:  getEnvInt("SERVER_PORT", 8080),
        ServerHost:  getEnv("SERVER_HOST", "0.0.0.0"),
        Environment: getEnv("ENVIRONMENT", "development"),
        DBHost:      getEnvRequired("DB_HOST"),
        DBPort:      getEnvInt("DB_PORT", 5432),
        DBUser:      getEnvRequired("DB_USER"),
        DBPassword:  getEnvRequired("DB_PASSWORD"),
        DBName:      getEnvRequired("DB_NAME"),
        DBSSLMode:   getEnv("DB_SSLMODE", "disable"),
        JWTSecret:   getEnvRequired("JWT_SECRET"),
        JWTExpiration: getEnvInt("JWT_EXPIRATION", 3600),
        LogLevel:    getEnv("LOG_LEVEL", "info"),
        LogJSON:     getEnvBool("LOG_JSON", false),
    }

    return cfg, cfg.Validate()
}

func (c *Config) Validate() error {
    if c.ServerPort < 1 || c.ServerPort > 65535 {
        return fmt.Errorf("invalid server port: %d", c.ServerPort)
    }
    return nil
}

func (c *Config) IsDevelopment() bool { return c.Environment == "development" }
func (c *Config) IsProduction() bool  { return c.Environment == "production" }

func (c *Config) DatabaseDSN() string {
    return fmt.Sprintf(
        "host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
        c.DBHost, c.DBPort, c.DBUser, c.DBPassword, c.DBName, c.DBSSLMode,
    )
}

// Helper functions
func getEnv(key, fallback string) string {
    if v := os.Getenv(key); v != "" { return v }
    return fallback
}

func getEnvRequired(key string) string {
    v := os.Getenv(key)
    if v == "" { panic("required env var missing: " + key) }
    return v
}

func getEnvInt(key string, fallback int) int {
    v := os.Getenv(key)
    if v == "" { return fallback }
    n, err := strconv.Atoi(v)
    if err != nil { return fallback }
    return n
}

func getEnvBool(key string, fallback bool) bool {
    v := os.Getenv(key)
    if v == "" { return fallback }
    b, err := strconv.ParseBool(v)
    if err != nil { return fallback }
    return b
}
```

---

## Error Handling Patterns

### Domain Errors

```go
package domain

import "errors"

// Sentinel errors — use errors.Is() to check
var (
    ErrNotFound      = errors.New("not found")
    ErrAlreadyExists = errors.New("already exists")
    ErrInvalidInput  = errors.New("invalid input")
    ErrUnauthorized  = errors.New("unauthorized")
    ErrForbidden     = errors.New("forbidden")
)

// Custom error types — use errors.As() to check
type ValidationError struct {
    Field   string
    Message string
}

func (e *ValidationError) Error() string {
    return "validation: " + e.Field + ": " + e.Message
}

type BusinessError struct {
    Code    string
    Message string
}

func (e *BusinessError) Error() string {
    return "[" + e.Code + "] " + e.Message
}
```

### Error Wrapping by Layer

```go
// Infrastructure: wrap with technical context
func (r *repo) GetByID(ctx context.Context, id string) (*entity.User, error) {
    var model UserModel
    if err := r.db.WithContext(ctx).First(&model, "id = ?", id).Error; err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return nil, fmt.Errorf("user %s: %w", id, domain.ErrNotFound)
        }
        return nil, fmt.Errorf("db query user %s: %w", id, err)
    }
    return toDomain(&model), nil
}

// Application: wrap with business context
func (uc *GetUserUseCase) Execute(ctx context.Context, id string) (*Output, error) {
    user, err := uc.userRepo.GetByID(ctx, id)
    if err != nil {
        return nil, fmt.Errorf("get user %s: %w", id, err)
    }
    return toOutput(user), nil
}

// Interface: convert to transport response
func (h *Handler) GetUser(c echo.Context) error {
    output, err := h.getUserUC.Execute(c.Request().Context(), id)
    if err != nil {
        if errors.Is(err, domain.ErrNotFound) {
            return c.JSON(http.StatusNotFound, ErrorResponse{Error: "user not found"})
        }
        var valErr *domain.ValidationError
        if errors.As(err, &valErr) {
            return c.JSON(http.StatusBadRequest, ErrorResponse{Error: valErr.Error()})
        }
        return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "internal error"})
    }
    return c.JSON(http.StatusOK, output)
}
```

---

## Structured Logging

### Logger Setup (zerolog example)

```go
package logger

import (
    "os"
    "github.com/rs/zerolog"
    "github.com/rs/zerolog/log"
)

func Setup(level string, json bool) {
    logLevel, err := zerolog.ParseLevel(level)
    if err != nil { logLevel = zerolog.InfoLevel }
    zerolog.SetGlobalLevel(logLevel)

    if !json {
        log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr})
    }
    log.Logger = log.With().Caller().Logger()
}
```

### Context-aware Logging

```go
type ctxKey string
const loggerKey ctxKey = "logger"

func WithLogger(ctx context.Context, l *zerolog.Logger) context.Context {
    return context.WithValue(ctx, loggerKey, l)
}

func FromContext(ctx context.Context) *zerolog.Logger {
    if l, ok := ctx.Value(loggerKey).(*zerolog.Logger); ok { return l }
    return &log.Logger
}
```

---

## Interface Design Principles

### Small, Focused Interfaces (ISP)

```go
// GOOD: small, focused
type UserFinder interface {
    GetByID(ctx context.Context, id string) (*entity.User, error)
}

type UserCreator interface {
    Create(ctx context.Context, user *entity.User) error
}

// Use cases depend on what they need
type GetUserUseCase struct {
    finder UserFinder
}

type CreateUserUseCase struct {
    creator UserCreator
    finder  UserFinder
}

// BAD: monolithic interface
type UserRepository interface {
    Create(ctx context.Context, user *entity.User) error
    GetByID(ctx context.Context, id string) (*entity.User, error)
    GetByEmail(ctx context.Context, email string) (*entity.User, error)
    Update(ctx context.Context, user *entity.User) error
    Delete(ctx context.Context, id string) error
    List(ctx context.Context, limit, offset int) ([]*entity.User, error)
}
```

### Accept Interfaces, Return Structs

```go
// GOOD
func ProcessUser(finder UserFinder) (*entity.User, error) { ... }

// BAD
func GetUserRepository() UserRepository { return &userRepo{} }
```

---

## Dependency Injection

### Constructor Injection (preferred)

```go
type CreateUserUseCase struct {
    userRepo    repository.UserRepository
    emailSender services.EmailSender
}

func NewCreateUserUseCase(
    userRepo repository.UserRepository,
    emailSender services.EmailSender,
) *CreateUserUseCase {
    return &CreateUserUseCase{
        userRepo:    userRepo,
        emailSender: emailSender,
    }
}

// BAD: global dependencies
var globalRepo repository.UserRepository
type CreateUserUseCase struct{}
func (uc *CreateUserUseCase) Execute() { globalRepo.Create(...) }
```

---

## Package Organization

### Naming

```go
// GOOD: short, lowercase, singular
package user
package order
package persistence

// BAD: plural, camelCase, underscores
package users
package orderService
package user_repository
```

### Dependency Flow

```
domain/       (no dependencies)
  ↑
application/  (depends on domain)
  ↑
infrastructure/ (depends on domain)
  ↑
interface/    (depends on application)
```

---

## Performance Tips

```go
// Pre-allocate slices with known capacity
users := make([]*User, 0, 100)

// Use sync.Pool for temporary objects
var bufPool = sync.Pool{
    New: func() any { return new(bytes.Buffer) },
}
buf := bufPool.Get().(*bytes.Buffer)
defer func() { buf.Reset(); bufPool.Put(buf) }()

// Use buffered channels
ch := make(chan int, 100) // Not: make(chan int)

// Close channels when done producing
func produce() <-chan int {
    ch := make(chan int)
    go func() { defer close(ch); for i := 0; i < 10; i++ { ch <- i } }()
    return ch
}

// Use context for cancellation in goroutines
go func() {
    for {
        select {
        case <-ctx.Done(): return
        default: /* work */
        }
    }
}()
```

---

## Testing Best Practices

### Table-driven Tests

```go
func TestValidateEmail(t *testing.T) {
    tests := []struct {
        name    string
        email   string
        wantErr bool
    }{
        {"valid", "test@example.com", false},
        {"invalid", "invalid", true},
        {"empty", "", true},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            err := validateEmail(tt.email)
            if tt.wantErr {
                assert.Error(t, err)
            } else {
                assert.NoError(t, err)
            }
        })
    }
}
```

### Mock Pattern

```go
type mockUserRepo struct{ mock.Mock }

func (m *mockUserRepo) Create(ctx context.Context, u *entity.User) error {
    return m.Called(ctx, u).Error(0)
}

func TestCreateUser(t *testing.T) {
    repo := new(mockUserRepo)
    uc := user.NewCreateUserUseCase(repo)

    repo.On("GetByEmail", mock.Anything, "test@example.com").Return(nil, domain.ErrNotFound)
    repo.On("Create", mock.Anything, mock.AnythingOfType("*entity.User")).Return(nil)

    output, err := uc.Execute(context.Background(), user.CreateUserInput{
        Email: "test@example.com",
        Name:  "Test",
    })

    assert.NoError(t, err)
    assert.NotNil(t, output)
    repo.AssertExpectations(t)
}
```

---

## Go Proverbs

- Don't communicate by sharing memory, share memory by communicating
- The bigger the interface, the weaker the abstraction
- Make the zero value useful
- Errors are values — handle them gracefully
- A little copying is better than a little dependency
- Clear is better than clever
- Design the architecture, name the components, document the details
