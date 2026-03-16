# Go Concurrency Patterns

## Context Package

Context manages goroutine lifecycle, cancellation, timeouts, and request-scoped values.

### Context Basics

```go
// Always pass context as first parameter
func ProcessRequest(ctx context.Context, userID string) error {
    select {
    case <-ctx.Done():
        return ctx.Err()
    default:
    }
    return nil
}

// Context creation
ctx := context.Background()                              // Top level
ctx, cancel := context.WithTimeout(ctx, 5*time.Second)   // With timeout
defer cancel()                                            // Always defer cancel
ctx, cancel = context.WithCancel(ctx)                     // With cancellation
ctx = context.WithValue(ctx, "requestID", "12345")        // With values (use sparingly)
```

### Context Propagation Through Layers

```go
// Propagate context through ALL layers
func (uc *CreateOrderUseCase) Execute(ctx context.Context, input CreateOrderInput) error {
    user, err := uc.userRepo.GetByID(ctx, input.UserID)        // Pass to repo
    if err != nil { return fmt.Errorf("get user: %w", err) }

    err = uc.paymentSvc.Charge(ctx, user.CardID, input.Amount) // Pass to external
    if err != nil { return fmt.Errorf("charge: %w", err) }

    return uc.eventPub.Publish(ctx, "order.created", event)    // Pass to messaging
}
```

---

## Goroutines & Channels

### Basic Patterns

```go
// Goroutine with channel communication
resultChan := make(chan string)
go func() {
    resultChan <- processData()
}()
result := <-resultChan

// Goroutine with context cancellation
ctx, cancel := context.WithCancel(context.Background())
defer cancel()

go func() {
    for {
        select {
        case <-ctx.Done():
            return
        default:
            // Do work
        }
    }
}()
```

### Channel Types

```go
ch := make(chan int)          // Unbuffered (blocking)
ch := make(chan int, 10)      // Buffered (non-blocking until full)
func send(ch chan<- int) {}   // Send-only
func recv(ch <-chan int) {}   // Receive-only

// Close and range
close(ch)                     // Close when done producing
for v := range ch { ... }    // Range exits when channel closed

// Check if closed
value, ok := <-ch
if !ok { /* closed */ }
```

### Select Statement

```go
func worker(ctx context.Context, jobs <-chan Job, results chan<- Result) {
    for {
        select {
        case <-ctx.Done():
            return
        case job := <-jobs:
            result := processJob(job)
            select {
            case results <- result:
            default: // Drop if full
            }
        case <-time.After(30 * time.Second):
            // Timeout
        }
    }
}
```

---

## Worker Pool Pattern

```go
type WorkerPool struct {
    workerCount int
    jobs        chan Job
    results     chan Result
    wg          sync.WaitGroup
}

func NewWorkerPool(workerCount int) *WorkerPool {
    return &WorkerPool{
        workerCount: workerCount,
        jobs:        make(chan Job, 100),
        results:     make(chan Result, 100),
    }
}

func (wp *WorkerPool) Start(ctx context.Context) {
    for i := 0; i < wp.workerCount; i++ {
        wp.wg.Add(1)
        go wp.worker(ctx, i)
    }
}

func (wp *WorkerPool) worker(ctx context.Context, id int) {
    defer wp.wg.Done()
    for {
        select {
        case <-ctx.Done():
            return
        case job, ok := <-wp.jobs:
            if !ok { return }
            wp.results <- processJob(job)
        }
    }
}

func (wp *WorkerPool) Submit(job Job)        { wp.jobs <- job }
func (wp *WorkerPool) Results() <-chan Result { return wp.results }
func (wp *WorkerPool) Shutdown() {
    close(wp.jobs)
    wp.wg.Wait()
    close(wp.results)
}
```

### Worker Pool with Rate Limiting

```go
type RateLimitedPool struct {
    workerCount int
    jobs        chan Job
    results     chan Result
    limiter     *rate.Limiter
    wg          sync.WaitGroup
}

func NewRateLimitedPool(workers, rps int) *RateLimitedPool {
    return &RateLimitedPool{
        workerCount: workers,
        jobs:        make(chan Job, 100),
        results:     make(chan Result, 100),
        limiter:     rate.NewLimiter(rate.Limit(rps), rps),
    }
}

func (wp *RateLimitedPool) worker(ctx context.Context) {
    defer wp.wg.Done()
    for job := range wp.jobs {
        if err := wp.limiter.Wait(ctx); err != nil { return }
        wp.results <- processJob(job)
    }
}
```

---

## Errgroup Pattern

`errgroup` simplifies managing multiple goroutines with error handling.

```go
import "golang.org/x/sync/errgroup"

// Basic: parallel independent tasks
func fetchAll(ctx context.Context) error {
    g, ctx := errgroup.WithContext(ctx)

    g.Go(func() error { return fetchUsers(ctx) })
    g.Go(func() error { return fetchOrders(ctx) })
    g.Go(func() error { return fetchProducts(ctx) })

    return g.Wait() // Returns first non-nil error
}

// With concurrency limit
func processFiles(ctx context.Context, files []string) error {
    g, ctx := errgroup.WithContext(ctx)
    g.SetLimit(10)

    for _, file := range files {
        file := file // Capture loop variable (Go < 1.22)
        g.Go(func() error { return processFile(ctx, file) })
    }
    return g.Wait()
}

// With results collection
func fetchUsers(ctx context.Context, ids []string) ([]User, error) {
    g, ctx := errgroup.WithContext(ctx)
    var mu sync.Mutex
    users := make([]User, 0, len(ids))

    for _, id := range ids {
        id := id
        g.Go(func() error {
            user, err := fetchUser(ctx, id)
            if err != nil { return err }
            mu.Lock()
            users = append(users, user)
            mu.Unlock()
            return nil
        })
    }

    if err := g.Wait(); err != nil { return nil, err }
    return users, nil
}
```

---

## Pipeline Pattern (Fan-out / Fan-in)

```go
// Stage: generate
func generate(ctx context.Context, nums ...int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for _, n := range nums {
            select {
            case <-ctx.Done(): return
            case out <- n:
            }
        }
    }()
    return out
}

// Fan-out: distribute to workers
func fanOut(ctx context.Context, in <-chan Job, workers int) []<-chan Result {
    channels := make([]<-chan Result, workers)
    for i := range workers {
        channels[i] = worker(ctx, in)
    }
    return channels
}

// Fan-in: merge channels
func fanIn(ctx context.Context, channels ...<-chan Result) <-chan Result {
    out := make(chan Result)
    var wg sync.WaitGroup

    for _, ch := range channels {
        wg.Add(1)
        go func(c <-chan Result) {
            defer wg.Done()
            for r := range c {
                select {
                case <-ctx.Done(): return
                case out <- r:
                }
            }
        }(ch)
    }

    go func() { wg.Wait(); close(out) }()
    return out
}
```

---

## Sync Primitives

```go
// Mutex: protect shared state
type SafeCounter struct {
    mu    sync.Mutex
    count int
}
func (c *SafeCounter) Inc()    { c.mu.Lock(); defer c.mu.Unlock(); c.count++ }
func (c *SafeCounter) Val() int { c.mu.Lock(); defer c.mu.Unlock(); return c.count }

// RWMutex: multiple readers, single writer
type Cache struct {
    mu   sync.RWMutex
    data map[string]any
}
func (c *Cache) Get(k string) (any, bool) { c.mu.RLock(); defer c.mu.RUnlock(); v, ok := c.data[k]; return v, ok }
func (c *Cache) Set(k string, v any)      { c.mu.Lock(); defer c.mu.Unlock(); c.data[k] = v }

// WaitGroup: wait for goroutines
var wg sync.WaitGroup
for _, item := range items {
    wg.Add(1)
    go func(i Item) { defer wg.Done(); process(i) }(item)
}
wg.Wait()

// Once: execute initialization exactly once
var once sync.Once
var instance *DB
func GetDB() *DB {
    once.Do(func() { instance = &DB{} })
    return instance
}
```

---

## Graceful Shutdown

```go
func main() {
    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()

    sigChan := make(chan os.Signal, 1)
    signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

    // Start workers
    go worker(ctx, "worker-1")
    go worker(ctx, "worker-2")

    <-sigChan
    fmt.Println("Shutting down...")
    cancel()

    shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer shutdownCancel()

    cleanup(shutdownCtx)
    fmt.Println("Shutdown complete")
}
```

---

## When to Use Each Pattern

| Scenario | Pattern |
|----------|---------|
| Simple parallel tasks with error handling | `errgroup` |
| Rate-limited operations | Worker pool + `rate.Limiter` |
| Data transformation pipeline | Fan-out / Fan-in |
| Background long-running work | Goroutine + context cancellation |
| Batch operations | Buffered channels + worker pool |
| One-time initialization | `sync.Once` |
| Shared state protection | `sync.Mutex` / `sync.RWMutex` |
| Wait for N goroutines | `sync.WaitGroup` |

---

## Common Anti-patterns

```go
// BAD: goroutine leak (no exit)
go func() { for { time.Sleep(1 * time.Second) } }()

// GOOD: context cancellation
go func() {
    for {
        select {
        case <-ctx.Done(): return
        default: time.Sleep(1 * time.Second)
        }
    }
}()

// BAD: channel never closed
func produce(ch chan int) { for i := 0; i < 10; i++ { ch <- i } }

// GOOD: close when done
func produce(ch chan int) { defer close(ch); for i := 0; i < 10; i++ { ch <- i } }

// BAD: race condition on shared map
cache[key] = val // RACE!

// GOOD: use mutex
mu.Lock(); cache[key] = val; mu.Unlock()

// BAD: captures loop variable (Go < 1.22)
for _, item := range items { go func() { process(item) }() }

// GOOD: shadow or pass as param
for _, item := range items { item := item; go func() { process(item) }() }
```
