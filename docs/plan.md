# Implementation plan

Agreed design for the HAUZ frontend take-home. Each task is one commit.
`TASK.md` is the source of requirements; this file records the decisions.

## Architecture decisions

- **Session storage.** The Appwrite session secret lives in an `httpOnly`,
  `sameSite=lax`, `path=/` cookie named `hauz_session`. `secure` is set only in
  production (localhost is plain HTTP). `maxAge` is derived from the `expire`
  field Appwrite returns when the session is created. Browser JavaScript can
  never read it. All Appwrite calls happen inside TanStack Start server
  functions.
- **Two Appwrite clients on the server.** An admin client (API key) is used
  only to create the email token and to exchange the code for a session. A
  session client (`setSession(secret)` from the cookie) is used for
  `account.get()`, for executing the Function and for logging out.
- **Sign-in flow.** `/sign-in?redirect=...` has two steps on one route.
  Step 1: server fn calls `createEmailToken` and returns the `userId`
  (not secret, kept in React state). Step 2: server fn calls
  `createSession({ userId, secret: code })`, sets the cookie, then sends the
  person to `redirect` (if they have a Personal Account) or to
  `/onboarding?redirect=...` (if not). A signed-in visitor on `/sign-in` is
  sent straight to `redirect`. Wrong or expired code: stay on step 2 with an
  inline error and a "send again" button; "use a different email" returns to
  step 1.
- **Current user on first paint.** Root route `beforeLoad` calls a `getAuth`
  server fn through `queryClient.ensureQueryData(['auth'])` and puts
  `{ user: { id, email }, account: PersonalAccount | null } | null` into the
  router context. The header reads it from there, so SSR renders it correctly
  on a hard refresh. Sign-in, onboarding, profile edits and log out invalidate
  the query and the router.
- **Onboarding gating.** After sign-in, a person without a Personal Account
  goes to `/onboarding`. `/profile` also requires an account and redirects to
  `/onboarding` otherwise. Other pages do not force it; the header shows
  "Finish setup" and "Log out" in that state. The Continue button is disabled
  while the request is pending; the Function's unique index makes a double
  submit idempotent anyway.
- **Profile form.** Sends only the fields that changed. Empty contact email or
  bio is sent as `null` (the Function rejects `""` and clears on `null`).
  Empty first or last name is a client-side validation error. No changes: no
  request. The form never sends the user id; the Function derives identity
  from the Appwrite execution header.
- **Log out.** Server fn deletes the current Appwrite session (best effort),
  always deletes the cookie, redirects to `/`.
- **Expected vs unexpected errors.** Server fns return
  `{ ok: false, message }` for expected failures (bad code, validation, 409)
  and throw for unexpected ones. UI only shows `message`.
- **Product notes we do not follow as written** (to be explained in
  `NOTES.md`):
  - `redirect` is restricted to same-origin relative paths (starts with `/`,
    not `//`); anything else falls back to `/`. Otherwise it is an open
    redirect.
  - The profile form does not send the user id. The Function ignores the body
    for identity and trusting it would be a security hole.
  - The cookie is deleted only on authentication failures (401 / unknown
    user). On a network or 5xx failure the person is rendered as signed out for
    that request but the cookie is kept, so an Appwrite outage does not log
    everyone out.
- **The Function is not modified.**
- **No test framework.** Verification is `npm run typecheck` plus manual
  checks in the browser after each task.
- Docs (README, NOTES, comments) are in English.

## Tasks

| # | Task | Done when |
|---|---|---|
| 0 | Push Appwrite resources via MCP: `main` database, `personal_accounts` table + columns + unique index, `personal-account` Function + deployment | Function shows a ready deployment, execute access = `users` |
| 1 | `src/server/appwrite.ts`: admin client, session client, cookie read/write/delete helpers, env access | server-only module, typecheck passes |
| 2 | `getAuth` server fn, root `beforeLoad` + router context, `Header` component in the root shell | header correct on hard refresh, signed in and out |
| 3 | `/sign-in`: email step, code step, two server fns, `redirect` sanitizer | can sign in with an emailed code |
| 4 | `src/server/personal-account.ts`: typed wrapper over `createExecution` for GET / POST / PATCH; `getAuth` includes the account | header shows first name |
| 5 | `/onboarding`: form + POST, pending state, redirect chain | new user creates an account once |
| 6 | `/profile`: guard, view, diff-based PATCH, null clearing | edit and clear work, signed-out visitor round-trips through sign-in |
| 7 | Log out | header flips to "Sign in", cookie gone |
| 8 | `README.md` run steps, `NOTES.md`, `docs/agent-log.md` with prompts and caught mistakes | deliverables complete |

## Facts that shape the implementation

- `createServerFn` uses `.validator()` (Zod 4 schemas work directly);
  `createMiddleware` is available.
- Cookie helpers come from `@tanstack/react-start/server`; `maxAge` is in
  seconds; `sameSite` is lowercase.
- `redirect()` can be thrown from `beforeLoad` and from server fn handlers.
- node-appwrite 29: `createEmailToken({ userId, email })`,
  `createSession({ userId, secret })`, `client.setSession(secret)`. Codes
  expire after 15 minutes.
- `functions.createExecution` takes `xpath` (not `path`) and `method` as the
  `ExecutionMethod` enum. Executing with the session client is what makes
  Appwrite inject `x-appwrite-user-id` for the Function.
- No `env` helper in TanStack Start; use `process.env` in server code only.
