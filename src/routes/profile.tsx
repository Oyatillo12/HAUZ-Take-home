import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useState, type FormEvent } from 'react'

import { refreshAuth } from '#/lib/auth'
import { ROLE_LABELS, type PersonalAccount } from '#/lib/personal-account'
import { buildProfilePatch, toForm } from '#/lib/profile-patch'
import { updateAccount } from '#/server/account'

const HERE = '/profile'

export const Route = createFileRoute('/profile')({
  beforeLoad: ({ context }) => {
    if (!context.auth) {
      // Sign in, then come straight back here.
      throw redirect({ to: '/sign-in', search: { redirect: HERE } })
    }
    if (!context.auth.account && !context.auth.accountUnavailable) {
      throw redirect({ to: '/onboarding', search: { redirect: HERE } })
    }
  },
  component: Profile,
})

function Profile() {
  const { auth } = Route.useRouteContext()

  if (!auth?.account) {
    return (
      <main>
        <h1>Profile</h1>
        <p role="alert">We could not load your profile. Try again in a moment.</p>
      </main>
    )
  }

  return <ProfileForm key={auth.account.id} initial={auth.account} />
}

function ProfileForm({ initial }: { initial: PersonalAccount }) {
  const router = useRouter()
  const { queryClient } = Route.useRouteContext()
  const update = useServerFn(updateAccount)

  // `saved` is what the Function last confirmed; the form diffs against it.
  const [saved, setSaved] = useState(initial)
  const [form, setForm] = useState(() => toForm(initial))
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
    setNotice(null)
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (pending) return
    setError(null)
    setNotice(null)

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('First name and last name are required.')
      return
    }

    const patch = buildProfilePatch(saved, form)
    if (Object.keys(patch).length === 0) {
      setNotice('Nothing changed.')
      return
    }

    setPending(true)
    try {
      const result = await update({ data: patch })
      if (!result.ok) {
        setError(result.message)
        return
      }
      setSaved(result.account)
      setForm(toForm(result.account))
      setNotice('Saved.')
      // The header shows the first name; keep it in step.
      await refreshAuth(queryClient, router)
    } catch (cause) {
      console.error(cause)
      setError('Something went wrong. Try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <main>
      <h1>Profile</h1>
      <p>
        Role: {ROLE_LABELS[saved.role]} (cannot be changed)
      </p>
      <form onSubmit={onSubmit}>
        <label>
          First name
          <input
            name="firstName"
            autoComplete="given-name"
            required
            maxLength={100}
            value={form.firstName}
            onChange={(e) => set('firstName', e.target.value)}
          />
        </label>
        <label>
          Last name
          <input
            name="lastName"
            autoComplete="family-name"
            required
            maxLength={100}
            value={form.lastName}
            onChange={(e) => set('lastName', e.target.value)}
          />
        </label>
        <label>
          Contact email (optional)
          <input
            type="email"
            name="contactEmail"
            autoComplete="email"
            maxLength={254}
            value={form.contactEmail}
            onChange={(e) => set('contactEmail', e.target.value)}
          />
        </label>
        <label>
          Bio (optional)
          <textarea
            name="bio"
            rows={4}
            maxLength={2000}
            value={form.bio}
            onChange={(e) => set('bio', e.target.value)}
          />
        </label>
        {error && <p role="alert">{error}</p>}
        {notice && <p role="status">{notice}</p>}
        <button type="submit" disabled={pending}>
          {pending ? 'Saving...' : 'Save'}
        </button>
      </form>
    </main>
  )
}
