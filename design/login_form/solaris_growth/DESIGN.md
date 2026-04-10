# Design System Document: High-Energy Educational Experience

## 1. Overview & Creative North Star
### Creative North Star: "The Radiant Catalyst"
This design system is engineered to transform the educational journey from a chore into a high-octane pursuit of potential. Moving beyond the static, uninspired layouts of traditional learning tools, we embrace an **Editorial Glassmorphism** aesthetic. 

The "Radiant Catalyst" avoids the "template" look by utilizing intentional asymmetry, sweeping gradients, and overlapping layers that feel like physical sheets of frosted glass suspended in light. It is high-contrast, high-energy, and unapologetically bold, designed to move the user’s eye through content with momentum.

---

## 2. Colors
Our palette is a high-vibrancy transition from sunset ochres to deep, energetic violets. This is not just a color choice; it is a psychological driver of progress.

### Signature Palette (Material Design Tokens)
*   **Primary (The Energy):** `#a13920` (Burnt Orange) / **Primary Container:** `#fe7d5e` (Sunset Glow)
*   **Secondary (The Depth):** `#8930b0` (Vibrant Purple) / **Secondary Container:** `#f0c1ff` (Lavender Mist)
*   **Surface:** `#fff4f3` (Warm Pearl)
*   **On-Surface:** `#4e2120` (Deep Espresso)

### The "No-Line" Rule
**Designers are strictly prohibited from using 1px solid borders for sectioning.** 
Structural boundaries must be defined through background color shifts. Use `surface-container-low` for large content sections sitting on a `surface` background. The eye should perceive change through tonal shifts, not "boxes."

### The "Glass & Gradient" Rule
To achieve "visual soul," major CTAs and Hero sections must utilize linear gradients (e.g., `primary` to `primary-container`). For floating modals or navigation bars, apply **Glassmorphism**: 
*   **Color:** `surface` at 60-80% opacity.
*   **Effect:** `backdrop-blur` (20px to 40px).
*   **Detail:** A 0.5px "Ghost Border" (see Section 4) to catch the light.

---

## 3. Typography
We use a high-contrast pairing to balance accessibility with a modern, editorial edge.

*   **Display & Headlines (Lexend):** A geometric, highly legible sans-serif that feels friendly yet authoritative. Use `display-lg` (3.5rem) for major milestones and `headline-md` (1.75rem) for section starts.
*   **Body & Labels (Plus Jakarta Sans):** A sophisticated typeface with a tall x-height. 
    *   **Body-lg:** Used for instructional content to ensure high readability.
    *   **Title-md:** Used for card headers to provide a "premium" feel.

The hierarchy is intentionally extreme. We use large font sizes for encouragement ("Sẵn sàng học điều mới!") to create a sense of scale and importance.

---

## 4. Elevation & Depth
Depth is not a drop shadow; it is a physical relationship between layers.

### The Layering Principle
Stacking must follow the surface hierarchy. Place a `surface-container-lowest` card on a `surface-container-low` section. This creates a "soft lift" that feels architectural.

### Ambient Shadows
When a component must float (e.g., a primary button or a floating action button):
*   **Blur:** 24px - 48px.
*   **Opacity:** 6% - 10%.
*   **Color:** Use a tinted version of `on-surface` or `primary` rather than pure black. This mimics natural light bouncing off colored surfaces.

### The "Ghost Border" Fallback
If contrast is needed for accessibility, use the `outline-variant` token at **15% opacity**. This provides a hint of a boundary without the "heavy" look of a traditional border.

---

## 5. Components

### Buttons
*   **Primary:** Gradient fill (`primary` to `primary-container`), `full` roundedness (9999px). No border.
*   **Secondary:** Glass-style. `surface-container-highest` background at 40% opacity with a `backdrop-blur`.
*   **States:** On hover, increase the gradient intensity. On press, scale the button down to 98% to simulate physical depth.

### Input Fields
*   **Style:** `surface-container-lowest` background. 
*   **Shape:** `md` roundedness (1.5rem).
*   **Active State:** Instead of a thick border, use a 2px `primary` bottom-glow or a subtle `outline-variant` ghost border.

### Cards & Lists
*   **Forbid Dividers:** Do not use lines to separate list items. Use vertical white space from our spacing scale or alternate between `surface` and `surface-container-low`.
*   **Progress Cards:** Use glassmorphism overlays to show "completed" states, allowing the vibrant background gradients to peek through.

### Achievement Chips
*   Small, `full` rounded elements using `tertiary-container` to highlight streaks or points. These should feel like "jewels" in the UI.

---

## 6. Do’s and Don’ts

### Do:
*   **Use Asymmetry:** Overlap a glass card across a gradient background boundary to create a sense of motion.
*   **Embrace Large Radii:** Use `xl` (3rem) or `lg` (2rem) for main containers to keep the app feeling "friendly" and "soft."
*   **Color-Tint Shadows:** Always ensure shadows contain a hint of the brand’s warm palette.

### Don't:
*   **Don't use 100% Black Text:** Use `on-surface` (#4e2120) for a softer, more premium look.
*   **Don't use hard shadows:** If a shadow looks like a line, the blur is too low.
*   **Don't crowd the content:** This system requires "breathing room." If a screen feels busy, increase the padding and remove decorative elements.
*   **Don't use "System" Purple:** Stick to the sunset-to-purple gradient to maintain the unique "Radiant Catalyst" identity.