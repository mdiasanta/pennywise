import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Pennywise</CardTitle>
          <CardDescription>
            Personal finance application for expense tracking
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Frontend: React + TypeScript + Vite + shadcn/ui
            </p>
            <p className="text-sm text-muted-foreground">
              Backend: .NET 10 Web API
            </p>
            <p className="text-sm text-muted-foreground">
              Database: PostgreSQL 16
            </p>
            
            <div className="flex flex-col items-center space-y-2 pt-4">
              <Button onClick={() => setCount((count) => count + 1)}>
                Count is {count}
              </Button>
              <p className="text-xs text-muted-foreground">
                Click the button to test React state
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default App
