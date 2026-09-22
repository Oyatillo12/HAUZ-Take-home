/**
 * Server-only Appwrite access.
 *
 * Nothing in this module may be imported from client code. It reads the API
 * key from the environment and the session secret from an httpOnly cookie,
 * and neither is ever sent to the browser.
 *
 * Two clients:
 *   - adminClient()    uses the API key. Only for issuing the email code and
 *                      exchanging it for a session. It has no idea who is
 *                      calling and must not be used for per-user reads.
 *   - sessionClient()  acts as the signed-in user via the session secret. Used
 *                      for account.get(), Function executions and log out.
 */

import {
  deleteCookie,
  getCookie,
  setCookie,
} from '@tanstack/react-start/server'
import { Account, Client, Functions } from 'node-appwrite'

export const SESSION_COOKIE = 'hauz_session'

function env(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing environment variable ${name}. See .env.example.`)
  }
  return value
}

function baseClient(): Client {
  return new Client()
    .setEndpoint(env('APPWRITE_ENDPOINT'))
    .setProject(env('APPWRITE_PROJECT_ID'))
}

export function adminClient(): Client {
  return baseClient().setKey(env('APPWRITE_API_KEY'))
}

export function sessionClient(secret: string): Client {
  return baseClient().setSession(secret)
}

export function adminAccount(): Account {
  return new Account(adminClient())
}

export function sessionAccount(secret: string): Account {
  return new Account(sessionClient(secret))
}

export function sessionFunctions(secret: string): Functions {
  return new Functions(sessionClient(secret))
}

export function functionId(): string {
  return env('APPWRITE_FUNCTION_ID')
}

/** The session secret from the cookie, or undefined when signed out. */
export function readSessionSecret(): string | undefined {
  const value = getCookie(SESSION_COOKIE)
  return value ? value : undefined
}

/**
 * Store the session secret. `expire` is the ISO timestamp Appwrite returned
 * for the session, so the cookie dies with the session rather than on a
 * lifetime we invented.
 */
export function writeSessionCookie(secret: string, expire: string): void {
  const seconds = Math.floor((Date.parse(expire) - Date.now()) / 1000)

  setCookie(SESSION_COOKIE, secret, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    // localhost is plain http; a Secure cookie would never be sent there.
    secure: process.env.NODE_ENV === 'production',
    maxAge: Math.max(seconds, 0),
  })
}

export function clearSessionCookie(): void {
  deleteCookie(SESSION_COOKIE, { path: '/' })
}
