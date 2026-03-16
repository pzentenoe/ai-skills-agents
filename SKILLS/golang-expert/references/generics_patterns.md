# Go Generics Patterns (1.18+)

## Generic Repository Pattern

Eliminate boilerplate by creating a base repository that works with any entity.

### Base Repository Interface

```go
// domain/repository/base.go
package repository

import "context"

// Entity constraint — all domain entities must have an ID
type Entity interface {
    GetID() string
}

// BaseRepository provides common CRUD operations for any entity
type BaseRepository[T Entity] interface {
    Create(ctx context.Context, entity *T) error
    GetByID(ctx context.Context, id string) (*T, error)
    Update(ctx context.Context, entity *T) error
    Delete(ctx context.Context, id string) error
    List(ctx context.Context, limit, offset int) ([]*T, int64, error)
}
```

### Generic Repository Implementation

```go
// infrastructure/persistence/base_repository.go
package persistence

import (
    "context"
    "fmt"
    "myapp/domain"
    "myapp/domain/repository"
    "gorm.io/gorm"
)

// baseRepository implements BaseRepository for any GORM model
type baseRepository[T any] struct {
    db *gorm.DB
}

func NewBaseRepository[T any](db *gorm.DB) *baseRepository[T] {
    return &baseRepository[T]{db: db}
}

func (r *baseRepository[T]) Create(ctx context.Context, entity *T) error {
    if err := r.db.WithContext(ctx).Create(entity).Error; err != nil {
        return fmt.Errorf("create: %w", err)
    }
    return nil
}

func (r *baseRepository[T]) GetByID(ctx context.Context, id string) (*T, error) {
    var entity T
    if err := r.db.WithContext(ctx).First(&entity, "id = ?", id).Error; err != nil {
        if err == gorm.ErrRecordNotFound {
            return nil, fmt.Errorf("%w: id=%s", domain.ErrNotFound, id)
        }
        return nil, fmt.Errorf("get by id: %w", err)
    }
    return &entity, nil
}

func (r *baseRepository[T]) Update(ctx context.Context, entity *T) error {
    if err := r.db.WithContext(ctx).Save(entity).Error; err != nil {
        return fmt.Errorf("update: %w", err)
    }
    return nil
}

func (r *baseRepository[T]) Delete(ctx context.Context, id string) error {
    var entity T
    if err := r.db.WithContext(ctx).Delete(&entity, "id = ?", id).Error; err != nil {
        return fmt.Errorf("delete: %w", err)
    }
    return nil
}

func (r *baseRepository[T]) List(ctx context.Context, limit, offset int) ([]*T, int64, error) {
    var entities []*T
    var total int64

    if err := r.db.WithContext(ctx).Model(new(T)).Count(&total).Error; err != nil {
        return nil, 0, fmt.Errorf("count: %w", err)
    }

    if err := r.db.WithContext(ctx).Limit(limit).Offset(offset).Find(&entities).Error; err != nil {
        return nil, 0, fmt.Errorf("list: %w", err)
    }

    return entities, total, nil
}
```

### Extending Generic Repository

```go
// domain/repository/user_repository.go
package repository

import "context"

// UserRepository extends BaseRepository with user-specific operations
type UserRepository interface {
    BaseRepository[entity.User]
    GetByEmail(ctx context.Context, email string) (*entity.User, error)
    GetActiveUsers(ctx context.Context) ([]*entity.User, error)
}

// infrastructure/persistence/user_repository.go
type userRepository struct {
    *baseRepository[UserModel]
    db *gorm.DB
}

func NewUserRepository(db *gorm.DB) repository.UserRepository {
    return &userRepository{
        baseRepository: NewBaseRepository[UserModel](db),
        db:             db,
    }
}

func (r *userRepository) GetByEmail(ctx context.Context, email string) (*entity.User, error) {
    var model UserModel
    if err := r.db.WithContext(ctx).Where("email = ?", email).First(&model).Error; err != nil {
        return nil, fmt.Errorf("get by email: %w", err)
    }
    return toDomain(&model), nil
}
```

---

## Result Type Pattern

Type-safe error handling without wrapping in tuples.

```go
// pkg/result/result.go
package result

// Result represents a value or an error
type Result[T any] struct {
    value T
    err   error
}

func Ok[T any](value T) Result[T] {
    return Result[T]{value: value}
}

func Err[T any](err error) Result[T] {
    return Result[T]{err: err}
}

func (r Result[T]) IsOk() bool    { return r.err == nil }
func (r Result[T]) IsErr() bool   { return r.err != nil }
func (r Result[T]) Value() T      { return r.value }
func (r Result[T]) Error() error  { return r.err }

func (r Result[T]) Unwrap() (T, error) {
    return r.value, r.err
}

// Map transforms the value if Ok
func Map[T, U any](r Result[T], fn func(T) U) Result[U] {
    if r.IsErr() {
        return Err[U](r.err)
    }
    return Ok(fn(r.value))
}

// FlatMap chains operations that return Result
func FlatMap[T, U any](r Result[T], fn func(T) Result[U]) Result[U] {
    if r.IsErr() {
        return Err[U](r.err)
    }
    return fn(r.value)
}
```

---

## Functional Options Pattern

Type-safe, extensible configuration for structs.

```go
// Option pattern with generics
type Option[T any] func(*T)

func WithTimeout[T any](timeout time.Duration) Option[T] {
    // Only works if T has a Timeout field — use specific types instead
}

// Practical example: Server options
type Server struct {
    host         string
    port         int
    timeout      time.Duration
    maxRetries   int
    logger       *slog.Logger
}

type ServerOption func(*Server)

func WithHost(host string) ServerOption {
    return func(s *Server) { s.host = host }
}

func WithPort(port int) ServerOption {
    return func(s *Server) { s.port = port }
}

func WithTimeout(d time.Duration) ServerOption {
    return func(s *Server) { s.timeout = d }
}

func WithMaxRetries(n int) ServerOption {
    return func(s *Server) { s.maxRetries = n }
}

func WithLogger(l *slog.Logger) ServerOption {
    return func(s *Server) { s.logger = l }
}

func NewServer(opts ...ServerOption) *Server {
    s := &Server{
        host:       "0.0.0.0",
        port:       8080,
        timeout:    30 * time.Second,
        maxRetries: 3,
        logger:     slog.Default(),
    }
    for _, opt := range opts {
        opt(s)
    }
    return s
}

// Usage
server := NewServer(
    WithHost("localhost"),
    WithPort(9090),
    WithTimeout(10 * time.Second),
)
```

---

## Type-Safe Collections

### Filter, Map, Reduce

```go
// pkg/slices/slices.go
package slices

// Filter returns elements that match the predicate
func Filter[T any](items []T, predicate func(T) bool) []T {
    result := make([]T, 0, len(items))
    for _, item := range items {
        if predicate(item) {
            result = append(result, item)
        }
    }
    return result
}

// Map transforms each element
func Map[T, U any](items []T, transform func(T) U) []U {
    result := make([]U, len(items))
    for i, item := range items {
        result[i] = transform(item)
    }
    return result
}

// Reduce aggregates elements into a single value
func Reduce[T, U any](items []T, initial U, fn func(U, T) U) U {
    acc := initial
    for _, item := range items {
        acc = fn(acc, item)
    }
    return acc
}

// GroupBy groups elements by a key function
func GroupBy[T any, K comparable](items []T, keyFn func(T) K) map[K][]T {
    result := make(map[K][]T)
    for _, item := range items {
        key := keyFn(item)
        result[key] = append(result[key], item)
    }
    return result
}

// Contains checks if a slice contains an element
func Contains[T comparable](items []T, target T) bool {
    for _, item := range items {
        if item == target {
            return true
        }
    }
    return false
}
```

### Usage

```go
// Filter active users
activeUsers := slices.Filter(users, func(u User) bool {
    return u.IsActive()
})

// Extract emails
emails := slices.Map(users, func(u User) string {
    return u.Email
})

// Group by role
byRole := slices.GroupBy(users, func(u User) string {
    return u.Role
})

// Sum order totals
total := slices.Reduce(orders, 0.0, func(acc float64, o Order) float64 {
    return acc + o.Total
})
```

---

## Generic Type Constraints

```go
// Custom constraints
type Number interface {
    ~int | ~int8 | ~int16 | ~int32 | ~int64 |
    ~uint | ~uint8 | ~uint16 | ~uint32 | ~uint64 |
    ~float32 | ~float64
}

type Ordered interface {
    Number | ~string
}

// Generic min/max
func Min[T Ordered](a, b T) T {
    if a < b { return a }
    return b
}

func Max[T Ordered](a, b T) T {
    if a > b { return a }
    return b
}

// Generic Set
type Set[T comparable] struct {
    items map[T]struct{}
}

func NewSet[T comparable](items ...T) *Set[T] {
    s := &Set[T]{items: make(map[T]struct{}, len(items))}
    for _, item := range items {
        s.Add(item)
    }
    return s
}

func (s *Set[T]) Add(item T)            { s.items[item] = struct{}{} }
func (s *Set[T]) Remove(item T)         { delete(s.items, item) }
func (s *Set[T]) Contains(item T) bool  { _, ok := s.items[item]; return ok }
func (s *Set[T]) Len() int              { return len(s.items) }

func (s *Set[T]) Values() []T {
    result := make([]T, 0, len(s.items))
    for item := range s.items {
        result = append(result, item)
    }
    return result
}
```

---

## Generic Use Case Pattern

```go
// application/usecase.go
package application

import "context"

// UseCase defines a generic use case interface
type UseCase[Input, Output any] interface {
    Execute(ctx context.Context, input Input) (Output, error)
}

// NoInput for use cases without input
type NoInput struct{}

// Usage
type GetUserUseCase struct { ... }
// Implements UseCase[string, *UserOutput]

type CreateUserUseCase struct { ... }
// Implements UseCase[CreateUserInput, *CreateUserOutput]

type DeleteUserUseCase struct { ... }
// Implements UseCase[string, NoInput]
```

---

## When to Use Generics vs Interfaces

| Scenario | Use |
|----------|-----|
| Behavior abstraction (methods) | **Interface** |
| Type-safe collections/containers | **Generics** |
| Algorithm on multiple types | **Generics** |
| Dependency injection | **Interface** |
| Repository base CRUD | **Generics** |
| Domain service contracts | **Interface** |

**Rule of thumb**: Use interfaces for behavior, generics for data structures and algorithms.
