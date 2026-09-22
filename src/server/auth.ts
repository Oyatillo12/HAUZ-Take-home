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
import { getPersonalAccount } from '#/server/personal-account'

export interface AuthUser {
  id: string
  email: string
}

export interface SignedIn {
  user: AuthUser
  /** null means the person has not onboarded yet. */
  account: PersonalAccount | null
  /**
   * true when the Function could not be reached, so `account: null` is
   * "unknown" rather than "none". The UI must not push these people into
   * onboarding.
   */
  accountUnavailable: boolean
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

    let user
    try {
      user = await sessionAccount(secret).get()
    } catch (error) {
      if (isSessionInvalid(error)) {
        clearSessionCookie()
        return null
      }

      console.error('Could not load the current user; rendering signed out.', error)
      return null
    }

    const authUser = { id: user.$id, email: user.email }

    // A Function failure must not look like "no account yet": that would
    // send an onboarded person back through onboarding. They stay signed in
    // and the UI shows what it knows until the next request succeeds.
    try {
      const account = await getPersonalAccount(secret)
      return { user: authUser, account, accountUnavailable: false }
    } catch (error) {
      console.error('Could not load the personal account.', error)
      return { user: authUser, account: null, accountUnavailable: true }
    }
  },
)
