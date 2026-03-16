'use client'

// Client Component Template
// Use this template for interactive components with state and event handlers

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ComponentNameProps {
  // Define your props here
  initialValue?: number
}

export function ComponentName({ initialValue = 0 }: ComponentNameProps) {
  // State management
  const [value, setValue] = useState(initialValue)

  // Event handlers
  const handleIncrement = () => {
    setValue(prev => prev + 1)
  }

  const handleDecrement = () => {
    setValue(prev => prev - 1)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Component Title</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <Button onClick={handleDecrement} variant="outline">
            -
          </Button>
          <span className="text-2xl font-bold">{value}</span>
          <Button onClick={handleIncrement}>
            +
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
