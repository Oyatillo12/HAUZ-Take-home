/**
 * The web app's only way to the personal_accounts table: the
 * `personal-account` Appwrite Function, executed as the signed-in user.
 *
 * Executing with the session client is what makes Appwrite inject
 * `x-appwrite-user-id` into the Function, so identity never travels in the
 * request body. The table is never read or written from here directly.
 */

import { ExecutionMethod } from 'node-appwrite'

import type { PersonalAccount, Role } from '#/lib/personal-account'
import { functionId, sessionFunctions } from '#/server/appwrite'

const PATH = '/personal-account'

/** What the Function returns on success. */
interface FunctionAccount {
  personalAccountId: string
  firstName: string
  lastName: string
  role: Role
  contactEmail: string | null
  bio: string | null
}

/** What the Function returns on failure. */
interface FunctionError {
  error: string
  message: string
  issues?: Array<{ field: string; message: string }>
}

export interface CreateInput {
  firstName: string
  lastName: string
  role: Role
}

/** Omitted = keep, null = clear. Mirrors the Function's PATCH contract. */
export interface UpdateInput {
  firstName?: string
  lastName?: string
  contactEmail?: string | null
  bio?: string | null
}

export type AccountResult =
  | { ok: true; account: PersonalAccount }
  | { ok: false; message: string }

export class FunctionCallError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message)
    this.name = 'FunctionCallError'
  }
}

function toAccount(body: FunctionAccount): PersonalAccount {
  return {
    id: body.personalAccountId,
    firstName: body.firstName,
    lastName: body.lastName,
    role: body.role,
    contactEmail: body.contactEmail,
    bio: body.bio,
  }
}

async function execute(
  secret: string,
  method: ExecutionMethod,
  body?: object,
): Promise<{ status: number; body: unknown }> {
  const execution = await sessionFunctions(secret).createExecution({
    functionId: functionId(),
    xpath: PATH,
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
    async: false,
  })

  // A crash inside the Function shows up here, not as an HTTP status.
  if (execution.status === 'failed') {
    throw new FunctionCallError(
      execution.errors || 'The personal-account Function failed.',
      500,
      'execution_failed',
    )
  }

  let parsed: unknown = null
  if (execution.responseBody) {
    try {
      parsed = JSON.parse(execution.responseBody)
    } catch {
      throw new FunctionCallError(
        'The personal-account Function returned a non-JSON body.',
        execution.responseStatusCode,
        'invalid_response',
      )
    }
  }

  return { status: execution.responseStatusCode, body: parsed }
}

function errorOf(body: unknown, status: number): FunctionCallError {
  const err = body as Partial<FunctionError> | null
  return new FunctionCallError(
    err?.message ?? `The personal-account Function answered ${status}.`,
    status,
    err?.error ?? 'unknown',
  )
}

/** The caller's account, or null when they have not onboarded yet. */
export async function getPersonalAccount(
  secret: string,
): Promise<PersonalAccount | null> {
  const { status, body } = await execute(secret, ExecutionMethod.GET)
  if (status === 200) return toAccount(body as FunctionAccount)
  if (status === 404) return null
  throw errorOf(body, status)
}

/**
 * Idempotent from the caller's point of view: 201 and 200 both mean "you
 * now have this account". 409 means an account with a different role
 * already exists, which the person cannot fix from the form.
 */
export async function createPersonalAccount(
  secret: string,
  input: CreateInput,
): Promise<AccountResult> {
  const { status, body } = await execute(secret, ExecutionMethod.POST, input)
  if (status === 201 || status === 200) {
    return { ok: true, account: toAccount(body as FunctionAccount) }
  }
  if (status === 409 || status === 400) {
    return { ok: false, message: errorOf(body, status).message }
  }
  throw errorOf(body, status)
}

export async function updatePersonalAccount(
  secret: string,
  input: UpdateInput,
): Promise<AccountResult> {
  const { status, body } = await execute(secret, ExecutionMethod.PATCH, input)
  if (status === 200) {
    return { ok: true, account: toAccount(body as FunctionAccount) }
  }
  if (status === 400 || status === 404) {
    return { ok: false, message: errorOf(body, status).message }
  }
  throw errorOf(body, status)
}
