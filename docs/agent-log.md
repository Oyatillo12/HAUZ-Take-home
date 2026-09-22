# Agent log

Built with Claude Code (Claude Fable 5.1) in one session on 2026-09-22.
The full session export is attached separately. This file lists the
prompts that drove the work and the mistakes that were caught.

## Prompts (in order, translated from Uzbek where needed)

1. "Look through the project, understand it and tell me briefly what is in
   it and what it is. Be honest."
2. "Push with the Appwrite MCP."
3. "/grill-with-docs — ok, then we need to plan the implementation, split it
   into tasks, and follow the requirements properly."
   The agent ran two rounds of design questions (17 questions in total,
   each with a recommended answer). Answers: no test framework, no
   glossary file, everything else as recommended. The agreed design is in
   `docs/plan.md`.
4. Two one-time sign-in codes from email, pasted so the agent could test
   the server functions over HTTP without a browser.

## Mistakes the agent made

### Caught by me (the author)

1. **Header did not update after log out or sign-in; only a hard refresh
   showed the new state.** The agent's `refreshAuth` used
   `invalidateQueries` + `router.invalidate()`. On a server-rendered page
   the auth query is hydrated without a `queryFn`, so the refetch rejected
   with "Missing queryFn", the rejection was swallowed, and `beforeLoad`
   handed out the stale cache. I noticed it in the browser; the agent had
   only verified SSR output with curl and server functions over HTTP, which
   never exercises the client cache. Fixed in `1a560d2` (Fix header not
   updating after sign-in, profile save and log out), verified afterwards
   in a real Chrome with Playwright.
2. **A shared server-side cache.** Found while investigating the above:
   the starter's module-level `QueryClient` was kept as-is, so every
   concurrent SSR request shared one cache and could have shown someone
   else's auth in the header. Fixed in `a632311` (Create the QueryClient
   per router, not per module).

### Caught by the agent itself before or during commit

1. **Treated a Function outage as "no account".** The first draft of
   `getAuth` set `account: null` when the Function call failed, while its
   own comment claimed the opposite. That would have sent an onboarded
   person back into onboarding during an outage. Fixed before commit by
   adding `accountUnavailable` — see `6a56aa3` (Call the personal-account
   Function as the signed-in user).
2. **Forms swallowed thrown errors.** Submit handlers had `try/finally`
   but no `catch`, so a server-side validation rejection or a network
   failure left the form silent with the button re-enabled. Caught while
   exercising `updateAccount` with an empty patch. Fixed in the commit
   "Show a generic error when a server function throws".
3. **Assumed the installed toolchain was fine.** The dev server and
   `tsr generate` failed because `npm install` had run under Node 18
   (README requires 22) and the rolldown Windows binding was missing. The
   agent diagnosed it from the error and reinstalled under Node 22; no
   code change, but it is why the README now says to `nvm use 22`.

Smaller ones, fixed in the same commit they appeared in: the header linked
to routes that did not exist yet (route skeletons were added in `97396d7`);
a multi-heredoc shell command failed to parse and had to be split.

## Verification done by the agent

- `npm run typecheck` after every task; `npm run build` at the end.
- SSR checked with curl: header signed out / signed in / with an invalid
  cookie, redirects on `/sign-in`, `/onboarding`, `/profile`, open-redirect
  parameter sanitised.
- Server functions called over HTTP the way the browser does (seroval
  payload, `Origin` header): request code, verify code, two concurrent
  onboarding submits, profile set and clear with `null`, log out and
  reuse of the dead cookie.
- Sign-in and onboarding were also completed once in a real browser by
  the author.
- After the header fix: Playwright driving the installed Chrome (kept
  outside the repo) loaded `/profile` signed in, changed and restored the
  first name, and logged out; the header updated after each step without a
  reload and the cookie was gone at the end.
