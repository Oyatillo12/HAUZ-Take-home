import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

export const Route = createFileRoute('/sign-in')({
  validateSearch: z.object({ redirect: z.string().optional() }),
  component: SignIn,
})

function SignIn() {
  return (
    <main>
      <h1>Sign in</h1>
      <p>Not built yet.</p>
    </main>
  )
}
