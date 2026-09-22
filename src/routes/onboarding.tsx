import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useState, type FormEvent } from 'react'
import { z } from 'zod'

import { refreshAuth } from '#/lib/auth'
import { ROLES, ROLE_LABELS, type Role } from '#/lib/personal-account'
import { safeRedirect } from '#/lib/redirect'
import { createAccount } from '#/server/account'

export const Route = createFileRoute('/onboarding')({
  validateSearch: z.object({ redirect: z.string().optional() }),
  beforeLoad: ({ context, search }) => {
    const href = safeRedirect(search.redirect)
    if (!context.auth) {
      // Sign-in brings people without an account back here on its own.
      throw redirect({ to: '/sign-in', search: { redirect: href } })
    }
    if (context.auth.account) {
      throw redirect({ href })
    }
  },
  component: Onboarding,
})

function Onboarding() {
  const router = useRouter()
  const { queryClient, auth } = Route.useRouteContext()
  const { redirect: target } = Route.useSearch()
  const create = useServerFn(createAccount)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [role, setRole] = useState<Role | ''>('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (auth?.accountUnavailable) {
    return (
      <main>
        <h1>Set up your account</h1>
        <p role="alert">
          We could not check whether you already have an account. Try again in
          a moment.
        </p>
      </main>
    )
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    // `pending` disables the button, and the Function is idempotent on top
    // of that, so a double submit cannot create two accounts.
    if (pending || role === '') return
    setPending(true)
    setError(null)
    try {
      const result = await create({ data: { firstName, lastName, role } })
      if (!result.ok) {
        setError(result.message)
        return
      }
      await refreshAuth(queryClient, router)
      await router.navigate({ href: safeRedirect(target), replace: true })
    } catch (cause) {
      console.error(cause)
      setError('Something went wrong. Try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <main>
      <h1>Set up your account</h1>
      <p>Tell us who you are. You can change your name later, but not your role.</p>
      <form onSubmit={onSubmit}>
        <label>
          First name
          <input
            name="firstName"
            autoComplete="given-name"
            required
            maxLength={100}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </label>
        <label>
          Last name
          <input
            name="lastName"
            autoComplete="family-name"
            required
            maxLength={100}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </label>
        <label>
          I am a
          <select
            name="role"
            required
            value={role}
            onChange={(e) => setRole(e.target.value as Role | '')}
          >
            <option value="" disabled>
              Choose one
            </option>
            {ROLES.map((value) => (
              <option key={value} value={value}>
                {ROLE_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={pending}>
          {pending ? 'Saving...' : 'Continue'}
        </button>
      </form>
    </main>
  )
}
