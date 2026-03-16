---
name: nextjs-ui-builder
description: Build UI components with Next.js 15 best practices, including Server/Client component patterns, Radix UI, shadcn/ui, Tailwind CSS 4, forms with React Hook Form + Zod, and proper TypeScript typing. Automatically checks Next.js version and applies appropriate patterns.
---

# Next.js UI Component Builder

Build production-ready UI components following Next.js 15 App Router best practices with proper Server/Client component separation, shadcn/ui components, Tailwind CSS 4 styling, and full TypeScript support.

## When to Use This Skill

Use this skill when:
- Building new UI components for Next.js applications
- Refactoring components to follow Next.js 15 patterns
- Creating forms with validation and server actions
- Implementing interactive features with proper client/server boundaries
- Setting up accessible components with Radix UI and shadcn/ui
- Ensuring TypeScript type safety in components

## How to Use This Skill

### Step 1: Check Next.js Version

Before building components, verify the Next.js version to ensure patterns align with the installed version:

```bash
npm list next
# or
pnpm list next
```

If Next.js 15+ is detected, use App Router patterns (default). For older versions, adapt patterns accordingly.

### Step 2: Determine Component Type

Identify whether the component should be a Server Component or Client Component:

**Server Component (default)** if:
- Fetching data from database/API
- Accessing backend resources directly
- No interactivity needed
- Can be async

**Client Component (`'use client'`)** if:
- Uses React hooks (useState, useEffect, etc.)
- Has event handlers (onClick, onChange, etc.)
- Uses browser-only APIs
- Needs interactivity

### Step 3: Choose the Right Pattern

Reference the appropriate pattern from bundled references:

- **Server/Client patterns**: See `references/nextjs-15-patterns.md`
  - Async server components
  - Client component with hooks
  - Server-client composition
  - Server actions for forms
  - Loading and error states

- **UI component patterns**: See `references/radix-ui-shadcn-patterns.md`
  - shadcn/ui components (Button, Dialog, Form, etc.)
  - Form validation with React Hook Form + Zod
  - Accessible component composition
  - Controlled vs uncontrolled components

- **Styling patterns**: See `references/tailwind-css-patterns.md`
  - Responsive design (mobile-first)
  - Layout patterns (flexbox, grid)
  - Typography and spacing
  - Dark mode with CSS variables
  - Interactive states and animations

### Step 4: Component Structure

Follow this structure when creating components:

```tsx
// 1. Imports
import { ComponentDependencies } from '@/components/ui/...'
import { ServerAction } from '@/actions/...'

// 2. TypeScript interface for props
interface ComponentProps {
  // Define props with proper types
}

// 3. Component definition
export function ComponentName({ props }: ComponentProps) {
  // 4. Component logic

  // 5. Return JSX
  return (
    <div>
      {/* Component content */}
    </div>
  )
}
```

For client components, add `'use client'` at the top:

```tsx
'use client'

import { useState } from 'react'
// ... rest of imports
```

### Step 5: Apply Best Practices

When building components, ensure:

1. **Type Safety**: All props and state have TypeScript types
2. **Accessibility**: Use semantic HTML and ARIA attributes (Radix UI provides this)
3. **Responsive Design**: Mobile-first with Tailwind breakpoints
4. **Performance**:
   - Keep client components as leaf nodes
   - Use dynamic imports for heavy components
   - Memoize expensive computations
5. **Error Handling**: Implement error boundaries and loading states
6. **Validation**: Use Zod schemas for form validation

### Step 6: Component Organization

Place components following this structure:

```
components/
├── feature-name/           # Feature-specific components
│   ├── FeatureForm.tsx    # Client component
│   ├── FeatureCard.tsx    # Server component
│   └── index.ts           # Exports
└── ui/                     # shadcn/ui components
    ├── button.tsx
    ├── dialog.tsx
    └── form.tsx
```

For route-specific components:
```
app/
└── dashboard/
    ├── _components/        # Components only used in dashboard
    │   └── StatCard.tsx
    └── page.tsx
```

## Common Component Patterns

### Pattern 1: Server Component with Data Fetching

```tsx
// app/components/UserProfile.tsx
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface UserProfileProps {
  userId: string
}

export async function UserProfile({ userId }: UserProfileProps) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) return <div>User not found</div>

  return (
    <Card>
      <CardHeader>
        <CardTitle>{user.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{user.email}</p>
      </CardContent>
    </Card>
  )
}
```

### Pattern 2: Client Component with State

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export function Counter() {
  const [count, setCount] = useState(0)

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <p className="text-2xl font-bold">{count}</p>
          <Button onClick={() => setCount(count + 1)}>
            Increment
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
```

### Pattern 3: Form with Validation and Server Action

```tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createUser } from '@/actions/user'
import { useToast } from '@/components/ui/use-toast'

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
})

export function CreateUserForm() {
  const { toast } = useToast()
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', email: '' },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await createUser(values)
      toast({ title: 'User created successfully' })
      form.reset()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create user',
        variant: 'destructive'
      })
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="john@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Creating...' : 'Create User'}
        </Button>
      </form>
    </Form>
  )
}
```

### Pattern 4: Composition (Server Component as Children of Client)

```tsx
// ClientWrapper.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function ClientWrapper({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div>
      <Button onClick={() => setIsOpen(!isOpen)}>
        Toggle Content
      </Button>
      {isOpen && children}
    </div>
  )
}

// page.tsx (Server Component)
import { ClientWrapper } from './ClientWrapper'
import { ServerComponent } from './ServerComponent'

export default async function Page() {
  const data = await fetchData()

  return (
    <ClientWrapper>
      <ServerComponent data={data} />
    </ClientWrapper>
  )
}
```

## Detailed References

For comprehensive patterns and examples:

- **Next.js 15 Patterns**: `references/nextjs-15-patterns.md`
  - Server vs Client components
  - Data fetching patterns
  - Server actions
  - Loading and error states
  - Performance optimization

- **Radix UI & shadcn/ui**: `references/radix-ui-shadcn-patterns.md`
  - All shadcn/ui components with examples
  - Form handling with React Hook Form + Zod
  - Accessibility best practices
  - Theming with CSS variables

- **Tailwind CSS 4**: `references/tailwind-css-patterns.md`
  - Responsive design patterns
  - Layout techniques (flexbox, grid)
  - Typography and spacing
  - Dark mode implementation
  - Animations and transitions

## Troubleshooting

### Common Issues

**Issue**: "Cannot use useState in Server Component"
- **Solution**: Add `'use client'` directive at the top of the file

**Issue**: "Cannot use async in Client Component"
- **Solution**: Move data fetching to Server Component or use React Query

**Issue**: "Hydration mismatch"
- **Solution**: Ensure Server and Client components render the same initial HTML

**Issue**: "Component not updating"
- **Solution**: Check if props are properly typed and component is receiving updates

## Workflow Summary

1. Check Next.js version
2. Determine Server vs Client component
3. Choose appropriate pattern from references
4. Create component with proper TypeScript types
5. Apply Tailwind CSS styling with responsive design
6. Use shadcn/ui components for UI primitives
7. Add validation for forms (Zod + React Hook Form)
8. Test component in context
9. Ensure accessibility and performance

Build components that are type-safe, accessible, performant, and follow Next.js 15 best practices.
