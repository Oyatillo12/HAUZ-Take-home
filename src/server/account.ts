/**
 * Server functions the onboarding and profile forms call.
 *
 * Both take the caller from the session cookie. Neither accepts a user id
 * from the client: the brief suggested sending it "so the Function knows
 * whose profile to update", but the Function derives identity from the
 * Appwrite execution header and ignores the body. Trusting a client-supplied
 * id would only let one person edit another's profile.
 */

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { ROLES } from '#/lib/personal-account'
import { readSessionSecret } from '#/server/appwrite'
import {
  createPersonalAccount,
  updatePersonalAccount,
  type AccountResult,
} from '#/server/personal-account'

const signedOut: AccountResult = {
  ok: false,
  message: 'Your session has ended. Sign in again.',
}

const name = z.string().trim().min(1, 'Required.').max(100)

/** A cleared optional field arrives as null; "" is never sent. */
const optionalText = (max: number) =>
  z.string().trim().min(1).max(max).nullable().optional()

export const createAccount = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      firstName: name,
      lastName: name,
      role: z.enum(ROLES),
    }),
  )
  .handler(async ({ data }): Promise<AccountResult> => {
    const secret = readSessionSecret()
    if (!secret) return signedOut
    return createPersonalAccount(secret, data)
  })

export const updateAccount = createServerFn({ method: 'POST' })
  .validator(
    z
      .object({
        firstName: name.optional(),
        lastName: name.optional(),
        contactEmail: z.email().max(254).nullable().optional(),
        bio: optionalText(2000),
      })
      .refine((fields) => Object.keys(fields).length > 0, {
        message: 'Nothing to update.',
      }),
  )
  .handler(async ({ data }): Promise<AccountResult> => {
    const secret = readSessionSecret()
    if (!secret) return signedOut
    return updatePersonalAccount(secret, data)
  })
