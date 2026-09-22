/**
 * Log out. Ends the Appwrite session if it can, and always drops the cookie:
 * once the cookie is gone this browser is signed out whatever Appwrite says.
 */

import { createServerFn } from '@tanstack/react-start'

import {
  clearSessionCookie,
  readSessionSecret,
  sessionAccount,
} from '#/server/appwrite'

export const signOut = createServerFn({ method: 'POST' }).handler(
  async (): Promise<{ ok: true }> => {
    const secret = readSessionSecret()

    if (secret) {
      try {
        await sessionAccount(secret).deleteSession({ sessionId: 'current' })
      } catch (error) {
        // Already gone, or Appwrite unreachable. The cookie still goes.
        console.warn('deleteSession failed; clearing the cookie anyway.', error)
      }
    }

    clearSessionCookie()
    return { ok: true }
  },
)
