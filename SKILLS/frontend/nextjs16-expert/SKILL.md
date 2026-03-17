---
name: nextjs16-expert
description: >
  Expert guidance for Next.js 16 development including Cache Components, proxy.ts, Turbopack, React 19.2 features, and migration from Next.js 15.
  Trigger: When working on Next.js 16 projects, migrating from Next.js 15, or using Cache Components, proxy.ts, or Turbopack as default bundler.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, WebFetch, WebSearch
---

## When to Use

- Building or scaffolding a Next.js 16 application
- Migrating from Next.js 15 to 16
- Implementing Cache Components with `"use cache"` directive
- Replacing `middleware.ts` with `proxy.ts`
- Configuring Turbopack (now the default bundler)
- Using React 19.2 features (`<ViewTransition>`, `useEffectEvent`, `<Activity>`)
- Configuring `next.config.ts` with new top-level options
- Implementing data fetching with the new caching model

---

## Critical Patterns

### 1. Cache Components (`"use cache"` Directive)

The **headline feature** of Next.js 16. Replaces the old implicit caching with an **opt-in** model.

**All code is dynamic by default. You must explicitly opt into caching.**

| Directive | Scope | Storage |
|-----------|-------|---------|
| `'use cache'` | File, component, or function | In-memory LRU |
| `'use cache: remote'` | Same | Platform-provided (Redis, KV) |
| `'use cache: private'` | Same | Isolated, for compliance |

**Enable in config:**

```ts
// next.config.ts
const nextConfig = {
  cacheComponents: true,
};
export default nextConfig;
```

**Usage at different levels:**

```tsx
// File level -- ALL exports cached
'use cache'

export default async function Page() {
  const data = await fetch('/api/products')
  return <ProductList data={data} />
}
```

```tsx
// Component level
export async function PricingTable() {
  'use cache'
  const prices = await fetchPrices()
  return <Table data={prices} />
}
```

```tsx
// Function level
async function getProducts() {
  'use cache'
  return fetch('/api/products').then(r => r.json())
}
```

**Revalidation with `cacheLife` and `cacheTag`:**

```tsx
import { cacheLife, cacheTag } from 'next/cache'

async function getProducts() {
  'use cache'
  cacheLife('hours')        // Built-in profile: seconds | minutes | hours | days | weeks | max
  cacheTag('products')      // Tag for targeted invalidation
  return fetch('/api/products').then(r => r.json())
}
```

**Interleaving pattern** -- cached parents accept `children` as pass-through:

```tsx
async function CachedLayout({ children }: { children: React.ReactNode }) {
  'use cache'
  const nav = await getNavItems()
  return (
    <div>
      <Nav items={nav} />
      {children} {/* Dynamic content passes through without affecting cache */}
    </div>
  )
}
```

### 2. `proxy.ts` Replaces `middleware.ts`

`middleware.ts` is **deprecated**. Use `proxy.ts` instead. Runs on **Node.js runtime** (not Edge).

```ts
// proxy.ts (project root)
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const token = request.cookies.get('token')
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: '/dashboard/:path*',
}
```

| Next.js 15 | Next.js 16 |
|-------------|------------|
| `middleware.ts` | `proxy.ts` |
| Export `middleware()` | Export `proxy()` |
| Edge runtime | Node.js runtime |
| `skipMiddlewareUrlNormalize` | `skipProxyUrlNormalize` |

### 3. Async Request APIs (Fully Enforced)

**All request APIs MUST be awaited.** Synchronous access is completely removed.

```tsx
// WRONG -- will throw
export default function Page({ params, searchParams }) {
  const slug = params.slug  // ERROR
}

// CORRECT
export default async function Page({ params, searchParams }: PageProps<'/blog/[slug]'>) {
  const { slug } = await params
  const { q } = await searchParams
}
```

**All async request APIs:**
- `await cookies()`
- `await headers()`
- `await draftMode()`
- `await params` (in layouts, pages, routes)
- `await searchParams` (in pages)

### 4. Turbopack Is the Default Bundler

No flags needed. Turbopack is active for both `next dev` and `next build`.

```ts
// next.config.ts -- Turbopack config is now top-level
const nextConfig = {
  turbopack: {
    resolveAlias: {
      'old-module': 'new-module',
    },
  },
}
```

**Opt out to webpack:**

```bash
next dev --webpack
next build --webpack
```

**If you have a custom `webpack` config, builds will FAIL by default.** You must either migrate to Turbopack or use the `--webpack` flag.

**Sass imports:** Remove tilde prefix:

```scss
// WRONG in Turbopack
@import '~bootstrap/dist/css/bootstrap.min.css';

// CORRECT
@import 'bootstrap/dist/css/bootstrap.min.css';
```

### 5. New Cache APIs in Server Actions

```tsx
'use server'
import { updateTag, refresh, revalidateTag } from 'next/cache'

// updateTag -- read-your-writes semantics
export async function updateProfile(userId: string, data: Profile) {
  await db.users.update(userId, data)
  updateTag(`user-${userId}`)  // User sees changes immediately
}

// refresh -- refreshes uncached dynamic data
export async function markAsRead(id: string) {
  await db.notifications.markAsRead(id)
  refresh()
}

// revalidateTag -- now requires cacheLife profile as second argument
export async function publishPost(id: string) {
  await db.posts.publish(id)
  revalidateTag('posts', 'max')  // Built-in profile or { expire: 3600 }
}
```

---

## Configuration Reference

### next.config.ts (Next.js 16)

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Cache Components (replaces experimental.dynamicIO and experimental.ppr)
  cacheComponents: true,

  // React Compiler (was experimental.reactCompiler)
  reactCompiler: true,

  // View Transitions API
  viewTransition: true,

  // Turbopack config (was experimental.turbopack)
  turbopack: {
    resolveAlias: {},
  },

  // Proxy URL normalization (was skipMiddlewareUrlNormalize)
  skipProxyUrlNormalize: false,

  // Images -- updated defaults
  images: {
    // minimumCacheTTL default: 14400 (was 60)
    // imageSizes default no longer includes 16
    // qualities default: [75]
    // maximumRedirects default: 3
    // dangerouslyAllowLocalIP: blocks local IPs by default
  },

  // Turbopack FS cache (stable in 16.1, on by default)
  // experimental: {
  //   turbopackFileSystemCacheForDev: true,
  // },
}

export default nextConfig
```

### Config Migration Table

| Next.js 15 | Next.js 16 |
|-------------|------------|
| `experimental.turbopack: {}` | `turbopack: {}` |
| `experimental.dynamicIO: true` | `cacheComponents: true` |
| `experimental.ppr: true` | `cacheComponents: true` |
| `experimental.reactCompiler: true` | `reactCompiler: true` |
| `skipMiddlewareUrlNormalize` | `skipProxyUrlNormalize` |

---

## React 19.2 Features in Next.js 16

### ViewTransition

Animate elements across navigations:

```ts
// next.config.ts
const nextConfig = { viewTransition: true }
```

```tsx
import { ViewTransition } from 'react'

function ProductCard({ product }) {
  return (
    <ViewTransition name={`product-${product.id}`}>
      <Link href={`/products/${product.id}`}>
        <img src={product.image} />
        <h3>{product.name}</h3>
      </Link>
    </ViewTransition>
  )
}
```

### useEffectEvent

Extract non-reactive logic from Effects:

```tsx
import { useEffect, useEffectEvent } from 'react'

function ChatRoom({ roomId, theme }) {
  const onMessage = useEffectEvent((msg) => {
    showNotification(msg, theme)  // Always reads latest theme
  })

  useEffect(() => {
    const conn = createConnection(roomId)
    conn.on('message', onMessage)
    return () => conn.disconnect()
  }, [roomId])  // No need to include theme or onMessage
}
```

### Activity

Hide UI while preserving state:

```tsx
import { Activity } from 'react'

function TabContainer({ activeTab }) {
  return (
    <>
      <Activity mode={activeTab === 'home' ? 'visible' : 'hidden'}>
        <HomeTab />
      </Activity>
      <Activity mode={activeTab === 'profile' ? 'visible' : 'hidden'}>
        <ProfileTab />
      </Activity>
    </>
  )
}
```

---

## Type Helpers

Generate typed props with `npx next typegen`:

```tsx
// Automatically typed params
export default async function Page(props: PageProps<'/blog/[slug]'>) {
  const { slug } = await props.params
  return <h1>{slug}</h1>
}
```

Available types: `PageProps<Route>`, `LayoutProps`, `RouteContext`

---

## Removed Features

| Removed | Alternative |
|---------|-------------|
| AMP support (`useAmp`, `config.amp`) | Native web standards |
| `next lint` | ESLint or Biome CLI directly |
| `serverRuntimeConfig` / `publicRuntimeConfig` | `.env` files, `NEXT_PUBLIC_` prefix |
| `experimental.ppr` / `export const experimental_ppr` | `cacheComponents: true` |
| `size` / `First Load JS` build metrics | Lighthouse / Vercel Analytics |
| Automatic `scroll-behavior: smooth` | `data-scroll-behavior="smooth"` on `<html>` |

---

## Version Requirements

| Dependency | Minimum Version |
|------------|----------------|
| Node.js | 20.9+ |
| TypeScript | 5.1+ |
| Chrome | 111+ |
| Firefox | 111+ |
| Safari | 16.4+ |
| Edge | 111+ |

---

## Best Practices

### Server vs Client Component Decision

```
Needs async data fetching?         -> Server Component (default)
Needs useState/useEffect?          -> 'use client'
Needs browser APIs (window, etc)?  -> 'use client'
Needs event handlers (onClick)?    -> 'use client'
Static UI with no interactivity?   -> Server Component (default)
```

### Caching Strategy

1. **Default to dynamic** -- don't cache unless you have a reason
2. **Cache at the smallest scope** -- function > component > file
3. **Use `cacheTag` for everything cached** -- enables targeted invalidation
4. **Use `cacheLife` profiles** -- don't rely on default TTLs
5. **Prefer `updateTag` over `revalidateTag`** for user-triggered mutations (read-your-writes)
6. **Use `'use cache: private'`** for user-specific data that needs compliance isolation

### Performance Patterns

1. **Parallel data fetching** -- use `Promise.all()` in Server Components
2. **Streaming with Suspense** -- wrap slow components in `<Suspense>`
3. **Interleaving cached/dynamic** -- cached layout with dynamic children
4. **Turbopack FS cache** -- enabled by default in 16.1, speeds up dev restarts 5-14x
5. **React Compiler** -- enable `reactCompiler: true` to auto-memoize (adds compile time)

### Security Patterns

1. **`server-only` package** -- mark modules that must never reach the client
2. **proxy.ts** -- validate auth/tokens before requests reach your app
3. **Server Actions** -- always validate input server-side, never trust client data
4. **Environment variables** -- use `NEXT_PUBLIC_` only for truly public values
5. **`images.dangerouslyAllowLocalIP`** -- blocked by default in v16, keep it that way

### Project Structure (Recommended)

```
app/
├── layout.tsx                # Root layout (required)
├── page.tsx                  # Home page
├── proxy.ts                  # Request interception (NEW in v16)
├── (auth)/                   # Route group
│   ├── login/page.tsx
│   └── layout.tsx
├── dashboard/
│   ├── page.tsx
│   ├── loading.tsx           # Suspense boundary
│   ├── error.tsx             # Error boundary
│   └── @sidebar/             # Parallel route
│       ├── page.tsx
│       └── default.tsx       # REQUIRED in v16
├── api/
│   └── route.ts
└── _components/              # Private (not routed)
    ├── server/               # Server Components
    └── client/               # 'use client' Components
lib/
├── actions/                  # Server Actions ('use server')
├── cache/                    # Cached functions ('use cache')
└── db/                       # Database access (server-only)
```

---

## Decision Trees

### When to Use `'use cache'`

```
Is the data static or rarely changes?     -> 'use cache' with cacheLife('days') or cacheLife('max')
Does the data change every few minutes?   -> 'use cache' with cacheLife('minutes')
Is the data user-specific but cacheable?  -> 'use cache: private'
Need platform-level cache (Redis, KV)?    -> 'use cache: remote'
Is the data always dynamic?              -> Don't use 'use cache' (default behavior)
```

### When to Use New Cache APIs

```
User needs to see their own write immediately? -> updateTag()
Need to refresh dynamic (uncached) data?       -> refresh()
Need to invalidate cached data by tag?         -> revalidateTag(tag, profile)
```

### Middleware vs Proxy Decision

```
New project?                -> Use proxy.ts
Migrating from Next.js 15? -> Rename middleware.ts to proxy.ts, export proxy()
Need Edge runtime?          -> middleware.ts still works (deprecated)
Need Node.js APIs?          -> proxy.ts (Node.js runtime)
```

---

## File Conventions

| File | Purpose | Status |
|------|---------|--------|
| `proxy.ts` | Request interception (replaces middleware) | **New** |
| `middleware.ts` | Legacy request interception (Edge) | **Deprecated** |
| `default.js` in parallel routes | Fallback for parallel route slots | **Required** (builds fail without it) |

---

## Commands

```bash
# Create new Next.js 16 project
npx create-next-app@latest my-app

# Upgrade from Next.js 15
npx @next/codemod@canary upgrade latest

# Migrate next lint to ESLint CLI
npx @next/codemod@canary next-lint-to-eslint-cli .

# Generate type helpers
npx next typegen

# Dev with Turbopack (default, no flag needed)
next dev

# Dev with webpack (opt-out)
next dev --webpack

# Build (Turbopack default)
next build

# Build with webpack (opt-out)
next build --webpack

# Upgrade (built-in since 16.1)
next upgrade

# Bundle analyzer (16.1+)
next experimental-analyze

# Dev with debugger (16.1+)
next dev --inspect

# Install React Compiler (if using reactCompiler: true)
npm install -D babel-plugin-react-compiler
```

---

## Migration Checklist (Next.js 15 -> 16)

- [ ] Run `npx @next/codemod@canary upgrade latest`
- [ ] Update `next`, `react`, `react-dom` to latest
- [ ] Update `@types/react`, `@types/react-dom`
- [ ] Make ALL request APIs async (`await params`, `await cookies()`, etc.)
- [ ] Rename `middleware.ts` to `proxy.ts`, export `proxy()` instead of `middleware()`
- [ ] Move `experimental.turbopack` to top-level `turbopack`
- [ ] Replace `experimental.dynamicIO` / `experimental.ppr` with `cacheComponents: true`
- [ ] Replace `experimental.reactCompiler` with `reactCompiler: true`
- [ ] Add `default.js` to ALL parallel route slots
- [ ] Update `revalidateTag()` calls to include second argument (cacheLife profile)
- [ ] Replace `serverRuntimeConfig`/`publicRuntimeConfig` with `.env` variables
- [ ] Remove AMP usage if any
- [ ] Replace `next lint` scripts with direct ESLint/Biome calls
- [ ] Remove tilde (`~`) from Sass node_modules imports
- [ ] If custom webpack config exists, add `--webpack` flag or migrate to Turbopack
- [ ] Ensure Node.js >= 20.9, TypeScript >= 5.1
