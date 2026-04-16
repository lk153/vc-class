# TDD: Student Login Page

**Platform:** VC Class EdTech  
**Route:** `/login` (`src/app/(auth)/login/page.tsx`)  
**Date:** 2026-04-15  
**Status:** Approved

---

## Architecture Overview

The Login page is a **Client Component** (`"use client"`) rendered within the `(auth)` route group layout. It uses **NextAuth v5** with a Credentials provider and a **JWT session strategy**. No server-side data fetching is required at render time — all data flow is triggered by user action.

```
(auth) layout
  └── /login
        └── LoginPage (Client Component)
              ├── LoginForm (controlled form)
              └── useRouter (next/navigation)
```

The component is intentionally kept in a single file (`page.tsx`) unless the form grows complex enough to warrant extraction into `LoginForm.tsx`.

---

## Route & Data Flow

```
1. User visits /login
2. (auth) layout renders → LoginPage mounts
3. User enters email + password → local state updates
4. User clicks "Sign In"
   a. Set isLoading = true, clear previous error
   b. Call signIn("credentials", { email, password, redirect: false })
   c. NextAuth POST /api/auth/callback/credentials
      → Credentials provider authorize() runs
      → DB lookup by email
      → bcryptjs.compare(password, hash)
      → Returns user object or throws
   d. NextAuth issues JWT, sets session cookie
5. signIn() resolves with { ok, error, url }
   a. If ok === true:
      - Call getSession() or use returned url
      - Read session.user.role
      - router.replace("/teacher") | router.replace("/topics")
   b. If error present:
      - Map error string → human-readable message
      - Set errorMessage state
      - Set isLoading = false
      - Clear password field
```

### NextAuth Error Mapping

| NextAuth error value | Displayed message |
|----------------------|-------------------|
| `CredentialsSignin` | "Invalid email or password." |
| `AccountInactive` | "Your account is inactive. Please contact support." |
| Any other / undefined | "Something went wrong. Please try again." |

---

## Component Tree

```
LoginPage                          (page.tsx — "use client")
├── <main>                         (full-viewport gradient wrapper)
│   └── <div> card                 (glassmorphism container)
│       ├── <Logo />               (SVG or text wordmark)
│       ├── <h1> "Welcome Back"
│       ├── <p> sub-heading
│       ├── <form> onSubmit={handleSubmit}
│       │   ├── <label> Email
│       │   │   └── <input type="email" />
│       │   ├── <label> Password
│       │   │   └── <div> relative wrapper
│       │   │       ├── <input type="password" />
│       │   │       └── <button> show/hide toggle (optional)
│       │   ├── <ErrorMessage />   (conditional)
│       │   └── <button type="submit"> Sign In / spinner
│       └── <p> Register link
```

---

## API Dependencies

| Endpoint | Method | Provider | Purpose |
|----------|--------|----------|---------|
| `/api/auth/callback/credentials` | POST | NextAuth internal | Validates credentials, issues JWT |
| `/api/auth/session` | GET | NextAuth internal | Read role after sign-in (if needed) |

No external REST calls are made from this component directly. All auth traffic goes through NextAuth's built-in handlers.

### NextAuth Credentials Provider Contract

The `authorize` function in `src/auth.ts` (or equivalent) must:
- Accept `{ email: string, password: string }`.
- Return a user object matching `{ id, email, name, role, status }` on success.
- Throw an `Error("AccountInactive")` when `status !== "ACTIVE"`.
- Return `null` on wrong password/email (triggers `CredentialsSignin`).

---

## Validation Logic

Validation is intentionally minimal on the client side; the server is the authoritative validator.

### Client-Side (pre-submit gate)
```
email.trim().length > 0 AND password.length > 0
  → submit button enabled
  → form submittable

Otherwise → button disabled (no error shown until submit attempted)
```

### Server-Side (authoritative)
- Email must match a record in the database.
- Password must match bcryptjs hash.
- Account `status` must be `"ACTIVE"`.

No Zod schema is used on the login form; the complexity does not justify the dependency here. Zod is reserved for the Register page.

---

## State Management

All state is local to the component via `useState`. No global store (Zustand, Redux, etc.) is used.

```typescript
const [email, setEmail]           = useState("")
const [password, setPassword]     = useState("")
const [isLoading, setIsLoading]   = useState(false)
const [errorMsg, setErrorMsg]     = useState<string | null>(null)
```

### State Transitions

```
idle
  → (user types) → dirty (button enabled when both fields non-empty)
  → (submit) → loading (button disabled, spinner visible)
  → (success) → [redirect, component unmounts]
  → (error) → error (error message shown, password cleared, form re-enabled)
  → (user edits) → dirty (error cleared on next input change)
```

---

## Styling

### Approach
Tailwind CSS utility classes only. No CSS modules or inline style objects except for values not available in Tailwind (e.g. exact backdrop-filter values).

### Key Classes

| Element | Tailwind Classes |
|---------|-----------------|
| Outer wrapper | `min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 p-4` |
| Card | `w-full max-w-md bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl p-8` |
| Card headings | `text-white text-3xl font-bold` / `text-white/70 text-sm mt-1` |
| Input wrapper | `mt-1 relative` |
| Input | `w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/50` |
| Label | `block text-sm font-medium text-white/80` |
| Error box | `bg-red-500/20 border border-red-500/40 rounded-lg px-4 py-3 text-red-200 text-sm` |
| Submit button | `w-full bg-white text-purple-700 font-semibold rounded-lg py-3 hover:bg-white/90 transition disabled:opacity-50 disabled:cursor-not-allowed` |
| Register link | `text-white/60 hover:text-white transition text-sm` |

### Responsive Breakpoints
- Default (mobile): card fills container with `p-4` page padding.
- `sm:` and above: card constrained to `max-w-md`, centred.

---

## i18n Keys

The platform uses a key-based i18n system. The following keys must be defined in the `student` namespace (or `auth` namespace, depending on project convention).

```
auth.login.title                 = "Welcome Back"
auth.login.subtitle              = "Sign in to your account"
auth.login.email.label           = "Email address"
auth.login.email.placeholder     = "you@example.com"
auth.login.password.label        = "Password"
auth.login.password.placeholder  = "••••••••"
auth.login.submit                = "Sign In"
auth.login.submitting            = "Signing in…"
auth.login.registerPrompt        = "Don't have an account?"
auth.login.registerLink          = "Register"
auth.login.error.invalidCreds    = "Invalid email or password."
auth.login.error.inactive        = "Your account is inactive. Please contact support."
auth.login.error.generic         = "Something went wrong. Please try again."
```

If i18n is not yet implemented, hardcode English strings and leave a `// TODO: i18n` comment at each string site.

---

## Error Handling

### Handled Errors

| Source | Trigger | UI Response |
|--------|---------|-------------|
| NextAuth `CredentialsSignin` | Wrong email or password | Inline error message; password field cleared |
| Custom `AccountInactive` | User status is `INACTIVE` | Specific inactive message |
| `signIn` throws (network) | No response from server | Generic error message; form re-enabled |
| `getSession` returns null after ok=true | JWT not issued | Generic error; do not redirect |

### Error Display Rules
- Only one error message is shown at a time.
- Error is cleared when the user begins editing any field.
- No `console.error` in production; errors should be logged to an observability tool if configured.

---

## Security Considerations

| Concern | Mitigation |
|---------|-----------|
| Credential exposure | Password field always `type="password"`; never stored in state beyond the session |
| CSRF | NextAuth v5 uses built-in CSRF token on the credentials callback |
| Brute force | Rate limiting must be applied at the NextAuth `authorize` level or via middleware (e.g. Upstash Ratelimit) — outside this component's scope |
| XSS | All dynamic content rendered via React JSX; no `dangerouslySetInnerHTML` used |
| Session fixation | NextAuth rotates the session token on sign-in automatically |
| Open redirect | `router.replace` targets are hardcoded strings, not derived from user input or query params |
| Sensitive data in URL | `redirect: false` passed to `signIn`; credentials are never appended to the URL |
