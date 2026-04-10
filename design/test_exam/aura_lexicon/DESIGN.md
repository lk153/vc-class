# Design System Specification: Scholarly Sophistication

## 1. Overview & Creative North Star: "The Intellectual Sanctuary"
This design system is built to transform the high-stakes environment of examination into a space of focused serenity. Our Creative North Star is **"The Intellectual Sanctuary."** We reject the cluttered, high-stress aesthetics of traditional testing software in favor of an editorial, scholarly experience that feels like a quiet, well-lit library.

To move beyond a "template" look, we employ **Intentional Asymmetry** and **Tonal Depth**. By utilizing wide margins, off-center focal points for complex data, and a hierarchy driven by font scale rather than "loud" colors, we create a UI that recedes into the background, allowing the user's cognitive load to be dedicated entirely to the task at hand.

---

## 2. Colors & Surface Architecture
The palette is rooted in deep, scholarly purples and expansive, airy neutrals. We treat color not as decoration, but as a functional tool for focus.

### The "No-Line" Rule
**Prohibit 1px solid borders for sectioning.** Traditional lines create visual "noise" that traps the eye. Instead, define boundaries through:
- **Background Color Shifts:** Use `surface-container-low` sections against a `surface` background.
- **Tonal Transitions:** Define zones using subtle contrast between `surface-container` tiers.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Use the surface tiers to create "nested" depth:
- **Base Layer:** `surface` (#fdf8fe) for the main canvas.
- **Sectioning:** `surface-container-low` (#f7f2fa) for secondary navigation or sidebar utility.
- **Action Areas:** `surface-container` (#f1ecf6) for the primary workspace.
- **Interactive Focus:** `surface-container-highest` (#e5e0ed) for active modals or elevated states.

### The "Glass & Gradient" Rule
To elevate the experience, use **Glassmorphism** for floating elements (like progress trackers or floating action buttons). Apply `surface-container-lowest` with a 70% opacity and a `24px` backdrop-blur. 

**Signature Texture:** Use a subtle linear gradient (45deg) from `primary` (#5e35f1) to `primary-container` (#6b45fe) for high-importance CTAs. This adds a "soul" to the digital interface that flat hex codes cannot replicate.

---

## 3. Typography: Editorial Authority
We use **Manrope** for its geometric clarity and modern scholarly feel. The hierarchy is designed to feel like a premium academic journal.

*   **Display (lg/md/sm):** Used for score summaries or landing hero sections. These should be set with tight letter-spacing (-0.02em) to feel authoritative.
*   **Headline (lg/md/sm):** Reserved for section headers and exam titles. This is the primary driver of the "Editorial" look.
*   **Title (lg/md/sm):** Used for question stems. High contrast between `title-lg` (the question) and `body-md` (the options) is mandatory.
*   **Body (lg/md):** Optimized for long-form reading. Line height for `body-lg` must be at least 1.6x to ensure maximum legibility during timed exams.
*   **Label (md/sm):** Used for metadata, timers, and micro-copy. Always set in `on-surface-variant` to keep them secondary.

---

## 4. Elevation & Depth: The Layering Principle
We move away from the "shadow-heavy" look of 2010s design. Depth is achieved through **Tonal Layering**.

*   **Natural Lift:** Instead of a shadow, place a `surface-container-lowest` card on a `surface-container-low` background. This creates a soft, tactile lift.
*   **Ambient Shadows:** When a "floating" effect is required (e.g., a dropdown), use a shadow color tinted with the primary hue: `rgba(94, 53, 241, 0.06)` with a `32px` blur and `12px` Y-offset. Never use pure grey or black for shadows.
*   **The "Ghost Border" Fallback:** If a border is required for accessibility, use `outline-variant` at **15% opacity**. High-contrast, 100% opaque borders are forbidden as they create "visual cages."

---

## 5. Components

### Buttons
- **Primary:** Gradient fill (`primary` to `primary-container`), `md` (0.75rem) rounded corners, `on-primary` text.
- **Secondary:** `secondary-container` fill with `on-secondary-container` text. No border.
- **Tertiary:** Text only, using `primary` color. Use for low-emphasis actions like "Save Draft."

### Examination Cards
- **The Rule:** No divider lines. Use `1.5rem` (xl) vertical spacing between question segments or a subtle background shift to `surface-container-low`.
- **Corner Radius:** Use `lg` (1rem) for card containers to maintain the "Soft Minimalist" feel.

### Input Fields (Essay & Short Answer)
- **Base:** `surface-container-lowest` fill.
- **Focus State:** 2px "Ghost Border" using `primary` at 40% opacity. 
- **Error State:** Shift background to `error_container` at 10% opacity; text remains `on_surface`. Avoid aggressive red backgrounds.

### Progress Indicators (The Focus Bar)
- Use a slim, horizontal bar at the top of the viewport.
- **Fill:** `primary` gradient. 
- **Background:** `surface-variant`.

---

## 6. Do’s and Don’ts

### Do
- **Do** use whitespace as a functional element. "Breathing room" is the most important tool for reducing test-taker anxiety.
- **Do** use `surface-tint` for subtle highlights in iconography to tie the brand together.
- **Do** ensure all interactive elements have a minimum touch/click target of 44px, despite the "refined" aesthetic.

### Don't
- **Don't** use pure black (#000000) for text. Always use `on-surface` (#33313a) to maintain a soft, high-end ink-on-paper feel.
- **Don't** use "Alert Red" for everything. Reserve `error` (#a8364b) for critical system failures; use `tertiary` for neutral warnings or "skipped" indicators.
- **Don't** use standard 90-degree corners. Everything must feel "held" and "softened" using the defined Roundedness Scale.