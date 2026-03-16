# Next.js 15 Component Patterns

## Version Information
- **Next.js**: 15.x (App Router)
- **React**: 19.x
- **Key Features**: Server Components by default, Server Actions, Partial Prerendering

## Server vs Client Components

### Server Components (Default)
Server Components are the default in Next.js 15 App Router. They run only on the server.

**Benefits:**
- Direct database/API access
- Reduced bundle size
- SEO-friendly
- Automatic code splitting

**When to use:**
- Data fetching
- Accessing backend resources
- Rendering static content
- Reducing client-side JavaScript

**Example:**
```tsx
// app/components/UserProfile.tsx
import { prisma } from '@/lib/prisma'

interface UserProfileProps {
  userId: string
}

export async function UserProfile({ userId }: UserProfileProps) {
  // Direct database access
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true }
  })

  if (!user) return <div>User not found</div>

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">{user.name}</h2>
      <p>{user.email}</p>
    </div>
  )
}
```

### Client Components
Must be explicitly marked with `'use client'` directive.

**When to use:**
- Event handlers (onClick, onChange, etc.)
- State management (useState, useReducer)
- Effects (useEffect)
- Browser-only APIs
- Custom hooks
- Interactive features

**Example:**
```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function Counter() {
  const [count, setCount] = useState(0)

  return (
    <div className="space-y-4">
      <p className="text-lg">Count: {count}</p>
      <Button onClick={() => setCount(count + 1)}>
        Increment
      </Button>
    </div>
  )
}
```

## Composition Patterns

### Server-Client Composition
Keep client components as leaf nodes when possible.

**Good Pattern:**
```tsx
// app/dashboard/page.tsx (Server Component)
import { UserStats } from './UserStats'
import { InteractiveChart } from './InteractiveChart'

export default async function DashboardPage() {
  const stats = await fetchUserStats()

  return (
    <div>
      <UserStats data={stats} /> {/* Server Component */}
      <InteractiveChart data={stats} /> {/* Client Component */}
    </div>
  )
}
```

### Passing Server Components to Client Components
Use the `children` prop pattern.

```tsx
// ClientWrapper.tsx
'use client'

export function ClientWrapper({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div className={isOpen ? 'block' : 'hidden'}>
      {children}
    </div>
  )
}

// page.tsx (Server Component)
export default async function Page() {
  const data = await fetchData()

  return (
    <ClientWrapper>
      <ServerComponent data={data} />
    </ClientWrapper>
  )
}
```

## Data Fetching Patterns

### Async Server Components
```tsx
// Fetch data directly in component
export async function ProductList() {
  const products = await prisma.product.findMany()

  return (
    <div className="grid grid-cols-3 gap-4">
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
```

### Parallel Data Fetching
```tsx
export default async function Page() {
  // Fetch in parallel
  const [user, posts, comments] = await Promise.all([
    fetchUser(),
    fetchPosts(),
    fetchComments()
  ])

  return <Dashboard user={user} posts={posts} comments={comments} />
}
```

### Sequential Data Fetching
```tsx
export default async function Page({ params }: { params: { id: string } }) {
  // Fetch sequentially when dependent
  const user = await fetchUser(params.id)
  const posts = await fetchUserPosts(user.id)

  return <UserProfile user={user} posts={posts} />
}
```

## Server Actions

### Form Handling with Server Actions
```tsx
// actions/user.ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function updateUser(formData: FormData) {
  const name = formData.get('name') as string

  await prisma.user.update({
    where: { id: 'user-id' },
    data: { name }
  })

  revalidatePath('/profile')
  redirect('/profile')
}

// components/UserForm.tsx
import { updateUser } from '@/actions/user'

export function UserForm() {
  return (
    <form action={updateUser}>
      <input name="name" type="text" />
      <button type="submit">Update</button>
    </form>
  )
}
```

### Progressive Enhancement with useFormStatus
```tsx
'use client'

import { useFormStatus } from 'react-dom'

export function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Saving...' : 'Save'}
    </button>
  )
}
```

## Loading States

### Streaming with Suspense
```tsx
import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

export default function Page() {
  return (
    <div>
      <h1>Dashboard</h1>
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <SlowComponent />
      </Suspense>
    </div>
  )
}
```

### Loading.tsx Convention
```tsx
// app/dashboard/loading.tsx
export default function Loading() {
  return <div className="animate-pulse">Loading dashboard...</div>
}
```

## Error Handling

### Error Boundaries
```tsx
// app/dashboard/error.tsx
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
      <p className="mb-4">{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  )
}
```

## TypeScript Patterns

### Component Props with Types
```tsx
interface UserCardProps {
  user: {
    id: string
    name: string
    email: string
  }
  onEdit?: () => void
  className?: string
}

export function UserCard({ user, onEdit, className }: UserCardProps) {
  return (
    <div className={className}>
      <h3>{user.name}</h3>
      {onEdit && <button onClick={onEdit}>Edit</button>}
    </div>
  )
}
```

### Async Component Types
```tsx
interface PageProps {
  params: { id: string }
  searchParams: { [key: string]: string | string[] | undefined }
}

export default async function Page({ params, searchParams }: PageProps) {
  const data = await fetchData(params.id)
  return <div>{data.title}</div>
}
```

## Performance Optimization

### Dynamic Imports
```tsx
import dynamic from 'next/dynamic'

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Skeleton />,
  ssr: false // Disable SSR if needed
})
```

### Memoization in Client Components
```tsx
'use client'

import { useMemo, useCallback } from 'react'

export function DataTable({ data }: { data: any[] }) {
  const sortedData = useMemo(() => {
    return data.sort((a, b) => a.name.localeCompare(b.name))
  }, [data])

  const handleClick = useCallback(() => {
    console.log('clicked')
  }, [])

  return <div>...</div>
}
```

## File Organization

### Component Structure
```
components/
├── feature-name/
│   ├── FeatureComponent.tsx (Client/Server)
│   ├── FeatureForm.tsx (Client)
│   ├── FeatureCard.tsx (Server)
│   └── index.ts (exports)
└── ui/
    ├── button.tsx
    ├── card.tsx
    └── dialog.tsx
```

### Colocation
- Keep components close to where they're used
- Use `_components` folder in app directory for route-specific components
- Extract to shared `/components` when reused across routes
