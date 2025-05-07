'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { noteStyle } from '../notes/note'

interface AuthFormProps {
  isSignup?: boolean
  login: (formData: FormData) => void,
  signup: (formData: FormData) => void
}

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      style={{ ...noteStyle, width: 'unset', height: 'unset', filter: 'hue-rotate(300deg)' }}
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm",
        className
      )}
      {...props}
    />
  )
}


export function AuthForm({ login, signup, isSignup = false }: AuthFormProps) {
  const [isSignUp, setSignUp] = useState(isSignup)
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader style={{ width: '100%', height: '100%' }}>
        <CardTitle>{isSignUp ? 'Create Account' : 'Sign In'}</CardTitle>
        <CardDescription>
          {isSignUp
            ? 'Create a new account to save your notes'
            : 'Sign in to access your notes'}
        </CardDescription>
      </CardHeader>
      <form action={isSignUp ? signup : login}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              name="email"
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <Input
              id="password"
              type="password"
              name="password"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button
            type="submit"
            className="w-full"
          >
            {isSignUp ? 'Sign Up' : 'Sign In'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick = {() => setSignUp(!isSignUp)}
          >
            {isSignUp
              ? 'Already have an account? Sign In'
              : 'Need an account? Sign Up'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
} 