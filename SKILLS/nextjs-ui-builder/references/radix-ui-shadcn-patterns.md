# Radix UI & shadcn/ui Patterns

## Overview
- **Radix UI**: Unstyled, accessible component primitives
- **shadcn/ui**: Pre-styled components built on Radix UI
- **Styling**: Tailwind CSS with CSS variables for theming

## Component Composition Philosophy

### Radix UI Primitives
Radix provides unstyled, accessible primitives. shadcn/ui wraps these with Tailwind styling.

**Key Principles:**
- Accessibility built-in (ARIA, keyboard navigation)
- Unstyled by default (full styling control)
- Composable parts (complete control over structure)
- Controlled and uncontrolled modes

## Common shadcn/ui Patterns

### Button Component
```tsx
import { Button } from '@/components/ui/button'

// Variants: default, destructive, outline, secondary, ghost, link
// Sizes: default, sm, lg, icon

export function ButtonExamples() {
  return (
    <div className="space-x-2">
      <Button variant="default">Default</Button>
      <Button variant="destructive">Delete</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button size="sm">Small</Button>
      <Button size="lg">Large</Button>
      <Button size="icon">
        <Icon />
      </Button>
    </div>
  )
}
```

### Dialog Component
```tsx
'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export function DialogExample() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open Dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you sure?</DialogTitle>
          <DialogDescription>
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Dialog content */}
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

### Form with React Hook Form + Zod
```tsx
'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const formSchema = z.object({
  username: z.string().min(2).max(50),
  email: z.string().email(),
})

export function ProfileForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      email: '',
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="shadcn" {...field} />
              </FormControl>
              <FormDescription>
                This is your public display name.
              </FormDescription>
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
                <Input type="email" placeholder="you@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  )
}
```

### Dropdown Menu
```tsx
'use client'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

export function DropdownExample() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Open Menu</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Profile</DropdownMenuItem>
        <DropdownMenuItem>Settings</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Logout</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

### Select Component
```tsx
'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function SelectExample() {
  return (
    <Select>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select a fruit" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="apple">Apple</SelectItem>
        <SelectItem value="banana">Banana</SelectItem>
        <SelectItem value="orange">Orange</SelectItem>
      </SelectContent>
    </Select>
  )
}
```

### Card Component
```tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function CardExample() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description goes here.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Card content goes here.</p>
      </CardContent>
      <CardFooter>
        <Button>Action</Button>
      </CardFooter>
    </Card>
  )
}
```

### Tabs Component
```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function TabsExample() {
  return (
    <Tabs defaultValue="account" className="w-[400px]">
      <TabsList>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
      </TabsList>
      <TabsContent value="account">
        <p>Account settings content</p>
      </TabsContent>
      <TabsContent value="password">
        <p>Password settings content</p>
      </TabsContent>
    </Tabs>
  )
}
```

### Toast Notifications
```tsx
'use client'

import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'

export function ToastExample() {
  const { toast } = useToast()

  return (
    <Button
      onClick={() => {
        toast({
          title: 'Success',
          description: 'Your changes have been saved.',
        })
      }}
    >
      Show Toast
    </Button>
  )
}
```

### Sheet (Slide-over)
```tsx
'use client'

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

export function SheetExample() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button>Open Sheet</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Sheet Title</SheetTitle>
          <SheetDescription>
            Sheet description goes here.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 py-4">
          {/* Sheet content */}
        </div>
      </SheetContent>
    </Sheet>
  )
}
```

## Advanced Patterns

### Controlled Components
```tsx
'use client'

import { useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'

export function ControlledDialog() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <p>Controlled dialog content</p>
      </DialogContent>
    </Dialog>
  )
}
```

### Form with Server Actions
```tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createUser } from '@/actions/user'
import { useToast } from '@/components/ui/use-toast'

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
})

export function UserForm() {
  const { toast } = useToast()
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '' },
  })

  async function onSubmit(values: z.infer<typeof schema>) {
    try {
      await createUser(values)
      toast({ title: 'User created successfully' })
      form.reset()
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create user', variant: 'destructive' })
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Form fields */}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Creating...' : 'Create User'}
        </Button>
      </form>
    </Form>
  )
}
```

### Combobox (Autocomplete)
```tsx
'use client'

import { useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

const frameworks = [
  { value: 'next', label: 'Next.js' },
  { value: 'react', label: 'React' },
  { value: 'vue', label: 'Vue' },
]

export function ComboboxDemo() {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-[200px] justify-between">
          {value
            ? frameworks.find((framework) => framework.value === value)?.label
            : 'Select framework...'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search framework..." />
          <CommandEmpty>No framework found.</CommandEmpty>
          <CommandGroup>
            {frameworks.map((framework) => (
              <CommandItem
                key={framework.value}
                value={framework.value}
                onSelect={(currentValue) => {
                  setValue(currentValue === value ? '' : currentValue)
                  setOpen(false)
                }}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    value === framework.value ? 'opacity-100' : 'opacity-0'
                  )}
                />
                {framework.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
```

## Theming with CSS Variables

### Theme Configuration
```tsx
// app/layout.tsx
import { ThemeProvider } from 'next-themes'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

### Using Theme
```tsx
'use client'

import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <Button
      variant="outline"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      Toggle Theme
    </Button>
  )
}
```

## Accessibility Best Practices

1. **Always use asChild prop** when wrapping components
2. **Provide aria-labels** for icon-only buttons
3. **Use FormDescription** for additional context
4. **Test keyboard navigation** (Tab, Enter, Escape)
5. **Ensure color contrast** meets WCAG standards
6. **Use semantic HTML** within component composition

## Common Pitfalls

1. **Don't forget 'use client'** for interactive Radix components
2. **Use asChild** to avoid DOM nesting issues
3. **Don't override Radix's accessibility props**
4. **Control state properly** when using controlled mode
5. **Import from @/components/ui**, not from @radix-ui directly
