// Server Component Template
// Use this template for components that fetch data or don't need interactivity

import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ComponentNameProps {
  // Define your props here
  id: string
}

export async function ComponentName({ id }: ComponentNameProps) {
  // Fetch data directly in the component
  const data = await prisma.model.findUnique({
    where: { id },
  })

  // Handle loading/error states
  if (!data) {
    return <div>Not found</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{data.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{data.description}</p>
      </CardContent>
    </Card>
  )
}
