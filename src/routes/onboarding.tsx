import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

export const Route = createFileRoute('/onboarding')({
  validateSearch: z.object({ redirect: z.string().optional() }),
  component: Onboarding,
})

function Onboarding() {
  return (
    <main>
      <h1>Set up your account</h1>
      <p>Not built yet.</p>
    </main>
  )
}
