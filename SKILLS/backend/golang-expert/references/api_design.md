# API Design Patterns for Go

## RESTful API Conventions

### URL Structure

```
GET    /api/v1/users              # List users
POST   /api/v1/users              # Create user
GET    /api/v1/users/:id          # Get user
PUT    /api/v1/users/:id          # Full update
PATCH  /api/v1/users/:id          # Partial update
DELETE /api/v1/users/:id          # Delete user

# Nested resources
GET    /api/v1/users/:id/orders   # List user's orders
POST   /api/v1/users/:id/orders   # Create order for user

# Actions (non-CRUD)
POST   /api/v1/users/:id/activate    # Custom action
POST   /api/v1/orders/:id/cancel     # Custom action
```

### Naming Rules
- Use **plural nouns** for resources (`/users`, not `/user`)
- Use **kebab-case** for multi-word resources (`/order-items`)
- Use **path params** for identity (`/users/:id`)
- Use **query params** for filtering (`/users?status=active`)
- Version in URL path (`/api/v1/`)

---

## Standard Response Envelope

### Success Response

```go
// pkg/response/response.go
package response

import "net/http"

type Response struct {
    Success bool        `json:"success"`
    Data    interface{} `json:"data,omitempty"`
    Meta    *Meta       `json:"meta,omitempty"`
}

type Meta struct {
    Page       int   `json:"page"`
    PerPage    int   `json:"per_page"`
    TotalItems int64 `json:"total_items"`
    TotalPages int   `json:"total_pages"`
}

type ErrorResponse struct {
    Success bool          `json:"success"`
    Error   ErrorDetail   `json:"error"`
}

type ErrorDetail struct {
    Code    string            `json:"code"`
    Message string            `json:"message"`
    Details map[string]string `json:"details,omitempty"`
}

// Helper functions
func OK(data interface{}) Response {
    return Response{Success: true, Data: data}
}

func OKWithMeta(data interface{}, meta Meta) Response {
    return Response{Success: true, Data: data, Meta: &meta}
}

func Fail(code, message string) ErrorResponse {
    return ErrorResponse{
        Success: false,
        Error:   ErrorDetail{Code: code, Message: message},
    }
}

func FailWithDetails(code, message string, details map[string]string) ErrorResponse {
    return ErrorResponse{
        Success: false,
        Error:   ErrorDetail{Code: code, Message: message, Details: details},
    }
}
```

### JSON Examples

```json
// Success: single resource
{
    "success": true,
    "data": {
        "id": "usr_123",
        "email": "user@example.com",
        "name": "John Doe"
    }
}

// Success: list with pagination
{
    "success": true,
    "data": [
        {"id": "usr_123", "email": "user@example.com"},
        {"id": "usr_456", "email": "jane@example.com"}
    ],
    "meta": {
        "page": 1,
        "per_page": 20,
        "total_items": 150,
        "total_pages": 8
    }
}

// Error
{
    "success": false,
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Invalid input data",
        "details": {
            "email": "invalid email format",
            "name": "required field"
        }
    }
}
```

---

## Pagination

### Offset-based (simple, most common)

```go
// pkg/pagination/pagination.go
package pagination

import "math"

type Params struct {
    Page    int `query:"page"`
    PerPage int `query:"per_page"`
}

func (p *Params) Normalize() {
    if p.Page < 1 {
        p.Page = 1
    }
    if p.PerPage < 1 {
        p.PerPage = 20
    }
    if p.PerPage > 100 {
        p.PerPage = 100
    }
}

func (p *Params) Offset() int {
    return (p.Page - 1) * p.PerPage
}

func (p *Params) Limit() int {
    return p.PerPage
}

func (p *Params) ToMeta(totalItems int64) response.Meta {
    return response.Meta{
        Page:       p.Page,
        PerPage:    p.PerPage,
        TotalItems: totalItems,
        TotalPages: int(math.Ceil(float64(totalItems) / float64(p.PerPage))),
    }
}
```

### Cursor-based (for large datasets / real-time feeds)

```go
type CursorParams struct {
    Cursor string `query:"cursor"`
    Limit  int    `query:"limit"`
}

type CursorMeta struct {
    NextCursor string `json:"next_cursor,omitempty"`
    HasMore    bool   `json:"has_more"`
}

// Usage in repository
func (r *repo) ListAfterCursor(ctx context.Context, cursor string, limit int) ([]*Entity, string, error) {
    query := r.db.WithContext(ctx).Order("created_at DESC").Limit(limit + 1)

    if cursor != "" {
        query = query.Where("id < ?", cursor)
    }

    var items []*Entity
    if err := query.Find(&items).Error; err != nil {
        return nil, "", err
    }

    var nextCursor string
    if len(items) > limit {
        nextCursor = items[limit-1].ID
        items = items[:limit]
    }

    return items, nextCursor, nil
}
```

---

## Filtering & Sorting

### Query Parameter Convention

```
GET /api/v1/users?status=active&role=admin           # Exact match
GET /api/v1/users?name=john                           # Search/contains
GET /api/v1/users?created_after=2024-01-01            # Date range
GET /api/v1/users?sort=created_at&order=desc          # Sorting
GET /api/v1/users?sort=-created_at,+name              # Multi-sort (- desc, + asc)
GET /api/v1/users?fields=id,name,email                # Field selection
```

### Filter Struct Pattern

```go
// application/user/list_users.go
type ListUsersInput struct {
    // Pagination
    Page    int
    PerPage int

    // Filters
    Status    *string
    Role      *string
    Search    *string
    CreatedAfter  *time.Time
    CreatedBefore *time.Time

    // Sorting
    SortBy    string // "created_at", "name", "email"
    SortOrder string // "asc", "desc"
}

// infrastructure/persistence — apply filters
func (r *repo) List(ctx context.Context, input ListUsersInput) ([]*entity.User, int64, error) {
    query := r.db.WithContext(ctx).Model(&UserModel{})

    if input.Status != nil {
        query = query.Where("status = ?", *input.Status)
    }
    if input.Role != nil {
        query = query.Where("role = ?", *input.Role)
    }
    if input.Search != nil {
        query = query.Where("name ILIKE ? OR email ILIKE ?",
            "%"+*input.Search+"%", "%"+*input.Search+"%")
    }
    if input.CreatedAfter != nil {
        query = query.Where("created_at >= ?", *input.CreatedAfter)
    }

    // Count
    var total int64
    query.Count(&total)

    // Sort
    sortCol := "created_at"
    if input.SortBy != "" {
        sortCol = input.SortBy
    }
    order := sortCol
    if input.SortOrder == "desc" {
        order += " DESC"
    }
    query = query.Order(order)

    // Paginate
    var models []UserModel
    query.Offset(input.Offset()).Limit(input.Limit()).Find(&models)

    return toDomainSlice(models), total, nil
}
```

---

## Error Codes Convention

```go
// pkg/apperror/codes.go
package apperror

const (
    // Client errors (4xx)
    CodeValidation     = "VALIDATION_ERROR"
    CodeNotFound       = "NOT_FOUND"
    CodeAlreadyExists  = "ALREADY_EXISTS"
    CodeUnauthorized   = "UNAUTHORIZED"
    CodeForbidden      = "FORBIDDEN"
    CodeRateLimited    = "RATE_LIMITED"
    CodeBadRequest     = "BAD_REQUEST"

    // Server errors (5xx)
    CodeInternal       = "INTERNAL_ERROR"
    CodeServiceDown    = "SERVICE_UNAVAILABLE"
    CodeTimeout        = "TIMEOUT"
)

// Map domain errors to HTTP status + error code
func MapError(err error) (int, ErrorResponse) {
    switch {
    case errors.Is(err, domain.ErrNotFound):
        return http.StatusNotFound, Fail(CodeNotFound, "Resource not found")
    case errors.Is(err, domain.ErrAlreadyExists):
        return http.StatusConflict, Fail(CodeAlreadyExists, "Resource already exists")
    case errors.Is(err, domain.ErrInvalidInput):
        return http.StatusBadRequest, Fail(CodeValidation, err.Error())
    case errors.Is(err, domain.ErrUnauthorized):
        return http.StatusUnauthorized, Fail(CodeUnauthorized, "Authentication required")
    case errors.Is(err, domain.ErrForbidden):
        return http.StatusForbidden, Fail(CodeForbidden, "Access denied")
    default:
        return http.StatusInternalServerError, Fail(CodeInternal, "Internal server error")
    }
}
```

---

## API Versioning Strategies

### URL Path (recommended)

```go
v1 := e.Group("/api/v1")
v1.GET("/users", v1Handler.ListUsers)

v2 := e.Group("/api/v2")
v2.GET("/users", v2Handler.ListUsers) // New response format
```

### Header-based (alternative)

```go
func VersionMiddleware() echo.MiddlewareFunc {
    return func(next echo.HandlerFunc) echo.HandlerFunc {
        return func(c echo.Context) error {
            version := c.Request().Header.Get("API-Version")
            if version == "" { version = "1" }
            c.Set("api_version", version)
            return next(c)
        }
    }
}
```

---

## Request Validation Pattern

```go
// interface/http/handler/request.go

// Validate at the boundary — handler level
type CreateUserRequest struct {
    Email string `json:"email" validate:"required,email"`
    Name  string `json:"name"  validate:"required,min=2,max=100"`
    Age   int    `json:"age"   validate:"omitempty,gte=0,lte=150"`
    Role  string `json:"role"  validate:"omitempty,oneof=admin user moderator"`
}

// Handler pattern: bind → validate → map → execute → respond
func (h *Handler) CreateUser(c echo.Context) error {
    var req CreateUserRequest
    if err := c.Bind(&req); err != nil {
        return c.JSON(http.StatusBadRequest, response.Fail("BAD_REQUEST", "Invalid JSON"))
    }
    if err := c.Validate(&req); err != nil {
        return c.JSON(http.StatusBadRequest, response.Fail("VALIDATION_ERROR", err.Error()))
    }

    input := user.CreateUserInput{Email: req.Email, Name: req.Name}
    output, err := h.createUserUC.Execute(c.Request().Context(), input)
    if err != nil {
        status, resp := apperror.MapError(err)
        return c.JSON(status, resp)
    }

    return c.JSON(http.StatusCreated, response.OK(output))
}
```

---

## Health Check Endpoints

```go
// GET /health — basic liveness
func HealthHandler(c echo.Context) error {
    return c.JSON(http.StatusOK, map[string]string{
        "status": "ok",
        "time":   time.Now().UTC().Format(time.RFC3339),
    })
}

// GET /ready — readiness (checks dependencies)
func ReadinessHandler(db *gorm.DB) echo.HandlerFunc {
    return func(c echo.Context) error {
        sqlDB, err := db.DB()
        if err != nil {
            return c.JSON(http.StatusServiceUnavailable, map[string]string{
                "status": "not ready",
                "error":  "database connection failed",
            })
        }

        ctx, cancel := context.WithTimeout(c.Request().Context(), 2*time.Second)
        defer cancel()

        if err := sqlDB.PingContext(ctx); err != nil {
            return c.JSON(http.StatusServiceUnavailable, map[string]string{
                "status": "not ready",
                "error":  "database ping failed",
            })
        }

        return c.JSON(http.StatusOK, map[string]string{
            "status": "ready",
        })
    }
}
```

---

## Idempotency

```go
// For POST/PUT operations — prevent duplicate processing
// Client sends: Idempotency-Key: <uuid>

func IdempotencyMiddleware(cache Cache) echo.MiddlewareFunc {
    return func(next echo.HandlerFunc) echo.HandlerFunc {
        return func(c echo.Context) error {
            if c.Request().Method != http.MethodPost {
                return next(c)
            }

            key := c.Request().Header.Get("Idempotency-Key")
            if key == "" {
                return next(c)
            }

            // Check cache for existing response
            if cached, ok := cache.Get(key); ok {
                return c.JSONBlob(http.StatusOK, cached)
            }

            // Process request and cache response
            return next(c)
        }
    }
}
```
