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
 * like: refetch the auth query and re-run route `beforeLoad`s so header and
 * guards see the new state. Returns the fresh state.
 *
 * `fetchQuery` with `staleTime: 0` rather than `invalidateQueries`: on a page
 * rendered by the server, the auth query is hydrated into the client cache
 * without a `queryFn` (functions do not survive dehydration), so an
 * invalidate-and-refetch silently does nothing and `beforeLoad` keeps
 * handing out the stale value. Passing the options here supplies the
 * `queryFn` and forces the fetch.
 */
export async function refreshAuth(
  queryClient: QueryClient,
  router: AnyRouter,
): Promise<AuthState> {
  const auth = await queryClient.fetchQuery({
    ...authQueryOptions(),
    staleTime: 0,
  })
  await router.invalidate()
  return auth
}
