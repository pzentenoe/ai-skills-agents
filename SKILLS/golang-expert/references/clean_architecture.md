# Clean Architecture in Go

## Architecture Layers

```
┌─────────────────────────────────────────┐
│         Interface/Delivery Layer        │  ← HTTP/gRPC Handlers, CLI, Message Consumers
├─────────────────────────────────────────┤
│        Infrastructure Layer             │  ← DB, External APIs, Message Brokers, Cache
├─────────────────────────────────────────┤
│         Application Layer               │  ← Use Cases, Business Workflows, Interactors
├─────────────────────────────────────────┤
│           Domain Layer                  │  ← Entities, Value Objects, Domain Logic
└─────────────────────────────────────────┘
```

**Dependency Rule**: Source code dependencies point inward. Inner layers know nothing about outer layers.

---

## Domain Layer

The innermost layer. **Zero external dependencies**. Contains core business rules.

### Entities

```go
// domain/entity/user.go
package entity

import (
    "errors"
    "time"
)

type User struct {
    ID        string
    Email     string
    Name      string
    CreatedAt time.Time
    UpdatedAt time.Time
}

func NewUser(email, name string) (*User, error) {
    u := &User{
        Email:     email,
        Name:      name,
        CreatedAt: time.Now(),
        UpdatedAt: time.Now(),
    }
    if err := u.Validate(); err != nil {
        return nil, err
    }
    return u, nil
}

func (u *User) Validate() error {
    if u.Email == "" {
        return errors.New("email is required")
    }
    if u.Name == "" {
        return errors.New("name is required")
    }
    return nil
}
```

### Value Objects

Immutable objects identified by attributes, not identity.

```go
// domain/valueobject/email.go
package valueobject

import (
    "errors"
    "regexp"
)

var emailRegex = regexp.MustCompile(`^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$`)

type Email struct {
    value string
}

func NewEmail(email string) (Email, error) {
    if !emailRegex.MatchString(email) {
        return Email{}, errors.New("invalid email format")
    }
    return Email{value: email}, nil
}

func (e Email) String() string {
    return e.value
}
```

### Repository Interfaces (domain/repository/)

Repository interfaces live in domain. Implementations live in infrastructure.

```go
// domain/repository/user_repository.go
package repository

import (
    "context"
    "myapp/domain/entity"
)

type UserRepository interface {
    Create(ctx context.Context, user *entity.User) error
    GetByID(ctx context.Context, id string) (*entity.User, error)
    GetByEmail(ctx context.Context, email string) (*entity.User, error)
    Update(ctx context.Context, user *entity.User) error
    Delete(ctx context.Context, id string) error
    List(ctx context.Context, limit, offset int) ([]*entity.User, error)
}
```

### Service Interfaces (domain/services/)

Interfaces for external capabilities the domain needs.

```go
// domain/services/notification_service.go
package services

import "context"

type NotificationService interface {
    SendEmail(ctx context.Context, to, subject, body string) error
}
```

### Domain Errors

```go
// domain/errors.go
package domain

import "errors"

var (
    ErrNotFound      = errors.New("not found")
    ErrAlreadyExists = errors.New("already exists")
    ErrInvalidInput  = errors.New("invalid input")
    ErrUnauthorized  = errors.New("unauthorized")
    ErrForbidden     = errors.New("forbidden")
)

type ValidationError struct {
    Field   string
    Message string
}

func (e *ValidationError) Error() string {
    return "validation error on field " + e.Field + ": " + e.Message
}

type BusinessError struct {
    Code    string
    Message string
}

func (e *BusinessError) Error() string {
    return "[" + e.Code + "] " + e.Message
}
```

---

## Application Layer

Use cases that orchestrate domain entities and repository operations.

### Use Case Pattern

```go
// application/user/create_user.go
package user

import (
    "context"
    "fmt"
    "myapp/domain"
    "myapp/domain/entity"
    "myapp/domain/repository"
)

type CreateUserInput struct {
    Email string
    Name  string
}

type CreateUserOutput struct {
    ID    string
    Email string
    Name  string
}

type CreateUserUseCase struct {
    userRepo repository.UserRepository
}

func NewCreateUserUseCase(userRepo repository.UserRepository) *CreateUserUseCase {
    return &CreateUserUseCase{userRepo: userRepo}
}

func (uc *CreateUserUseCase) Execute(ctx context.Context, input CreateUserInput) (*CreateUserOutput, error) {
    // Check if user exists
    existing, err := uc.userRepo.GetByEmail(ctx, input.Email)
    if err == nil && existing != nil {
        return nil, fmt.Errorf("user with email %s: %w", input.Email, domain.ErrAlreadyExists)
    }

    // Create domain entity
    user, err := entity.NewUser(input.Email, input.Name)
    if err != nil {
        return nil, fmt.Errorf("invalid user data: %w", err)
    }

    // Persist
    if err := uc.userRepo.Create(ctx, user); err != nil {
        return nil, fmt.Errorf("failed to create user: %w", err)
    }

    return &CreateUserOutput{
        ID:    user.ID,
        Email: user.Email,
        Name:  user.Name,
    }, nil
}
```

### Use Case with Transaction

```go
// domain/repository/transaction.go
package repository

import "context"

type TransactionManager interface {
    WithTransaction(ctx context.Context, fn func(ctx context.Context) error) error
}

// application/order/create_order.go
type CreateOrderUseCase struct {
    orderRepo   repository.OrderRepository
    productRepo repository.ProductRepository
    txManager   repository.TransactionManager
}

func (uc *CreateOrderUseCase) Execute(ctx context.Context, input CreateOrderInput) error {
    return uc.txManager.WithTransaction(ctx, func(txCtx context.Context) error {
        product, err := uc.productRepo.GetByID(txCtx, input.ProductID)
        if err != nil {
            return fmt.Errorf("product not found: %w", err)
        }

        if product.Stock < input.Quantity {
            return fmt.Errorf("insufficient stock")
        }

        order := entity.NewOrder(input.UserID, input.ProductID, input.Quantity)
        if err := uc.orderRepo.Create(txCtx, order); err != nil {
            return fmt.Errorf("failed to create order: %w", err)
        }

        product.ReduceStock(input.Quantity)
        return uc.productRepo.Update(txCtx, product)
    })
}
```

---

## Infrastructure Layer

Implements interfaces defined in domain. Framework-specific code lives here.

### Repository Implementation (Generic Pattern)

This pattern applies regardless of ORM. The model struct is an infrastructure concern.

```go
// infrastructure/persistence/user_repository.go
package persistence

import (
    "context"
    "fmt"
    "myapp/domain/entity"
    "myapp/domain/repository"
)

// UserModel is the persistence model (infrastructure concern)
// Map to/from domain entity via toModel/toDomain methods
type UserModel struct {
    ID        string `gorm:"primaryKey"` // Or db tag for sqlx, etc.
    Email     string `gorm:"uniqueIndex;not null"`
    Name      string `gorm:"not null"`
    CreatedAt int64  `gorm:"autoCreateTime"`
    UpdatedAt int64  `gorm:"autoUpdateTime"`
}

func (UserModel) TableName() string { return "users" }

// Mapper methods — keep domain and persistence models separate
func toModel(user *entity.User) *UserModel {
    return &UserModel{
        ID:    user.ID,
        Email: user.Email,
        Name:  user.Name,
    }
}

func toDomain(model *UserModel) *entity.User {
    return &entity.User{
        ID:    model.ID,
        Email: model.Email,
        Name:  model.Name,
    }
}
```

### External API Client

```go
// infrastructure/external/notification_service.go
package external

import (
    "context"
    "fmt"
    "myapp/domain/services"
)

// notificationService implements services.NotificationService
type notificationService struct {
    // HTTP client (resty, net/http, etc.) — whatever the project uses
    baseURL string
    apiKey  string
}

func NewNotificationService(baseURL, apiKey string) services.NotificationService {
    return &notificationService{baseURL: baseURL, apiKey: apiKey}
}

func (s *notificationService) SendEmail(ctx context.Context, to, subject, body string) error {
    // Implementation using the project's HTTP client
    return nil
}
```

---

## Interface/Delivery Layer

Transport protocol layer. Converts external data formats to application inputs.

### Handler Pattern (Framework-Agnostic Concept)

```go
// interface/http/handler/user_handler.go
// The handler struct depends on use cases, not repositories
type UserHandler struct {
    createUserUC *user.CreateUserUseCase
    getUserUC    *user.GetUserUseCase
}

func NewUserHandler(
    createUserUC *user.CreateUserUseCase,
    getUserUC *user.GetUserUseCase,
) *UserHandler {
    return &UserHandler{
        createUserUC: createUserUC,
        getUserUC:    getUserUC,
    }
}

// Handler method pattern:
// 1. Bind request
// 2. Validate request
// 3. Map to use case input
// 4. Execute use case
// 5. Map output to response
// 6. Handle errors with appropriate HTTP status
```

---

## Dependency Injection (main.go)

Wire all layers via constructor injection. No DI frameworks needed.

```go
// cmd/api/main.go
func main() {
    cfg := loadConfig()
    db := initDB(cfg)

    // Infrastructure
    userRepo := persistence.NewUserRepository(db)
    notifSvc := external.NewNotificationService(cfg.NotifURL, cfg.NotifKey)

    // Application (use cases)
    createUserUC := user.NewCreateUserUseCase(userRepo)
    getUserUC := user.NewGetUserUseCase(userRepo)

    // Interface (handlers)
    userHandler := handler.NewUserHandler(createUserUC, getUserUC)

    // Setup router and start server
    // (framework-specific: Echo, Gin, Chi, etc.)
}
```

---

## Interface Segregation in Practice

```go
// Small, focused interfaces in domain
type UserFinder interface {
    GetByID(ctx context.Context, id string) (*entity.User, error)
}

type UserCreator interface {
    Create(ctx context.Context, user *entity.User) error
}

// Use cases depend only on what they need
type GetUserUseCase struct {
    finder UserFinder // Not the full UserRepository
}

type CreateUserUseCase struct {
    creator UserCreator
    finder  UserFinder
}

// Infrastructure implements all small interfaces
type userRepository struct { db *gorm.DB }
func (r *userRepository) GetByID(...) { ... }
func (r *userRepository) Create(...) { ... }
```

---

## Testing Strategy by Layer

| Layer | Test Type | Dependencies |
|-------|----------|--------------|
| Domain | Pure unit tests | None — no mocks needed |
| Application | Unit tests with mocked interfaces | Mock repositories/services |
| Infrastructure | Integration tests | Real database/APIs (testcontainers) |
| Interface | Unit tests with mocked use cases | Mock use cases |

```go
// Testing a use case with mocked repository
type mockUserRepo struct{ mock.Mock }

func (m *mockUserRepo) Create(ctx context.Context, user *entity.User) error {
    return m.Called(ctx, user).Error(0)
}

func TestCreateUserUseCase(t *testing.T) {
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
