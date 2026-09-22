/**
 * Who is making this request?
 *
 * Runs only on the server. Reads the session cookie, asks Appwrite who the
 * session belongs to, and returns a small, browser-safe view of the answer.
 * The session secret never leaves this module.
 */

import { createServerFn } from '@tanstack/react-start'
import { AppwriteException } from 'node-appwrite'

import type { PersonalAccount } from '#/lib/personal-account'
import {
  clearSessionCookie,
  readSessionSecret,
  sessionAccount,
} from '#/server/appwrite'

export interface AuthUser {
  id: string
  email: string
}

export interface SignedIn {
  user: AuthUser
  account: PersonalAccount | null
}

export type AuthState = SignedIn | null

/**
 * The session is gone or the user no longer exists. Anything else (network,
 * 5xx, rate limit) is Appwrite having a bad moment, not proof the person is
 * signed out, so the cookie is kept in those cases.
 */
function isSessionInvalid(error: unknown): boolean {
  return (
    error instanceof AppwriteException &&
    (error.code === 401 || error.code === 403 || error.code === 404)
  )
}

export const getAuth = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AuthState> => {
    const secret = readSessionSecret()
    if (!secret) {
      return null
    }

    try {
      const user = await sessionAccount(secret).get()
      return { user: { id: user.$id, email: user.email }, account: null }
    } catch (error) {
      if (isSessionInvalid(error)) {
        clearSessionCookie()
        return null
      }

      console.error('Could not load the current user; rendering signed out.', error)
      return null
    }
  },
)
