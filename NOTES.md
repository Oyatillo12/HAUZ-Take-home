# Notes

## Main decisions

- **The session secret lives only in an httpOnly cookie.** `verifyCode` puts
  it there and no server function ever returns it. Every Appwrite call runs
  inside a TanStack Start server function. Browser JavaScript can read neither
  the secret nor the API key. The cookie's lifetime is taken from the
  session's `expire`, not invented.
- **Two server-side Appwrite clients.** The API key client is used for two
  calls only: send the code, exchange the code for a session. Everything
  done *as* the person (who am I, the Function, log out) uses a client built
  from the session secret. That is also what makes Appwrite inject
  `x-appwrite-user-id` into the Function, so the web app never has to say who
  is calling.
- **Header correct on first paint.** The root route's `beforeLoad` resolves
  the current user and their Personal Account on the server through
  react-query, and puts the result in the router context. The header reads
  the context, so SSR renders the right thing on a hard refresh. Sign-in,
  onboarding, profile edits and log out refetch that query and re-run
  `beforeLoad`.
- **The Function is the only path to `personal_accounts`.** A small typed
  wrapper over `createExecution` covers GET/POST/PATCH. The Function is
  unchanged.
- **Expected failures are values, not exceptions.** Server functions return
  `{ ok: false, message }` for a wrong code, a role conflict or a validation
  error, and throw only for the unexpected. Forms show `message`; a throw
  shows a generic error.

## Where I did not follow the brief

- **"Send people to whatever page the `redirect` parameter names."** Taken
  literally that is an open redirect. Only same-origin paths are honoured
  (`/...`, not `//...`); anything else goes to `/`.
- **"The profile form should send the signed-in user's id."** It does not.
  The Function derives identity from the execution header and ignores any id
  in the body; trusting a client-supplied id would only let one person edit
  another's profile.
- **"If loading the current user fails for any reason, delete the cookie."**
  The cookie is deleted only when Appwrite says the session is invalid
  (401/403/404). A network error or 5xx renders the person as signed out for
  that request but keeps the cookie, so a short Appwrite outage does not log
  everyone out. Likewise, a failed Function call is reported as "account
  unavailable" rather than "no account", so an outage cannot push an onboarded
  person back into onboarding.
- Followed as written: the role is immutable (the Function has no way to
  change it and the profile page only displays it); a double submit on
  onboarding cannot create two accounts (button disabled while pending, and
  the Function returns the existing account on a repeat); clearing contact
  email or bio sends `null`, which the Function turns into a real null.

## What I would do next for production

- Rate-limit `requestCode` per email and per IP on our side, not only rely on
  Appwrite's limits, and add a short cooldown on "send a new code".
- Bind the session cookie to `Secure` + a real domain, and consider rotating
  the Appwrite session on sensitive changes.
- Replace `router.invalidate()`-driven refreshes with a proper `auth` query
  subscription in the header, and add loading/error boundaries per route.
- Add tests: unit tests for `safeRedirect` and `buildProfilePatch`, and an
  end-to-end test of sign-in → onboarding → profile → log out against a
  throwaway Appwrite project.
- Structured logging and error reporting around the Function calls, and a
  health check that distinguishes "Appwrite down" from "Function down".
