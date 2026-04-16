# PRD: Student Login Page

**Platform:** VC Class EdTech  
**Route:** `/login` (`src/app/(auth)/login/page.tsx`)  
**Date:** 2026-04-15  
**Status:** Approved

---

## Overview

The Login page is the primary entry point for all users on the VC Class platform. It authenticates students and teachers via email and password, then redirects each role to the appropriate dashboard. The page must be fast, accessible, and visually consistent with the platform's glassmorphism design language.

---

## User Stories

| ID | As a… | I want to… | So that… |
|----|-------|------------|----------|
| US-01 | Student | Sign in with my email and password | I can access my learning topics |
| US-02 | Teacher | Sign in with my credentials | I am taken directly to my teacher dashboard |
| US-03 | Any user | See a clear error when I enter wrong credentials | I know to retry or recover my account |
| US-04 | Any user | See a specific error when my account is inactive | I understand why I cannot log in |
| US-05 | New user | Find a link to the registration page | I can create an account without searching |
| US-06 | Any user | Have my session persist across page refreshes | I do not need to log in repeatedly |

---

## Functional Requirements

### FR-01: Authentication
- The form must collect `email` and `password` fields.
- On submit, call `signIn("credentials", { email, password, redirect: false })`.
- Parse the `error` field from the NextAuth response to determine the failure reason.

### FR-02: Role-Based Redirect
- On successful authentication, read the session role from the JWT.
- `TEACHER` role → redirect to `/teacher`.
- `STUDENT` role → redirect to `/topics`.
- Any unrecognised role → redirect to `/` as a safe fallback.

### FR-03: Error Handling
- `CredentialsSignin` error code → display "Invalid email or password."
- `AccountInactive` error code → display "Your account is inactive. Please contact support."
- Network/unexpected errors → display "Something went wrong. Please try again."
- Errors must be displayed inline within the card, not as browser alerts.

### FR-04: Form State
- Submit button must be disabled and show a loading spinner while the sign-in request is in flight.
- Inputs must be cleared of the password value on error (email can remain).
- Client-side: require both fields to be non-empty before enabling the submit button.

### FR-05: Navigation
- A "Don't have an account? Register" link must be present and navigate to `/register`.

### FR-06: Security
- The password field must always render as `type="password"`.
- Optionally expose a show/hide password toggle (eye icon).
- No credentials are stored in `localStorage` or `sessionStorage`.

---

## Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| Performance | Page must achieve LCP < 2.5 s on a mid-range mobile device |
| Accessibility | Form must be fully keyboard-navigable; labels must be associated with inputs via `htmlFor`/`id`; error messages associated via `aria-describedby` |
| SEO | Page must export `metadata` with title "Login – VC Class" (handled in layout or page) |
| Responsiveness | Card must be centred on screens ≥ 320 px wide; no horizontal scroll |
| Browser Support | Chrome 120+, Firefox 120+, Safari 17+, Edge 120+ |

---

## UI/UX Requirements

### Layout
- Full-viewport background with a blue-to-purple gradient (`from-blue-600 via-purple-600 to-indigo-700` or equivalent).
- A single glassmorphism card centred both horizontally and vertically (`min-h-screen flex items-center justify-center`).
- Card: `backdrop-blur-md`, semi-transparent white background, rounded corners (`rounded-2xl`), subtle shadow.

### Card Contents (top to bottom)
1. Platform logo or wordmark ("VC Class")
2. Page heading: "Welcome Back"
3. Sub-heading: "Sign in to your account"
4. Email input with label
5. Password input with label (+ optional show/hide toggle)
6. Error message area (conditionally rendered)
7. Submit button ("Sign In") — full width, primary colour
8. Divider or spacing
9. "Don't have an account? Register" link

### Interaction Design
- Inputs gain a visible focus ring on keyboard focus.
- The submit button transitions to a loading state (spinner + "Signing in…" text) immediately on click.
- Error message animates in (fade or slide-down) to draw attention without being jarring.

---

## Edge Cases

| Scenario | Expected Behaviour |
|----------|--------------------|
| User is already authenticated | Middleware or layout should redirect before rendering this page |
| User submits with empty fields | HTML5 `required` + button disabled state prevents submission |
| Network request times out | Generic error message displayed; form re-enabled |
| User's account status is `INACTIVE` | Specific "inactive account" message shown |
| User navigates back after login | Browser back button should not re-submit the form |
| Slow network | Loading spinner visible; button remains disabled until response |
| XSS attempt in email field | React escapes all rendered content; no raw HTML injection possible |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Login success rate | ≥ 95% of genuine login attempts succeed on first try |
| Time to interactive | < 3 s on 4G mobile |
| Accessibility audit score | 100 / 100 (Lighthouse) |
| Error message comprehension | Users correctly understand error cause in user testing |
| Bounce rate from login page | < 10% (excluding intentional navigation to register) |
