import { Link, useLocation, useRouteContext } from '@tanstack/react-router'

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
        </span>
      )}
    </header>
  )
}
