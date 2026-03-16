// Layout Component Template
// Use this template for page layouts with consistent structure

import { ReactNode } from 'react'

interface LayoutComponentNameProps {
  children: ReactNode
  sidebar?: ReactNode
  header?: ReactNode
  footer?: ReactNode
}

export function LayoutComponentName({
  children,
  sidebar,
  header,
  footer
}: LayoutComponentNameProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      {header && (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center">
            {header}
          </div>
        </header>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex">
        {/* Sidebar */}
        {sidebar && (
          <aside className="hidden md:flex w-64 flex-col border-r bg-muted/40">
            <div className="flex-1 overflow-auto p-6">
              {sidebar}
            </div>
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="container py-6 md:py-10">
            {children}
          </div>
        </main>
      </div>

      {/* Footer */}
      {footer && (
        <footer className="border-t bg-muted/40">
          <div className="container py-6">
            {footer}
          </div>
        </footer>
      )}
    </div>
  )
}

// Alternative: Grid Layout Template
export function GridLayoutComponentName({
  children,
  sidebar,
}: {
  children: ReactNode
  sidebar?: ReactNode
}) {
  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-[250px_1fr] gap-6 p-6">
      {/* Sidebar */}
      {sidebar && (
        <aside className="hidden md:block">
          <div className="sticky top-6">
            {sidebar}
          </div>
        </aside>
      )}

      {/* Main Content */}
      <main>{children}</main>
    </div>
  )
}

// Alternative: Dashboard Layout Template
export function DashboardLayoutComponentName({
  children,
  navigation,
}: {
  children: ReactNode
  navigation?: ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar Navigation */}
      {navigation && (
        <aside className="hidden md:flex w-64 flex-col border-r">
          <div className="flex h-14 items-center border-b px-6">
            <h2 className="text-lg font-semibold">Dashboard</h2>
          </div>
          <nav className="flex-1 overflow-auto p-4">
            {navigation}
          </nav>
        </aside>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        <main className="flex-1 overflow-auto p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
