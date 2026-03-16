# Component Templates

This directory contains ready-to-use component templates for Next.js 15 applications.

## Available Templates

### 1. Server Component Template (`server-component-template.tsx`)
- **Use for**: Data fetching, non-interactive components
- **Features**: Async/await, direct database access, Prisma integration
- **Key characteristics**: No `'use client'` directive, can be async

### 2. Client Component Template (`client-component-template.tsx`)
- **Use for**: Interactive components with state and event handlers
- **Features**: React hooks (useState, useEffect), event handlers
- **Key characteristics**: `'use client'` directive required

### 3. Form Component Template (`form-component-template.tsx`)
- **Use for**: Forms with validation and submission
- **Features**: React Hook Form, Zod validation, server actions
- **Key characteristics**: Client component with comprehensive form handling

### 4. Layout Component Template (`layout-component-template.tsx`)
- **Use for**: Page layouts and structural components
- **Features**: Multiple layout patterns (standard, grid, dashboard)
- **Key characteristics**: Flexible, reusable layout structures

## How to Use

1. Choose the appropriate template based on your needs
2. Copy the template content to your component file
3. Rename `ComponentName` to your actual component name
4. Update the props interface with your specific requirements
5. Implement your component logic
6. Apply appropriate styling with Tailwind CSS

## Customization Tips

- **Props**: Always define TypeScript interfaces for props
- **Styling**: Use Tailwind CSS classes and shadcn/ui components
- **Validation**: Use Zod for form validation schemas
- **Error Handling**: Add try-catch blocks and toast notifications
- **Accessibility**: shadcn/ui components include ARIA attributes by default

## File Naming Conventions

- PascalCase for component files: `UserProfile.tsx`
- Use descriptive names that reflect the component's purpose
- Group related components in feature directories
