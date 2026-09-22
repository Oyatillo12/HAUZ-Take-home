/**
 * Email-code sign-in, in two server functions.
 *
 *  1. requestCode: Appwrite emails a one-time code and tells us the userId
 *     (creating the user if the email is new). The userId is not a secret;
 *     the client holds it between the two steps.
 *  2. verifyCode: exchanges userId + code for a session. The session secret
 *     goes straight into the httpOnly cookie and is never returned.
 */

import { createServerFn } from '@tanstack/react-start'
import { AppwriteException, ID } from 'node-appwrite'
import { z } from 'zod'

import { adminAccount, writeSessionCookie } from '#/server/appwrite'

export type Result<T = {}> = ({ ok: true } & T) | { ok: false; message: string }

const tooManyAttempts = {
  ok: false,
  message: 'Too many attempts. Wait a few minutes and try again.',
} as const

export const requestCode = createServerFn({ method: 'POST' })
  .validator(z.object({ email: z.email().max(254) }))
  .handler(async ({ data }): Promise<Result<{ userId: string }>> => {
    try {
      const token = await adminAccount().createEmailToken({
        userId: ID.unique(),
        email: data.email,
      })
      return { ok: true, userId: token.userId }
    } catch (error) {
      if (error instanceof AppwriteException && error.code === 429) {
        return tooManyAttempts
      }
      console.error('createEmailToken failed', error)
      return { ok: false, message: 'Could not send a code. Try again.' }
    }
  })

export const verifyCode = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      userId: z.string().min(1),
      code: z.string().trim().min(1, 'Enter the code from the email.'),
    }),
  )
  .handler(async ({ data }): Promise<Result> => {
    try {
      const session = await adminAccount().createSession({
        userId: data.userId,
        secret: data.code,
      })
      writeSessionCookie(session.secret, session.expire)
      return { ok: true }
    } catch (error) {
      if (error instanceof AppwriteException && error.code === 401) {
        return { ok: false, message: 'That code is wrong or has expired.' }
      }
      if (error instanceof AppwriteException && error.code === 429) {
        return tooManyAttempts
      }
      console.error('createSession failed', error)
      return { ok: false, message: 'Could not sign you in. Try again.' }
    }
  })
