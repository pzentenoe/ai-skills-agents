# Tailwind CSS 4 Patterns

## Version Information
- **Tailwind CSS**: 4.x
- **Configuration**: CSS-based configuration (not tailwind.config.js)
- **Features**: Native cascade layers, container queries, improved performance

## Responsive Design

### Mobile-First Approach
```tsx
// Default: mobile, then scale up
<div className="text-sm md:text-base lg:text-lg xl:text-xl">
  Responsive text
</div>

<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {items.map(item => <Card key={item.id} />)}
</div>
```

### Breakpoints
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

## Layout Patterns

### Flexbox Layouts
```tsx
// Horizontal centering
<div className="flex justify-center items-center">
  <Content />
</div>

// Space between items
<div className="flex justify-between items-center">
  <Left />
  <Right />
</div>

// Vertical stack with spacing
<div className="flex flex-col gap-4">
  <Item1 />
  <Item2 />
  <Item3 />
</div>
```

### Grid Layouts
```tsx
// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {items.map(item => <Card key={item.id} />)}
</div>

// Auto-fit grid (fills available space)
<div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4">
  {items.map(item => <Card key={item.id} />)}
</div>

// Fixed sidebar layout
<div className="grid grid-cols-[250px_1fr] gap-6">
  <Sidebar />
  <Main />
</div>
```

### Container Queries (Tailwind 4)
```tsx
// Container with query
<div className="@container">
  <div className="@md:grid-cols-2 @lg:grid-cols-3">
    {/* Responds to container size, not viewport */}
  </div>
</div>
```

## Spacing & Sizing

### Consistent Spacing
```tsx
// Use spacing scale (4px increments)
<div className="space-y-4">   {/* 16px vertical gap */}
  <div className="p-6">       {/* 24px padding */}
    <h2 className="mb-2">Title</h2>  {/* 8px margin-bottom */}
    <p>Content</p>
  </div>
</div>

// Common patterns
<div className="p-4 md:p-6 lg:p-8">  {/* Responsive padding */}
<div className="mx-auto max-w-7xl px-4">  {/* Centered container */}
```

### Width & Height
```tsx
// Fixed sizes
<div className="w-64 h-32">  {/* 256px x 128px */}

// Responsive sizes
<div className="w-full md:w-1/2 lg:w-1/3">

// Min/max constraints
<div className="min-h-screen max-w-4xl mx-auto">
```

## Typography

### Text Styling
```tsx
// Headings
<h1 className="text-4xl font-bold tracking-tight">Main Title</h1>
<h2 className="text-3xl font-semibold">Subtitle</h2>
<h3 className="text-2xl font-medium">Section</h3>

// Body text
<p className="text-base leading-relaxed text-gray-700 dark:text-gray-300">
  Paragraph content
</p>

// Small text
<span className="text-sm text-muted-foreground">Helper text</span>
```

### Text Utilities
```tsx
// Truncate
<p className="truncate">Long text that will be truncated...</p>

// Line clamp
<p className="line-clamp-3">Text limited to 3 lines...</p>

// Text alignment
<p className="text-left md:text-center lg:text-right">Responsive alignment</p>
```

## Colors & Theming

### Using CSS Variables (Tailwind 4 + shadcn/ui)
```tsx
// Background colors
<div className="bg-background">
<div className="bg-card">
<div className="bg-primary">
<div className="bg-secondary">
<div className="bg-muted">

// Text colors
<p className="text-foreground">
<p className="text-primary">
<p className="text-muted-foreground">
<p className="text-destructive">

// Border colors
<div className="border border-border">
<div className="border border-input">
```

### Dark Mode
```tsx
// Light/dark variants
<div className="bg-white dark:bg-gray-900">
  <p className="text-gray-900 dark:text-white">
    Text adapts to theme
  </p>
</div>

// Using theme variables (preferred with shadcn)
<div className="bg-background text-foreground">
  Automatically adapts
</div>
```

## Interactive States

### Hover & Focus
```tsx
// Button states
<button className="
  bg-primary text-primary-foreground
  hover:bg-primary/90
  focus:ring-2 focus:ring-ring focus:ring-offset-2
  active:scale-95
  transition-all
">
  Interactive Button
</button>

// Link states
<a className="
  text-primary underline-offset-4
  hover:underline
  focus-visible:outline-none focus-visible:ring-2
">
  Link
</a>
```

### Disabled States
```tsx
<button className="
  disabled:opacity-50
  disabled:cursor-not-allowed
  disabled:pointer-events-none
">
  Submit
</button>
```

## Animations & Transitions

### Transitions
```tsx
// Smooth transitions
<div className="transition-all duration-300 ease-in-out">
  <div className="opacity-0 hover:opacity-100 transition-opacity">
    Fade in
  </div>
</div>

// Transform transitions
<div className="transform hover:scale-105 transition-transform">
  Scale on hover
</div>
```

### Animations
```tsx
// Built-in animations
<div className="animate-spin">Loading...</div>
<div className="animate-pulse">Skeleton</div>
<div className="animate-bounce">Attention</div>

// Custom animations in globals.css
@keyframes slideIn {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}

.animate-slide-in {
  animation: slideIn 0.3s ease-out;
}
```

## Common Component Patterns

### Card Component
```tsx
<div className="
  rounded-lg border bg-card text-card-foreground
  shadow-sm hover:shadow-md transition-shadow
  p-6
">
  <h3 className="font-semibold text-lg mb-2">Card Title</h3>
  <p className="text-sm text-muted-foreground">Card description</p>
</div>
```

### Button Variants
```tsx
// Primary
<button className="
  bg-primary text-primary-foreground
  hover:bg-primary/90
  px-4 py-2 rounded-md
  font-medium text-sm
  transition-colors
">
  Primary
</button>

// Outline
<button className="
  border border-input bg-background
  hover:bg-accent hover:text-accent-foreground
  px-4 py-2 rounded-md
">
  Outline
</button>

// Ghost
<button className="
  hover:bg-accent hover:text-accent-foreground
  px-4 py-2 rounded-md
">
  Ghost
</button>
```

### Input Fields
```tsx
<input className="
  flex h-10 w-full
  rounded-md border border-input
  bg-background px-3 py-2
  text-sm ring-offset-background
  file:border-0 file:bg-transparent file:text-sm file:font-medium
  placeholder:text-muted-foreground
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
  disabled:cursor-not-allowed disabled:opacity-50
" />
```

### Badge Component
```tsx
<span className="
  inline-flex items-center
  rounded-full px-2.5 py-0.5
  text-xs font-semibold
  bg-primary/10 text-primary
">
  Badge
</span>
```

## Utility Patterns

### Centering
```tsx
// Flexbox centering
<div className="flex items-center justify-center min-h-screen">
  <Content />
</div>

// Grid centering
<div className="grid place-items-center min-h-screen">
  <Content />
</div>
```

### Aspect Ratios
```tsx
// Fixed aspect ratios
<div className="aspect-square">Square</div>
<div className="aspect-video">16:9 Video</div>
<div className="aspect-[4/3]">Custom 4:3</div>
```

### Truncation & Overflow
```tsx
// Text truncation
<p className="truncate">Single line truncate</p>
<p className="line-clamp-2">Multi-line clamp</p>

// Scroll containers
<div className="overflow-auto max-h-96">
  <LongContent />
</div>
```

## Performance Best Practices

1. **Use arbitrary values sparingly** - Prefer Tailwind's scale
2. **Avoid deep nesting** - Extract components instead
3. **Use CSS variables** for theming - Better than inline colors
4. **Leverage @apply judiciously** - Mostly in base components
5. **Purge unused styles** - Configured by default in Tailwind 4

## Common Patterns

### Full-width sections with constrained content
```tsx
<section className="w-full bg-muted">
  <div className="container mx-auto max-w-7xl px-4 py-16">
    <Content />
  </div>
</section>
```

### Sticky headers
```tsx
<header className="sticky top-0 z-50 bg-background/95 backdrop-blur">
  <nav className="container mx-auto px-4 py-4">
    <Navigation />
  </nav>
</header>
```

### Split layouts
```tsx
<div className="grid lg:grid-cols-2 gap-8">
  <div className="space-y-6">
    <Form />
  </div>
  <div className="space-y-6">
    <Preview />
  </div>
</div>
```