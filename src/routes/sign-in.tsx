import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useState, type FormEvent } from 'react'
import { z } from 'zod'

import { AUTH_QUERY_KEY, refreshAuth, type AuthState } from '#/lib/auth'
import { safeRedirect } from '#/lib/redirect'
import { requestCode, verifyCode } from '#/server/sign-in'

export const Route = createFileRoute('/sign-in')({
  validateSearch: z.object({ redirect: z.string().optional() }),
  beforeLoad: ({ context, search }) => {
    // Already signed in: nothing to do here.
    if (context.auth) {
      throw redirect({ href: safeRedirect(search.redirect) })
    }
  },
  component: SignIn,
})

type Step = { name: 'email' } | { name: 'code'; email: string; userId: string }

function SignIn() {
  const router = useRouter()
  const { queryClient } = Route.useRouteContext()
  const { redirect: target } = Route.useSearch()

  const sendCode = useServerFn(requestCode)
  const checkCode = useServerFn(verifyCode)

  const [step, setStep] = useState<Step>({ name: 'email' })
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onRequestCode(event?: FormEvent) {
    event?.preventDefault()
    setPending(true)
    setError(null)
    try {
      const result = await sendCode({ data: { email } })
      if (result.ok) {
        setStep({ name: 'code', email, userId: result.userId })
        setCode('')
      } else {
        setError(result.message)
      }
    } finally {
      setPending(false)
    }
  }

  async function onVerifyCode(event: FormEvent) {
    event.preventDefault()
    if (step.name !== 'code') return
    setPending(true)
    setError(null)
    try {
      const result = await checkCode({ data: { userId: step.userId, code } })
      if (!result.ok) {
        setError(result.message)
        return
      }
      // The cookie is set. Reload who we are, then decide where to go.
      await refreshAuth(queryClient, router)
      const auth = queryClient.getQueryData<AuthState>(AUTH_QUERY_KEY)
      const href = safeRedirect(target)
      if (auth?.account) {
        await router.navigate({ href, replace: true })
      } else {
        await router.navigate({
          to: '/onboarding',
          search: { redirect: href },
          replace: true,
        })
      }
    } finally {
      setPending(false)
    }
  }

  if (step.name === 'email') {
    return (
      <main>
        <h1>Sign in</h1>
        <p>Enter your email and we will send you a one-time code.</p>
        <form onSubmit={onRequestCode}>
          <label>
            Email
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          {error && <p role="alert">{error}</p>}
          <button type="submit" disabled={pending}>
            {pending ? 'Sending...' : 'Send code'}
          </button>
        </form>
      </main>
    )
  }

  return (
    <main>
      <h1>Check your email</h1>
      <p>
        We sent a code to <strong>{step.email}</strong>. It expires in 15
        minutes. Check your spam folder if it does not arrive.
      </p>
      <form onSubmit={onVerifyCode}>
        <label>
          Code
          <input
            type="text"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={pending}>
          {pending ? 'Checking...' : 'Continue'}
        </button>
      </form>
      <p>
        <button type="button" disabled={pending} onClick={() => onRequestCode()}>
          Send a new code
        </button>{' '}
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setStep({ name: 'email' })
            setError(null)
          }}
        >
          Use a different email
        </button>
      </p>
    </main>
  )
}
