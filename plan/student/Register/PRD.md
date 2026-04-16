# PRD: Student Register Page

**Platform:** VC Class EdTech  
**Route:** `/register` (`src/app/(auth)/register/page.tsx`)  
**Date:** 2026-04-15  
**Status:** Approved

---

## Overview

The Register page allows new users to create a Student account on VC Class. It collects the user's name, email, password, and preferred language, validates the input, creates the account via a REST API, and then automatically signs the user in and redirects them to the student topics page — removing any friction between signup and first use.

---

## User Stories

| ID | As a… | I want to… | So that… |
|----|-------|------------|----------|
| US-01 | Prospective student | Register with my name, email, and password | I can start learning immediately |
| US-02 | Prospective student | Select my preferred language during signup | The platform can personalise content for me |
| US-03 | Prospective student | See inline validation errors before submitting | I can correct mistakes without a round-trip to the server |
| US-04 | Prospective student | See a clear error if my email is already taken | I know to log in instead of registering again |
| US-05 | Prospective student | Be automatically logged in after registration | I do not need to sign in immediately after creating an account |
| US-06 | Existing user | Find a link back to the login page | I can navigate there without using the browser back button |

---

## Functional Requirements

### FR-01: Registration Form Fields
The form must collect the following fields in order:
1. **Full Name** — text input, required.
2. **Email Address** — email input, required, must be a valid email format.
3. **Password** — password input, required, minimum 8 characters.
4. **Confirm Password** — password input, required, must match the Password field exactly.
5. **Language** — single-select dropdown, required, options fetched from `GET /api/languages`.

### FR-02: Language Dropdown
- On component mount, send `GET /api/languages`.
- Populate the `<select>` with the returned language options.
- While fetching, show a disabled placeholder ("Loading languages…").
- If the fetch fails, show a static fallback list (e.g. English only) and log the error.
- Default selection should be the first item returned by the API (typically English).

### FR-03: Client-Side Validation (Zod)
Validate the form data with a Zod schema before submitting:
- `name`: `z.string().min(1, "Name is required")`
- `email`: `z.string().email("Please enter a valid email address")`
- `password`: `z.string().min(8, "Password must be at least 8 characters")`
- `confirmPassword`: must equal `password` — use `.refine()` with message "Passwords do not match"
- `languageId`: `z.string().min(1, "Please select a language")`

Validation fires on submit attempt. Errors are displayed beneath each relevant field.

### FR-04: Account Creation
- On valid form data, send `POST /api/auth/register` with body `{ name, email, password, languageId }`.
- On `201 Created` → proceed to auto-login (FR-05).
- On `409 Conflict` (email taken) → display "An account with this email already exists."
- On other 4xx → display the error message from the response body if available.
- On 5xx or network error → display "Something went wrong. Please try again."

### FR-05: Auto-Login After Registration
- After successful account creation, call `signIn("credentials", { email, password, redirect: false })`.
- On success, read the session role (should always be `STUDENT`) and redirect to `/topics`.
- If auto-login fails unexpectedly, redirect to `/login` with a success query param so the user can log in manually.

### FR-06: Navigation
- A "Already have an account? Sign in" link must navigate to `/login`.

### FR-07: Loading & Disabled States
- Submit button disabled and shows a loading spinner while the API call or auto-login is in flight.
- Language dropdown disabled while languages are loading.
- All inputs disabled during form submission to prevent edits mid-flight.

---

## Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| Performance | Languages API response must be cached at the edge or in-memory; page LCP < 2.5 s |
| Accessibility | All form fields must have associated `<label>` elements; error messages linked via `aria-describedby`; `aria-invalid` set on fields with errors |
| Responsiveness | Card centred on all screen sizes ≥ 320 px; no horizontal scroll |
| Security | Password never logged, stored in localStorage, or included in error messages |
| Validation | Zod schema is the single source of truth for field rules; server re-validates independently |
| Browser Support | Chrome 120+, Firefox 120+, Safari 17+, Edge 120+ |

---

## UI/UX Requirements

### Layout
- Identical background treatment to the Login page: blue-to-purple gradient, full viewport.
- Glassmorphism card, same visual language as Login.
- Because the Register form is taller, the card should be scrollable on very short viewports (`overflow-y-auto` on the wrapper).

### Card Contents (top to bottom)
1. Platform logo or wordmark ("VC Class")
2. Page heading: "Create an Account"
3. Sub-heading: "Join VC Class and start learning"
4. Full Name input with label + error
5. Email input with label + error
6. Password input with label + error (optional show/hide toggle)
7. Confirm Password input with label + error (optional show/hide toggle)
8. Language dropdown with label + error
9. Global error message area (for server errors)
10. Submit button ("Create Account") — full width
11. "Already have an account? Sign in" link

### Field Error Display
- Each field error appears directly below its input in red/warning colour.
- Errors are shown only after the first submit attempt (not on blur) to reduce noise.
- After first submit, subsequent field changes re-validate in real-time.

### Interaction Design
- Password and Confirm Password fields optionally include a show/hide eye-icon toggle.
- Language dropdown styled to match the glassmorphism theme.
- Submit button transitions to "Creating account…" with spinner on click.

---

## Edge Cases

| Scenario | Expected Behaviour |
|----------|--------------------|
| Email already registered | `409` response → inline error "An account with this email already exists." with link to login |
| Languages API is down | Fallback list shown; user can still register |
| Auto-login fails after successful registration | Redirect to `/login?registered=true`; login page shows success notice |
| User submits with mismatched passwords | Zod error shown under Confirm Password; no API call made |
| User pastes password into Confirm Password | Matching is still validated on submit |
| Very long name or email | Server should enforce DB constraints; client shows server error message |
| Network drops mid-submission | Generic error shown; form re-enabled; no duplicate account created (server is idempotent on email uniqueness) |
| User navigates away mid-fill | No data is persisted; state resets on re-mount |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Registration completion rate | ≥ 70% of users who start the form complete registration |
| Time to complete form | Median < 90 seconds |
| Validation error rate (server-side) | < 5% of submitted forms fail server validation (Zod catches the rest) |
| Auto-login success rate | ≥ 99% of successful registrations result in automatic login |
| Accessibility audit score | 100 / 100 (Lighthouse) |
