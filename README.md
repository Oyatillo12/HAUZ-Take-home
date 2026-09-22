# HAUZ frontend take-home

Email-code sign-in, onboarding, profile and log out on TanStack Start with
Appwrite. `TASK.md` is the brief, `NOTES.md` the decisions, `docs/plan.md`
the design that was agreed before coding.

## Run it

```bash
nvm use 22            # Node 22 or newer; Vite 8 does not start on 18
npm install
cp .env.example .env  # fill in APPWRITE_PROJECT_ID and APPWRITE_API_KEY
npm run appwrite:push # once, after `npx appwrite login`; see Setup below
npm run dev           # http://localhost:3000
```

If `npm install` ever ran under an older Node, run it again under 22: the
rolldown platform binding is an optional dependency and is skipped
otherwise.

Pages: `/sign-in`, `/onboarding`, `/profile`. The header on every page shows
"Sign in" or the first name and "Log out". Sign-in codes come from Appwrite
Cloud's mail server; check spam.

Layout of what was added:

```
src/server/appwrite.ts          Appwrite clients + session cookie (server only)
src/server/auth.ts              getAuth: who is signed in, with their account
src/server/sign-in.ts           requestCode, verifyCode
src/server/sign-out.ts          signOut
src/server/personal-account.ts  typed calls to the Function
src/server/account.ts           createAccount, updateAccount
src/lib/                        client-safe helpers (auth query, redirect, patch)
src/components/header.tsx
src/routes/                     __root, index, sign-in, onboarding, profile
```

---

The rest of this file is the original starter README.

# HAUZ frontend take-home starter

A blank TanStack Start app plus the Appwrite Function you will call from it.
Read `TASK.md` for what to build. This file is only about getting it running.

## What you need

- Node 22 or newer
- A free Appwrite Cloud account at https://cloud.appwrite.io

## Setup

Budget 20 minutes. If you get stuck for longer than that, email us instead of
grinding on it. Setup friction is not what we are testing.

### 1. Install dependencies

```bash
npm install
```

### 2. Create an Appwrite project

In the Appwrite Console, create a new project. From **Overview**, copy the
**Project ID** and the **API Endpoint**. The endpoint is region specific, for
example `https://fra.cloud.appwrite.io/v1`.

Put both into `appwrite.config.json`, replacing `REPLACE_WITH_YOUR_PROJECT_ID`
and the `endpoint` if your region differs.

### 3. Push the database, table and Function

```bash
npx appwrite login
npm run appwrite:push
```

That creates the `main` database, the `personal_accounts` table with its unique
index, and deploys the `personal-account` Function. The first deployment takes a
minute or two while Appwrite builds it.

Confirm it worked: the Function should appear in the Console under **Functions**
with a ready deployment, and its **Execute access** should be `users`.

One warning about that command. `appwrite push table` treats
`appwrite.config.json` as the full picture of your schema and deletes tables in
the project that are not in it. On the fresh project you just made there is
nothing to delete, so it is safe here. Do not run it against a project that has
other tables in it.

### 4. Create an API key

Console, **Overview**, **Integrations**, **API keys**, **Create API key**.

Give it these scopes:

- `sessions.write`
- `users.read`
- `users.write`
- `execution.write`

Copy the secret once. You cannot read it again.

### 5. Fill in your environment

```bash
cp .env.example .env
```

Fill in `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID` and `APPWRITE_API_KEY`.
`.env` is git-ignored. Do not commit it.

### 6. Run it

```bash
npm run dev
```

http://localhost:3000

## What is in here

```
src/                          the app you are building; it is empty on purpose
  router.tsx                  router setup
  routes/__root.tsx           the document shell
  routes/index.tsx            placeholder home page
functions/personal-account/   the Function, already written
appwrite.config.json          database, table and Function definitions
```

Other scripts:

```bash
npm run build       production build
npm run typecheck   tsc --noEmit
npm run appwrite    the Appwrite CLI, scoped to this project's config
```

## The Function

One Appwrite Function with three routes. It is deployed with **Execute access:
users**, which means a signed-in Appwrite user can execute it and a guest
cannot.

| Route | Body | Result |
|---|---|---|
| `GET /personal-account` | | `200` with the account, `404` if the caller has none |
| `POST /personal-account` | `firstName`, `lastName`, `role` | `201` created, `200` if it already exists, `409` if it exists with a different role |
| `PATCH /personal-account` | any of `firstName`, `lastName`, `contactEmail`, `bio` | `200` with the updated account |

`role` is either `property_owner` or `realtor`.

On `PATCH`, a field you leave out keeps its stored value and `null` clears it.
Every route answers `401` when the execution has no signed-in Appwrite user.

Errors come back as `{ "error": "<code>", "message": "...", "issues": [...] }`.
Codes you may see: `unauthorized`, `not_found`, `invalid_request`,
`personal_account_inconsistent`, `internal_error`.

You can read the source under `functions/personal-account/src/`. You may change
it if you need to, but say why in `NOTES.md`.

## Email codes

Appwrite Cloud sends the sign-in codes from its own mail server on the free
plan. Check your spam folder. If nothing arrives after a few minutes, Cloud may
be rate limiting you, so wait and retry rather than clicking send repeatedly.
