/**
 * Client-safe auth helpers. The only server code touched here is the
 * `getAuth` server function, which is safe to reference from the browser.
 */

import { queryOptions, type QueryClient } from '@tanstack/react-query'
import type { AnyRouter } from '@tanstack/react-router'

import { getAuth, type AuthState, type SignedIn } from '#/server/auth'

export type { AuthState, SignedIn }

export const AUTH_QUERY_KEY = ['auth'] as const

export const authQueryOptions = () =>
  queryOptions({
    queryKey: AUTH_QUERY_KEY,
    queryFn: (): Promise<AuthState> => getAuth(),
  })

/**
 * After anything that changes who is signed in or what their account looks
 * like: refetch the auth query (even though nothing subscribes to it) and
 * re-run route `beforeLoad`s so header and guards see the new state.
 */
export async function refreshAuth(queryClient: QueryClient, router: AnyRouter) {
  await queryClient.invalidateQueries({
    queryKey: AUTH_QUERY_KEY,
    refetchType: 'all',
  })
  await router.invalidate()
}
