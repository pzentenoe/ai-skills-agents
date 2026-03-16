# Security Patterns for Go

## Input Validation

### Validate at Boundaries

Validate ALL external input at the interface/delivery layer. Never trust data from clients.

```go
// interface/http/handler — validation happens HERE
type CreateUserRequest struct {
    Email    string `json:"email"    validate:"required,email,max=255"`
    Name     string `json:"name"     validate:"required,min=2,max=100,alphanumunicode"`
    Password string `json:"password" validate:"required,min=8,max=72"`
    Age      int    `json:"age"      validate:"omitempty,gte=0,lte=150"`
    Role     string `json:"role"     validate:"omitempty,oneof=user admin moderator"`
    Website  string `json:"website"  validate:"omitempty,url"`
}

// Custom validator
import "github.com/go-playground/validator/v10"

type CustomValidator struct {
    validator *validator.Validate
}

func NewValidator() *CustomValidator {
    v := validator.New()

    // Register custom validations
    v.RegisterValidation("safe_string", func(fl validator.FieldLevel) bool {
        // Reject strings with control characters or null bytes
        s := fl.Field().String()
        for _, r := range s {
            if r < 32 && r != '\n' && r != '\r' && r != '\t' {
                return false
            }
        }
        return true
    })

    return &CustomValidator{validator: v}
}

func (cv *CustomValidator) Validate(i interface{}) error {
    return cv.validator.Struct(i)
}
```

---

## SQL Injection Prevention

### Always Use Parameterized Queries

```go
// GOOD: parameterized queries (ORM handles this)
db.Where("email = ?", email).First(&user)
db.Where("name ILIKE ?", "%"+search+"%").Find(&users)

// GOOD: raw SQL with parameters
db.Raw("SELECT * FROM users WHERE email = ? AND status = ?", email, status).Scan(&users)

// BAD: string concatenation — SQL INJECTION!
db.Raw("SELECT * FROM users WHERE email = '" + email + "'").Scan(&users)
db.Where(fmt.Sprintf("name = '%s'", name)).Find(&users)

// GOOD: for dynamic column names, whitelist them
func validSortColumn(col string) bool {
    allowed := map[string]bool{
        "created_at": true,
        "name":       true,
        "email":      true,
    }
    return allowed[col]
}

func (r *repo) List(ctx context.Context, sortBy string) ([]*entity.User, error) {
    if !validSortColumn(sortBy) {
        sortBy = "created_at" // Default safe value
    }
    return r.db.WithContext(ctx).Order(sortBy + " DESC").Find(&users).Error
}
```

---

## Authentication: JWT Best Practices

### Token Generation

```go
package auth

import (
    "time"
    "github.com/golang-jwt/jwt/v5"
)

type Claims struct {
    UserID string `json:"user_id"`
    Email  string `json:"email"`
    Role   string `json:"role"`
    jwt.RegisteredClaims
}

func GenerateToken(userID, email, role, secret string, expiration time.Duration) (string, error) {
    claims := &Claims{
        UserID: userID,
        Email:  email,
        Role:   role,
        RegisteredClaims: jwt.RegisteredClaims{
            ExpiresAt: jwt.NewNumericDate(time.Now().Add(expiration)),
            IssuedAt:  jwt.NewNumericDate(time.Now()),
            NotBefore: jwt.NewNumericDate(time.Now()),
            Issuer:    "myapp",
            Subject:   userID,
        },
    }

    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString([]byte(secret))
}

func ValidateToken(tokenStr, secret string) (*Claims, error) {
    token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(token *jwt.Token) (interface{}, error) {
        // Validate signing method
        if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
            return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
        }
        return []byte(secret), nil
    })

    if err != nil {
        return nil, fmt.Errorf("invalid token: %w", err)
    }

    claims, ok := token.Claims.(*Claims)
    if !ok || !token.Valid {
        return nil, fmt.Errorf("invalid token claims")
    }

    return claims, nil
}
```

### JWT Security Rules
- Use **HS256** (symmetric) for single services, **RS256** (asymmetric) for microservices
- Set **short expiration** (15-30 min for access tokens)
- Use **refresh tokens** for long sessions (stored server-side)
- **Never store secrets in JWT** — only identifiers
- **Always validate signing method** to prevent algorithm confusion
- Store JWT secret in environment variable, never in code

---

## Authorization: Role-Based Access Control

```go
// middleware/auth.go
func RequireRole(roles ...string) echo.MiddlewareFunc {
    return func(next echo.HandlerFunc) echo.HandlerFunc {
        return func(c echo.Context) error {
            claims := getClaims(c) // Extract from JWT middleware
            if claims == nil {
                return c.JSON(http.StatusUnauthorized, response.Fail("UNAUTHORIZED", "Authentication required"))
            }

            for _, role := range roles {
                if claims.Role == role {
                    return next(c)
                }
            }

            return c.JSON(http.StatusForbidden, response.Fail("FORBIDDEN", "Insufficient permissions"))
        }
    }
}

// Usage in routes
admin := api.Group("/admin", RequireRole("admin"))
admin.DELETE("/users/:id", handler.DeleteUser)

moderator := api.Group("/mod", RequireRole("admin", "moderator"))
moderator.PUT("/users/:id/ban", handler.BanUser)
```

---

## Password Handling

```go
import "golang.org/x/crypto/bcrypt"

const bcryptCost = 12 // Good balance of security and speed

func HashPassword(password string) (string, error) {
    // bcrypt automatically handles salting
    hash, err := bcrypt.GenerateFromPassword([]byte(password), bcryptCost)
    if err != nil {
        return "", fmt.Errorf("hash password: %w", err)
    }
    return string(hash), nil
}

func CheckPassword(hash, password string) bool {
    err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
    return err == nil
}

// Password validation rules
func ValidatePassword(password string) error {
    if len(password) < 8 {
        return errors.New("password must be at least 8 characters")
    }
    if len(password) > 72 {
        return errors.New("password must be at most 72 characters") // bcrypt limit
    }
    // Add more rules as needed: uppercase, number, special char
    return nil
}
```

---

## Rate Limiting

```go
import "golang.org/x/time/rate"

// Per-IP rate limiter
type RateLimiter struct {
    visitors map[string]*rate.Limiter
    mu       sync.RWMutex
    rate     rate.Limit
    burst    int
}

func NewRateLimiter(r rate.Limit, burst int) *RateLimiter {
    return &RateLimiter{
        visitors: make(map[string]*rate.Limiter),
        rate:     r,
        burst:    burst,
    }
}

func (rl *RateLimiter) GetLimiter(ip string) *rate.Limiter {
    rl.mu.Lock()
    defer rl.mu.Unlock()

    limiter, exists := rl.visitors[ip]
    if !exists {
        limiter = rate.NewLimiter(rl.rate, rl.burst)
        rl.visitors[ip] = limiter
    }
    return limiter
}

func RateLimitMiddleware(rl *RateLimiter) echo.MiddlewareFunc {
    return func(next echo.HandlerFunc) echo.HandlerFunc {
        return func(c echo.Context) error {
            ip := c.RealIP()
            limiter := rl.GetLimiter(ip)

            if !limiter.Allow() {
                return c.JSON(http.StatusTooManyRequests, response.Fail(
                    "RATE_LIMITED",
                    "Too many requests, please try again later",
                ))
            }
            return next(c)
        }
    }
}
```

---

## CORS Configuration

```go
import echomiddleware "github.com/labstack/echo/v4/middleware"

// Restrictive CORS (production)
e.Use(echomiddleware.CORSWithConfig(echomiddleware.CORSConfig{
    AllowOrigins: []string{"https://myapp.com", "https://admin.myapp.com"},
    AllowMethods: []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete},
    AllowHeaders: []string{
        echo.HeaderOrigin,
        echo.HeaderContentType,
        echo.HeaderAccept,
        echo.HeaderAuthorization,
        "X-Request-ID",
    },
    AllowCredentials: true,
    MaxAge:           3600,
}))

// Permissive CORS (development only)
e.Use(echomiddleware.CORS())
```

---

## Secrets Management

```go
// NEVER hardcode secrets
// BAD
const jwtSecret = "my-secret-key"

// GOOD: from environment
jwtSecret := os.Getenv("JWT_SECRET")
if jwtSecret == "" {
    log.Fatal("JWT_SECRET is required")
}

// GOOD: validate secret strength
if len(jwtSecret) < 32 {
    log.Fatal("JWT_SECRET must be at least 32 characters")
}

// NEVER log secrets
// BAD
log.Printf("Connecting to DB: %s", config.DatabaseDSN()) // Leaks password!

// GOOD
log.Printf("Connecting to DB: %s:%d/%s", config.DBHost, config.DBPort, config.DBName)
```

---

## Secure HTTP Headers

```go
func SecureHeadersMiddleware() echo.MiddlewareFunc {
    return func(next echo.HandlerFunc) echo.HandlerFunc {
        return func(c echo.Context) error {
            c.Response().Header().Set("X-Content-Type-Options", "nosniff")
            c.Response().Header().Set("X-Frame-Options", "DENY")
            c.Response().Header().Set("X-XSS-Protection", "1; mode=block")
            c.Response().Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
            c.Response().Header().Set("Content-Security-Policy", "default-src 'self'")
            c.Response().Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
            return next(c)
        }
    }
}
```

---

## Security Checklist

- [ ] All input validated at API boundary
- [ ] Parameterized queries only (no string concatenation in SQL)
- [ ] Passwords hashed with bcrypt (cost >= 12)
- [ ] JWT with short expiration and signing method validation
- [ ] Role-based access control on protected routes
- [ ] Rate limiting on authentication and public endpoints
- [ ] CORS configured restrictively for production
- [ ] Secrets loaded from environment, never hardcoded
- [ ] Sensitive data never logged
- [ ] Secure HTTP headers set
- [ ] HTTPS enforced in production
- [ ] Dependencies scanned for vulnerabilities (`govulncheck`)
