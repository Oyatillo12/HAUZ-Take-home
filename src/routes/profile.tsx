import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/profile')({
  component: Profile,
})

function Profile() {
  return (
    <main>
      <h1>Profile</h1>
      <p>Not built yet.</p>
    </main>
  )
}
