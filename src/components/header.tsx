import {
  Link,
  useLocation,
  useRouteContext,
  useRouter,
} from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useState } from 'react'

import { refreshAuth } from '#/lib/auth'
import { signOut } from '#/server/sign-out'

export function Header() {
  const auth = useRouteContext({ from: '__root__', select: (c) => c.auth })
  const location = useLocation()

  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}
    >
      <Link to="/">HAUZ</Link>

      {auth === null ? (
        <Link to="/sign-in" search={{ redirect: location.pathname }}>
          Sign in
        </Link>
      ) : (
        <span style={{ display: 'flex', gap: '0.75rem', alignItems: 'baseline' }}>
          {auth.account ? (
            <Link to="/profile">{auth.account.firstName}</Link>
          ) : auth.accountUnavailable ? (
            <span>{auth.user.email}</span>
          ) : (
            <Link to="/onboarding" search={{ redirect: location.pathname }}>
              Finish setup
            </Link>
          )}
          <LogOutButton />
        </span>
      )}
    </header>
  )
}

function LogOutButton() {
  const router = useRouter()
  const queryClient = useRouteContext({
    from: '__root__',
    select: (c) => c.queryClient,
  })
  const logOut = useServerFn(signOut)
  const [pending, setPending] = useState(false)

  async function onClick() {
    if (pending) return
    setPending(true)
    try {
      await logOut()
      await refreshAuth(queryClient, router)
      await router.navigate({ to: '/', replace: true })
    } catch (cause) {
      console.error(cause)
    } finally {
      setPending(false)
    }
  }

  return (
    <button type="button" style={{ margin: 0 }} disabled={pending} onClick={onClick}>
      {pending ? 'Logging out...' : 'Log out'}
    </button>
  )
}
