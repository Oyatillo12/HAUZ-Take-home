import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const { auth } = Route.useRouteContext()

  return (
    <main>
      <h1>HAUZ</h1>
      {auth ? (
        <p>You are signed in as {auth.user.email}.</p>
      ) : (
        <p>Sign in to manage your profile.</p>
      )}
    </main>
  )
}
