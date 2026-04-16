# TDD: Student Register Page

**Platform:** VC Class EdTech  
**Route:** `/register` (`src/app/(auth)/register/page.tsx`)  
**Date:** 2026-04-15  
**Status:** Approved

---

## Architecture Overview

The Register page is a **Client Component** (`"use client"`) within the `(auth)` route group. It has two async concerns: (1) fetching the language list on mount, and (2) POSTing registration data on submit followed by an auto-login via NextAuth. Zod is the client-side validation layer. No server actions are used — all calls are plain `fetch` requests from the component.

```
(auth) layout
  └── /register
        └── RegisterPage (Client Component)
              ├── useEffect → GET /api/languages
              ├── Zod schema (registerSchema)
              ├── handleSubmit → POST /api/auth/register
              │                → signIn("credentials")
              │                → router.replace("/topics")
              └── useRouter (next/navigation)
```

The component may remain in a single `page.tsx`. If it exceeds ~250 lines, extract `RegisterForm.tsx` as a separate client component and keep `page.tsx` as a thin wrapper.

---

## Route & Data Flow

### Mount-Time Data Fetch (Languages)

```
1. Component mounts
2. useEffect fires → fetch("GET /api/languages")
3a. Success → setLanguages(data), setLanguageId(data[0].id)
3b. Failure → setLanguages(FALLBACK_LANGUAGES), log error
4. Language <select> is populated and enabled
```

### Submit Flow

```
1. User clicks "Create Account"
2. setSubmitAttempted(true)
3. Run registerSchema.safeParse(formValues)
   a. Failure → setErrors(zodErrors), return early (no fetch)
   b. Success → continue
4. setIsLoading(true), setServerError(null)
5. fetch("POST /api/auth/register", { body: { name, email, password, languageId } })
6a. 201 Created:
    → signIn("credentials", { email, password, redirect: false })
    → If ok: router.replace("/topics")
    → If !ok: router.replace("/login?registered=true")
6b. 409 Conflict:
    → setServerError("An account with this email already exists.")
    → setIsLoading(false)
6c. Other 4xx:
    → parse body.message or use generic string
    → setServerError(message)
    → setIsLoading(false)
6d. 5xx / network throw:
    → setServerError("Something went wrong. Please try again.")
    → setIsLoading(false)
```

---

## Component Tree

```
RegisterPage                           (page.tsx — "use client")
├── <main>                             (full-viewport gradient wrapper)
│   └── <div> card                     (glassmorphism container, overflow-y-auto on short screens)
│       ├── <Logo />                   (SVG or text wordmark)
│       ├── <h1> "Create an Account"
│       ├── <p> sub-heading
│       ├── <form> onSubmit={handleSubmit}
│       │   ├── <FieldGroup> Name
│       │   │   ├── <label>
│       │   │   ├── <input type="text" />
│       │   │   └── <FieldError />     (conditional, id for aria-describedby)
│       │   ├── <FieldGroup> Email
│       │   │   ├── <label>
│       │   │   ├── <input type="email" />
│       │   │   └── <FieldError />
│       │   ├── <FieldGroup> Password
│       │   │   ├── <label>
│       │   │   ├── <div> relative
│       │   │   │   ├── <input type="password" />
│       │   │   │   └── <button> show/hide toggle
│       │   │   └── <FieldError />
│       │   ├── <FieldGroup> Confirm Password
│       │   │   ├── <label>
│       │   │   ├── <div> relative
│       │   │   │   ├── <input type="password" />
│       │   │   │   └── <button> show/hide toggle
│       │   │   └── <FieldError />
│       │   ├── <FieldGroup> Language
│       │   │   ├── <label>
│       │   │   ├── <select>
│       │   │   │   └── <option> × n  (from API or fallback)
│       │   │   └── <FieldError />
│       │   ├── <ServerError />        (conditional, for 409/5xx)
│       │   └── <button type="submit"> Create Account / spinner
│       └── <p> Login link
```

`<FieldGroup>`, `<FieldError>`, and `<ServerError>` are inline JSX helpers or tiny sub-components within the same file, not separate files.

---

## API Dependencies

### GET /api/languages

| Property | Value |
|----------|-------|
| Method | GET |
| Auth required | No |
| Response (200) | `{ id: string, name: string, code: string }[]` |
| Called from | `useEffect` on mount |
| Cache strategy | `fetch` with `{ cache: "force-cache" }` or `next: { revalidate: 3600 }` to avoid repeat calls |

Example response:
```json
[
  { "id": "lang_en", "name": "English", "code": "en" },
  { "id": "lang_id", "name": "Indonesian", "code": "id" }
]
```

Fallback constant (used on fetch failure):
```typescript
const FALLBACK_LANGUAGES = [{ id: "lang_en", name: "English", code: "en" }]
```

### POST /api/auth/register

| Property | Value |
|----------|-------|
| Method | POST |
| Auth required | No |
| Request body | `{ name: string, email: string, password: string, languageId: string }` |
| Response (201) | `{ id: string, email: string, name: string }` |
| Response (409) | `{ message: "Email already in use" }` |
| Called from | `handleSubmit` after Zod validation passes |

### NextAuth /api/auth/callback/credentials (internal)

Called via `signIn("credentials", ...)` after successful registration. Identical contract to the Login page's usage.

---

## Validation Logic

### Zod Schema

```typescript
import { z } from "zod"

const registerSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    languageId: z.string().min(1, "Please select a language"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

type RegisterFormValues = z.infer<typeof registerSchema>
```

### Validation Strategy

- `submitAttempted` flag gates when errors are displayed.
- On first submit: parse with `safeParse`; if invalid, set errors and return.
- After first submit: re-validate on every field change (real-time feedback).
- Errors object shape: `Record<keyof RegisterFormValues, string | undefined>`.
- `confirmPassword` error path from `refine` must be correctly extracted from `ZodError.flatten().fieldErrors`.

---

## State Management

All state is local to the component via `useState`. No global store.

```typescript
// Form field values
const [name, setName]                   = useState("")
const [email, setEmail]                 = useState("")
const [password, setPassword]           = useState("")
const [confirmPassword, setConfirmPassword] = useState("")
const [languageId, setLanguageId]       = useState("")

// Language options
const [languages, setLanguages]         = useState<Language[]>([])
const [langsLoading, setLangsLoading]   = useState(true)

// Validation
const [errors, setErrors]               = useState<Partial<Record<string, string>>>({})
const [submitAttempted, setSubmitAttempted] = useState(false)

// Submission
const [isLoading, setIsLoading]         = useState(false)
const [serverError, setServerError]     = useState<string | null>(null)

// Password visibility
const [showPassword, setShowPassword]   = useState(false)
const [showConfirmPassword, setShowConfirmPassword] = useState(false)
```

### Re-validation on Change

When `submitAttempted === true`, every setter call also triggers a re-parse:

```typescript
const handleFieldChange = (field: string, value: string, setter: (v: string) => void) => {
  setter(value)
  if (submitAttempted) {
    const result = registerSchema.safeParse({ ...currentValues, [field]: value })
    setErrors(result.success ? {} : flattenZodErrors(result.error))
  }
}
```

---

## Styling

### Approach
Tailwind CSS utility classes. Same visual language as the Login page for consistency.

### Key Classes

| Element | Tailwind Classes |
|---------|-----------------|
| Outer wrapper | `min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 p-4 py-8` |
| Card | `w-full max-w-md bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl p-8` |
| Card scroll (short screens) | `max-h-[90vh] overflow-y-auto` on the card or a wrapper |
| Input | `w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/50` |
| Input (error state) | Add `border-red-400` |
| Select | Same as input + `appearance-none` |
| Field error text | `text-red-300 text-xs mt-1` |
| Server error box | `bg-red-500/20 border border-red-500/40 rounded-lg px-4 py-3 text-red-200 text-sm` |
| Submit button | `w-full bg-white text-purple-700 font-semibold rounded-lg py-3 hover:bg-white/90 transition disabled:opacity-50 disabled:cursor-not-allowed mt-2` |
| Login link | `text-white/60 hover:text-white transition text-sm` |

---

## i18n Keys

```
auth.register.title                    = "Create an Account"
auth.register.subtitle                 = "Join VC Class and start learning"
auth.register.name.label               = "Full Name"
auth.register.name.placeholder         = "Your full name"
auth.register.email.label              = "Email address"
auth.register.email.placeholder        = "you@example.com"
auth.register.password.label           = "Password"
auth.register.password.placeholder     = "Min. 8 characters"
auth.register.confirmPassword.label    = "Confirm Password"
auth.register.confirmPassword.placeholder = "Repeat your password"
auth.register.language.label           = "Preferred Language"
auth.register.language.loading         = "Loading languages…"
auth.register.language.placeholder     = "Select a language"
auth.register.submit                   = "Create Account"
auth.register.submitting               = "Creating account…"
auth.register.loginPrompt              = "Already have an account?"
auth.register.loginLink                = "Sign in"

auth.register.error.name.required      = "Name is required"
auth.register.error.email.invalid      = "Please enter a valid email address"
auth.register.error.password.minLength = "Password must be at least 8 characters"
auth.register.error.confirmPassword.mismatch = "Passwords do not match"
auth.register.error.language.required  = "Please select a language"
auth.register.error.emailTaken         = "An account with this email already exists."
auth.register.error.generic            = "Something went wrong. Please try again."
```

If i18n is not yet implemented, hardcode English strings with `// TODO: i18n` comments.

---

## Error Handling

### Client-Side Errors (Zod)

| Field | Condition | Message |
|-------|-----------|---------|
| name | Empty | "Name is required" |
| email | Not valid email format | "Please enter a valid email address" |
| password | Fewer than 8 characters | "Password must be at least 8 characters" |
| confirmPassword | Does not match password | "Passwords do not match" |
| languageId | Nothing selected | "Please select a language" |

### Server-Side Errors

| HTTP Status | Condition | UI Response |
|-------------|-----------|-------------|
| 201 | Success | Auto-login → redirect to /topics |
| 409 | Email already registered | Inline server error with login link hint |
| 4xx (other) | Validation or bad request | Server error message from response body |
| 5xx | Server failure | Generic error string |
| Network error (fetch throws) | No connectivity | Generic error string |

### Auto-Login Failure Fallback

```
signIn() result.ok === false
  → router.replace("/login?registered=true")
  → Login page reads ?registered=true and shows:
    "Account created! Please sign in to continue."
```

---

## Security Considerations

| Concern | Mitigation |
|---------|-----------|
| Password exposure | Both password fields are always `type="password"` by default; toggle changes to `type="text"` only while explicitly toggled and reverts on blur |
| Plaintext password in transit | `POST /api/auth/register` must use HTTPS in production; password is hashed server-side with bcryptjs before DB storage |
| CSRF on register endpoint | The `/api/auth/register` route should validate the `Origin` header or use a CSRF token; NextAuth auto-login is protected by NextAuth's own CSRF mechanism |
| Enumeration attack | The `409` response confirms email existence; this is an accepted UX trade-off for registration flows; rate limiting must be applied at the API route level |
| XSS | All rendered content passes through React JSX; no `dangerouslySetInnerHTML`; Zod error messages are hardcoded strings, not server-reflected values |
| Open redirect | `router.replace` targets are hardcoded (`/topics`, `/login`); the `registered=true` query param is a flag, not a URL |
| Over-posting | The request body is explicitly constructed from named form fields — no spread of the entire form state object; server should also strip unknown keys |
| Sensitive data logging | `password` and `confirmPassword` must never appear in `console.log`, error objects passed to observability tools, or API error responses |
