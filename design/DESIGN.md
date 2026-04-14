# VC Class Design System

## 1. Visual Theme & Atmosphere

VC Class is an EdTech platform for language learning — a classroom tool where teachers create vocabulary tests and students take structured exams. The design operates on two distinct visual modes:

**Platform UI** (teacher dashboard, student navigation, results) uses a clean, functional aesthetic built on airy blue-grays and scholarly deep purple (`#2a14b4`) as the primary brand accent. Surfaces are layered with tonal shifts rather than heavy borders, creating a calm, organized workspace.

**Exam Experience** (student test-taking) adopts the "Intellectual Sanctuary" philosophy — a focused, serene environment inspired by editorial design and quiet libraries. It uses warmer purple tones (`#5e35f1`), glassmorphism floating elements, and gradient CTAs to create an immersive testing experience that reduces cognitive load.

The typography uses **Roboto** — loaded via `next/font/google` at weights 400, 500, 700 with Latin + Vietnamese subsets. Applied globally through `font-body` utility class and `--font-roboto` CSS variable.

**Key Characteristics:**
- Airy blue-white canvas (`#f8f9ff` for pages) — never pure white backgrounds on pages
- Deep scholarly purple (`#2a14b4`) as primary brand accent throughout
- M3-inspired elevated cards — elevation via shadow, not borders
- Surface tonal hierarchy — sections defined by background color shifts, not divider lines
- Glassmorphism for floating/sticky elements (70% opacity, 24px backdrop-blur)
- Gradient CTAs: `linear-gradient(45deg, #5e35f1, #6b45fe)` for high-importance actions
- Material Symbols Outlined for all icons
- Toast notifications via Sonner (top-center, max 4, 3s duration)
- Animations via Framer Motion (`motion/react`)
- MUI-inspired ripple effect on all buttons (opt-out with `.no-ripple`)
- No pure black (`#000000`) anywhere — text uses `#121c2a` (warm dark navy)

---

## 2. Color Palette & Roles

### Brand Primary
| Token | Hex | Usage |
|-------|-----|-------|
| Deep Purple | `#2a14b4` | Primary brand, active toggles, selected states, primary buttons |
| Medium Purple | `#4338ca` | Hover state for primary buttons |
| Violet | `#6d28d9` | Gradient endpoint for CTAs |
| Light Purple | `#e3dfff` | Icon backgrounds, badges, selected surfaces, avatar bg |
| Surface Purple | `#f0eef6` | Hover backgrounds, secondary surfaces, input backgrounds |
| Hover Purple | `#f5f3ff` | Card hover, dropdown item hover |
| Input Blue | `#d9e3f6` | Search input backgrounds (at 50% opacity) |
| Nav Blue | `#eff4ff` | Navigation background (at 80% opacity), table header |
| Page Background | `#f8f9ff` | Student and teacher page backgrounds |

### Exam-Specific (CSS Variables)
| Variable | Hex | Usage |
|----------|-----|-------|
| `--exam-primary` | `#5e35f1` | Exam brand primary, gradient start |
| `--exam-primary-container` | `#6b45fe` | Gradient CTA endpoint |
| `--exam-surface` | `#fdf8fe` | Exam page background |
| `--exam-surface-low` | `#f7f2fa` | Secondary surfaces, filter chip bg |
| `--exam-surface-container` | `#f1ecf6` | Active workspace areas |
| `--exam-surface-highest` | `#e5e0ed` | Elevated states, modals |
| `--exam-on-surface` | `#33313a` | Primary text in exam |
| `--exam-on-surface-variant` | `#777586` | Secondary text in exam |

### Text Scale
| Token | Hex | Usage |
|-------|-----|-------|
| Near Black | `#121c2a` | Primary headings, strong text — warm, never pure black |
| Dark Gray | `#464554` | Secondary text, descriptions |
| Muted | `#777586` | Tertiary text, labels, timestamps, placeholders |
| Light Muted | `#c7c4d7` | Borders (at 15-30% opacity), disabled icon states, dividers |

### Semantic Colors
| Role | Text | Background | Usage |
|------|------|------------|-------|
| Success | `#1b6b51` | `#a6f2d1` at 30-40% | Correct answers, active status, positive |
| Error | `#7b0020` | `#ffdada` at 20-50% | Wrong answers, destructive, critical |
| Warning | `#92400e` text / `#f59e0b` icon | `#fef3c7` | Draft status, flagged items, timer warnings |
| Info | `#1e40af` | `#dbeafe` | Grading status, informational |

### Score Color Thresholds
| Range | Color |
|-------|-------|
| >= 80% | `text-[#1b6b51]` (green) |
| 50-79% | `text-[#2a14b4]` (purple) |
| < 50% | `text-[#7b0020]` (red) |

---

## 3. Typography Rules

### Font Family
- **Primary**: Roboto via `next/font/google`, variable `--font-roboto`
- **Weights loaded**: 400, 500, 700
- **Subsets**: Latin, Vietnamese
- **Applied as**: `font-body` utility class
- **Base size**: 16px, line-height 1.6

### Hierarchy

| Role | Size | Weight | Class Pattern | Usage |
|------|------|--------|---------------|-------|
| Page Title | 24px | 700 | `text-2xl font-body font-bold text-[#121c2a]` | Page headings, modal titles |
| Section Heading | 20px | 700 | `text-xl font-body font-bold text-[#121c2a]` | Section headers |
| Card Title | 16px | 700 | `text-base font-body font-bold text-[#121c2a]` | Card headings, list titles |
| Body | 14px | 400 | `text-sm font-body text-[#464554]` | Body text, descriptions |
| Body Medium | 14px | 500 | `text-sm font-body font-medium text-[#121c2a]` | Emphasized body |
| Body Semibold | 14px | 600 | `text-sm font-body font-semibold text-[#121c2a]` | Strong emphasis |
| Small | 12px | 400 | `text-xs font-body text-[#777586]` | Metadata, timestamps |
| Label | 10px | 700 | `text-[10px] font-body font-bold uppercase tracking-widest text-[#777586]` | Form labels |
| Section Label | 10px | 700 | `text-[10px] font-body font-bold uppercase tracking-widest text-[#2a14b4]` | Group headers ("GENERAL") |
| Badge | 9-10px | 700 | `text-[9px] font-body font-bold px-2 py-0.5 rounded-full` | Status badges |
| Table Header | 12px | 800 | `text-xs font-body font-extrabold uppercase tracking-[0.08em] text-[#121c2a]` | Column headers |

### Principles
- Labels are always `uppercase tracking-widest`
- Headings use `#121c2a` — never pure `#000000`
- Muted text is `#777586`
- `font-body` class on every text element
- No weight 300 or 400 for headings — 500+ always

---

## 4. Component Stylings

### Buttons

| Variant | Classes |
|---------|---------|
| Primary | `bg-[#2a14b4] hover:bg-[#4338ca] text-white px-6 py-2.5 rounded-full font-body font-bold text-sm shadow-lg shadow-[#2a14b4]/15 transition-all disabled:opacity-40` |
| Gradient CTA | `exam-cta text-white px-5 py-2.5 rounded-full font-body font-bold text-sm shadow-lg shadow-[#5e35f1]/20` |
| Secondary | `bg-[#f0eef6] hover:bg-[#e3dfff] text-[#464554] hover:text-[#121c2a] px-6 py-2.5 rounded-full font-body font-medium text-sm` |
| Danger | `bg-[#7b0020] hover:bg-[#5c0017] text-white px-5 py-2 rounded-full font-body font-bold text-sm shadow-lg shadow-[#7b0020]/15` |
| Danger Ghost | `text-[#7b0020] bg-[#ffdada]/20 hover:bg-[#ffdada]/40 rounded-full` |
| Icon (32px) | `w-8 h-8 rounded-full flex items-center justify-center text-[#777586] hover:bg-[#f0eef6] hover:text-[#2a14b4] transition-colors` |
| Icon (28px) | `w-7 h-7 rounded-full flex items-center justify-center text-[#777586] hover:bg-[#f0eef6] transition-colors` |

Opt-out of global ripple: `className="no-ripple"`

### Cards

| Variant | Classes |
|---------|---------|
| M3 Elevated | `rounded-2xl p-5 bg-white shadow-[0_1px_3px_1px_rgba(0,0,0,0.06),0_1px_2px_0_rgba(0,0,0,0.1)] hover:shadow-[0_4px_8px_3px_rgba(0,0,0,0.08),0_1px_3px_0_rgba(0,0,0,0.1)] hover:-translate-y-0.5 transition-all` |
| M3 Container | `rounded-2xl bg-white shadow-[0_1px_3px_1px_rgba(0,0,0,0.06),0_1px_2px_0_rgba(0,0,0,0.1)] overflow-hidden` |
| M3 Selected | `bg-[#e3dfff]/20 shadow-[0_1px_3px_1px_rgba(42,20,180,0.08),0_1px_2px_0_rgba(42,20,180,0.06)] ring-1 ring-[#2a14b4]/10` |
| Legacy | `bg-white rounded-xl ambient-shadow p-5 border border-transparent hover:border-[#2a14b4]/10 hover:bg-[#f5f3ff]` |

### Status Badges

Pattern: `inline-flex items-center gap-1 text-[9px] font-body font-bold px-2 py-0.5 rounded-full`

| Status | Style |
|--------|-------|
| Active / Success | `bg-[#a6f2d1]/30 text-[#1b6b51]` |
| Draft / Warning | `bg-[#fef3c7] text-[#92400e]` |
| Inactive / Muted | `bg-[#e5e0ed]/50 text-[#777586]` |
| Error / Danger | `bg-[#ffdada]/50 text-[#7b0020]` |
| Info / Grading | `bg-[#dbeafe] text-[#1e40af]` |
| Primary / Graded | `bg-[#e3dfff] text-[#5e35f1]` |

With icon: `<span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>icon</span>` before label.

### Form Inputs

| Variant | Classes |
|---------|---------|
| Text | `w-full px-4 py-3 rounded-lg bg-[#d9e3f6]/30 border-0 focus:outline-none focus:ring-2 focus:ring-[#2a14b4]/30 font-body text-[#121c2a] placeholder:text-[#777586]` |
| Search (Pill) | `w-full pl-9 pr-3 py-2 bg-[#f7f2fa] rounded-full text-xs font-body focus:ring-2 focus:ring-[#2a14b4]/20 outline-none border border-transparent focus:border-[#2a14b4]/20` |
| Number | `w-16 px-2 py-0.5 rounded-lg border border-[#c7c4d7]/30 text-sm font-body font-bold text-[#121c2a] focus:ring-1 focus:ring-[#2a14b4]/20 outline-none` |
| Textarea | `w-full px-4 py-3 rounded-xl border border-[#c7c4d7]/20 bg-[#f8f9ff] focus:outline-none focus:ring-2 focus:ring-[#2a14b4]/20 text-sm font-body placeholder:text-[#464554]/40 resize-none` |
| Checkbox | `w-4 h-4 rounded-sm border-[#c7c4d7] text-[#2a14b4] focus:ring-[#2a14b4]/20` |
| Label | `text-[10px] font-body font-bold uppercase tracking-widest text-[#777586] mb-1.5` |

### Toggle Switch
```html
<div className="relative">
  <input type="checkbox" className="sr-only peer" />
  <div className="w-10 h-6 bg-[#c7c4d7]/30 rounded-full peer-checked:bg-[#2a14b4] transition-colors" />
  <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm peer-checked:translate-x-4 transition-transform" />
</div>
```

### Filter Chips (M3)
- **Active**: `bg-[#2a14b4] text-white shadow-[0_1px_3px_rgba(42,20,180,0.3)] px-3 py-1.5 rounded-full text-[10px] font-body font-bold`
- **Inactive**: `bg-[#f7f2fa] text-[#777586] hover:bg-[#e3dfff] hover:text-[#2a14b4] px-3 py-1.5 rounded-full text-[10px] font-body font-bold`
- With icon: `inline-flex items-center gap-1` + `material-symbols-outlined text-[12px]`

### Dropdown (M3 Chip-Style)
- `appearance-none pl-3 pr-7 py-1.5 rounded-full text-[11px] font-body font-bold bg-[#f7f2fa] text-[#2a14b4] hover:bg-[#e3dfff] cursor-pointer outline-none`
- Chevron: `material-symbols-outlined text-[12px] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[#777586]`

### Tooltip
`<Tooltip content="..." position="top|bottom" align="left|center|right" />` from `@/components/Tooltip`. Dark bg `#121c2a`, white text, arrow pointer, hover-reveal.

### Modal
`<ModalOverlay open={bool} onClose={fn} panelClass="max-w-md">`. Spring animation (damping: 25, stiffness: 300). Backdrop blur + dark overlay. Escape/click-outside closes.

### Glass Effects
```css
.glass-card { background: rgba(255,255,255,0.7); backdrop-filter: blur(24px); }
.glass-nav  { backdrop-filter: blur(24px); }
.exam-glass { background: rgba(253,248,254,0.7); backdrop-filter: blur(24px); }
.exam-ghost-border { outline: 1px solid rgba(199,196,215,0.15); }
```

### Icons (Material Symbols Outlined)
- Usage: `<span className="material-symbols-outlined text-[18px]">icon_name</span>`
- Filled: `style={{ fontVariationSettings: "'FILL' 1" }}`
- Sizes: 10px (badge) → 12px (chip) → 14px (small action) → 16px (standard) → 18px (section) → 20px (card hero) → 28-32px (empty state)

### Tables
- Container: `bg-white rounded-xl overflow-hidden shadow-[0px_20px_40px_rgba(18,28,42,0.04)]`
- Header: `bg-[#eff4ff] text-xs font-extrabold uppercase tracking-[0.08em] text-[#121c2a]`
- Cell: `px-6 py-4 text-sm font-body text-[#464554]`
- Row hover: `hover:bg-[#e3dfff]/50 transition-colors duration-200`
- Mobile: card list with `hidden md:block` on table

### Avatars
- Pattern: `rounded-full bg-[#e3dfff] flex items-center justify-center font-body font-bold text-[#2a14b4]`
- Sizes: `w-6 h-6 text-[10px]` (small) / `w-9 h-9 text-xs` (default) / `w-10 h-10 text-sm` (medium) / `w-12 h-12 text-base` (large)
- Initials: `name.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase()`

### Loading States
- Block spinner: `material-symbols-outlined animate-spin text-[#2a14b4] text-2xl` with `progress_activity`
- Inline spinner: `text-[16px] animate-spin` inside buttons
- Progress bar: `h-[3px] bg-[#2a14b4] animate-[loading-bar_1.5s_ease-in-out_infinite]`
- Toggle loading: `.toggle-loading` / `.toggle-loading-active` CSS classes

### Empty States
```html
<div className="py-10 text-center">
  <div className="w-14 h-14 rounded-2xl bg-[#f7f2fa] flex items-center justify-center mx-auto mb-3">
    <span className="material-symbols-outlined text-[28px] text-[#c7c4d7]">icon_name</span>
  </div>
  <p className="text-sm font-body text-[#777586] mb-1">Primary message</p>
  <p className="text-xs font-body text-[#c7c4d7]">Secondary hint</p>
</div>
```

### Toast Messages (Sonner)
- Config: `position="top-center" visibleToasts={4} duration={3000}`
- Success: `toast.success("${label} saved successfully")`
- Error: `toast.error("Failed to save ${label}")`
- Validation: `toast.error("Select questions first")`

### Animations
- **Framer Motion**: spring `{ damping: 25, stiffness: 300 }` for modals, `{ damping: 15, stiffness: 300 }` for pop-ins
- **CSS transitions**: `transition-all duration-200` (default), `duration-300` (cards)
- **Hover lift**: `hover:-translate-y-0.5`
- **Keyframes**: `ripple` (1.5s), `loading-bar` (1.5s infinite), `toggle-spin` (0.8s infinite)
- **Tailwind**: `animate-spin` (spinners), `animate-pulse` (timer warning)

---

## 5. Layout Principles

### Page Structure

**Student Layout**
```
min-h-screen bg-[#f8f9ff]
├── StudentNavbar (sticky top-0 z-50, glass-nav bg-[#eff4ff]/80)
│   └── max-w-screen-2xl mx-auto px-8 py-4
└── main (max-w-screen-2xl mx-auto px-8 pt-12 pb-20)
```

**Teacher Layout**
```
min-h-screen bg-[#f8f9ff]
├── TeacherShell (sidebar + content)
│   ├── Sidebar navigation
│   └── Main area
│       ├── Header (sticky top-0 z-50, bg-[#f8f9ff]/80 backdrop-blur-md, px-4 md:px-8 lg:px-12 py-4)
│       └── Content (px-4 md:px-8 lg:px-12 pb-10)
```

**Exam Layout (Full Viewport)**
```
min-h-screen flex flex-col bg-[var(--exam-surface)]
├── ExamHeader (sticky top-0 z-30)
├── Content area (flex-1 overflow-y-auto)
└── ExamFooter (sticky bottom-0 z-30, exam-glass)
```

### Spacing
- **Base unit**: 4px (Tailwind)
- **Card padding**: `p-5` (20px)
- **Gap**: `gap-3` (12px), `gap-4` (16px), `gap-5` (20px)
- **Section spacing**: `space-y-4` to `space-y-6`
- **Page padding**: `px-8` (student), `px-4 md:px-8 lg:px-12` (teacher)

### Grids
- Cards: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5`
- Forms: `grid-cols-1 sm:grid-cols-3 gap-3`
- Stats: `grid-cols-2 md:grid-cols-4 gap-3`

### Border Radius
| Token | Value | Usage |
|-------|-------|-------|
| rounded-lg | 8px | Inputs, icon backgrounds |
| rounded-xl | 12px | Legacy cards, small panels |
| rounded-2xl | 16px | M3 cards, modals |
| rounded-full | 9999px | Buttons, badges, chips, pills |

### Dividers
- Horizontal: `border-t border-[#c7c4d7]/15`
- Vertical: `h-6 w-px bg-[#c7c4d7]/30`
- Section: `pt-3 mt-3 border-t border-[#c7c4d7]/8`

---

## 6. Depth & Elevation

| Level | Name | CSS | Use |
|-------|------|-----|-----|
| 0 | Flat | — | Page bg, text |
| 1 | M3 Resting | `shadow-[0_1px_3px_1px_rgba(0,0,0,0.06),0_1px_2px_0_rgba(0,0,0,0.1)]` | Cards at rest |
| 2 | M3 Hover | `shadow-[0_4px_8px_3px_rgba(0,0,0,0.08),0_1px_3px_0_rgba(0,0,0,0.1)]` | Card hover |
| 1-alt | Ambient | `0px 20px 40px rgba(18,28,42,0.06)` | `.ambient-shadow` |
| 2-alt | Button Hover | `0 2px 4px -1px rgba(0,0,0,0.12), 0 4px 5px rgba(0,0,0,0.08), 0 1px 10px rgba(0,0,0,0.06)` | Global button hover |
| 3 | Dropdown | `0px 20px 40px rgba(18,28,42,0.12)` | Menus, notification |
| tinted | Primary | `shadow-lg shadow-[#2a14b4]/15` | CTAs |
| glass | Glass | `rgba(253,248,254,0.7) + blur(24px)` | Sticky nav, footer |

**Rules**: Elevation via shadow, not borders. Hover lifts cards `-translate-y-0.5`. Selected uses primary-tinted shadow `rgba(42,20,180,0.08)` + `ring-1 ring-[#2a14b4]/10`.

---

## 7. Do's and Don'ts

### Do
- **Do** use `#121c2a` (warm near-black) for text — it creates ink-on-paper warmth
- **Do** use `#f8f9ff` as page background — never pure white pages
- **Do** use `rounded-full` for all buttons — pill shape is the system standard
- **Do** use `rounded-2xl` (16px) for card containers — M3 large shape
- **Do** use M3 shadow system for card elevation — shadow replaces borders
- **Do** use `font-body` class on every text element for font consistency
- **Do** use `text-[10px] uppercase tracking-widest font-bold` for all labels
- **Do** use semantic color pairs (text + tinted background) for status badges
- **Do** use `focus:ring-2 focus:ring-[#2a14b4]/20` for form focus states
- **Do** use Material Symbols Outlined for all icons — single icon system
- **Do** use `<Tooltip>` component for all tooltips — don't inline tooltip markup
- **Do** use Framer Motion spring animations for modals and overlays
- **Do** use `toast.success("Label saved successfully")` format for save confirmations
- **Do** use ghost borders (`rgba(199,196,215,0.15)`) when a border is absolutely needed
- **Do** use `hover:-translate-y-0.5` with enhanced shadow for card hover lift

### Don't
- **Don't** use pure black (`#000000`) for text — always `#121c2a`
- **Don't** use `#ffffff` as page background — use `#f8f9ff` (pages) or `#fdf8fe` (exam)
- **Don't** use 1px solid borders to separate sections — use background tonal shifts or spacing
- **Don't** use hard shadow opacity (>0.12 primary layer) — shadows should feel natural
- **Don't** use `rounded-md` or sharp corners on cards — minimum `rounded-xl` (12px)
- **Don't** use thin font weights (300, 400) for headings — 500 minimum
- **Don't** add `font-body` to code blocks or pre-formatted text
- **Don't** use inline tooltip markup — always use the `<Tooltip>` component
- **Don't** use different icon libraries — Material Symbols Outlined only
- **Don't** use `alert()` or `confirm()` for user feedback — use toast or ModalOverlay
- **Don't** mix M3 shadow cards with bordered cards in the same view
- **Don't** use colored backgrounds for large surfaces — purple is accent only (buttons, badges, toggles)
- **Don't** forget `disabled:opacity-40 disabled:cursor-not-allowed` on buttons
- **Don't** use `onChange` for number inputs — use local draft state + `onBlur` to save

---

## 8. Responsive Behavior

### Breakpoints (Tailwind defaults)
| Name | Prefix | Width | Key Changes |
|------|--------|-------|-------------|
| Mobile | (none) | <640px | Single column, cards instead of tables, compact nav |
| Small | sm: | 640px+ | 2-column grids, form grids expand |
| Medium | md: | 768px+ | Desktop tables, sidebar expands |
| Large | lg: | 1024px+ | 3-column grids, full padding |
| Extra Large | xl: | 1280px+ | 4-column grids |
| 2XL | 2xl: | 1536px+ | Max container width |

### Collapsing Strategy
- **Card grids**: `xl:4 → lg:3 → sm:2 → 1` columns
- **Form grids**: `sm:3 → 1` columns
- **Breadcrumbs**: Full trail → last segment on mobile
- **Action buttons**: Text + icon → icon only (`hidden sm:inline` on text)
- **Tables**: `hidden md:block` → card list on mobile
- **Exam footer**: `env(safe-area-inset-bottom)` for mobile
- **Nav items**: `hidden sm:block` for non-essential elements

### Touch Targets
- Exam minimum: 44px (`min-w-[44px] min-h-[44px]`)
- Icon buttons: `w-8 h-8` (32px) standard, `w-7 h-7` (28px) dense
- Toggle: `w-10 h-6` (40x24px)
- Filter chips: `px-3 py-1.5`

---

## 9. Agent Prompt Guide

### Quick Color Reference
```
Page bg:          #f8f9ff
Card bg:          #ffffff
Primary:          #2a14b4
Primary hover:    #4338ca
Exam primary:     #5e35f1
Text heading:     #121c2a
Text body:        #464554
Text muted:       #777586
Text disabled:    #c7c4d7
Success:          #1b6b51 on #a6f2d1/30
Error:            #7b0020 on #ffdada/20
Warning:          #92400e on #fef3c7
Info:             #1e40af on #dbeafe
Ghost border:     rgba(199,196,215,0.15)
```

### Example Component Prompts
- "Create a card: `rounded-2xl p-5 bg-white` with M3 Level 1 shadow. Title `text-base font-body font-bold text-[#121c2a]`, subtitle `text-xs text-[#464554]`. Hover: Level 2 shadow + `-translate-y-0.5`."
- "Create a primary button: `bg-[#2a14b4] hover:bg-[#4338ca] text-white px-6 py-2.5 rounded-full font-body font-bold text-sm shadow-lg shadow-[#2a14b4]/15`."
- "Create a status badge: `inline-flex items-center gap-1 text-[9px] font-body font-bold px-2 py-0.5 rounded-full`. Green: `bg-[#a6f2d1]/30 text-[#1b6b51]`."
- "Create a filter chip bar: `flex gap-1`. Active chip: `bg-[#2a14b4] text-white rounded-full`. Inactive: `bg-[#f7f2fa] text-[#777586]`."
- "Create a table: header `bg-[#eff4ff] text-xs font-extrabold uppercase tracking-[0.08em]`. Rows `hover:bg-[#e3dfff]/50`. Cells `px-6 py-4 text-sm text-[#464554]`."
- "Create an empty state: `w-14 h-14 rounded-2xl bg-[#f7f2fa]` icon container, `text-[28px] text-[#c7c4d7]` icon, `text-sm text-[#777586]` message."
- "Create a loading spinner: `material-symbols-outlined animate-spin text-[#2a14b4] text-2xl` + `progress_activity`."
- "Create an avatar: `w-9 h-9 rounded-full bg-[#e3dfff] text-xs font-bold text-[#2a14b4]` + uppercase initials."
- "Create a tooltip: `<Tooltip content='...' position='top' />` from `@/components/Tooltip`."
- "Create a form label: `text-[10px] font-body font-bold uppercase tracking-widest text-[#777586]`."

### Iteration Checklist
1. Page bg `#f8f9ff` — never pure white
2. Cards `rounded-2xl bg-white` with M3 shadow — no border
3. Purple `#2a14b4` — buttons, toggles, active states
4. Text: `#121c2a` → `#464554` → `#777586` → `#c7c4d7`
5. Labels: `text-[10px] uppercase tracking-widest font-bold text-[#777586]`
6. Buttons: `rounded-full` pill shape always
7. Status badges: semantic color + tinted background
8. Elevation via shadow — not borders
9. Icons: Material Symbols Outlined, `text-[18px]`
10. Toast: `toast.success("Label saved successfully")`
11. Loading: `progress_activity` + `animate-spin`
12. Empty state: icon in `rounded-2xl bg-[#f7f2fa]`
13. Focus: `focus:ring-2 focus:ring-[#2a14b4]/20`
14. Hover lift: `-translate-y-0.5` on cards
15. Animations: Framer Motion spring for modals

### Reusable Components
| Component | Path | Key Props |
|-----------|------|-----------|
| `Tooltip` | `@/components/Tooltip` | `content`, `position`, `align`, `maxWidth` |
| `ModalOverlay` | `@/components/ModalOverlay` | `open`, `onClose`, `panelClass` |
| `NotificationBell` | `@/components/NotificationBell` | self-contained |
| `ExamStatusBadge` | `@/components/exam/ExamStatusBadge` | `testStatus`, `sessionStatus` |
| `ExamEntryGate` | `@/components/exam/ExamEntryGate` | test info, session state, children |
| `ExamShell` | `@/components/exam/ExamShell` | questions, sections, timing, shuffle |
| `QuestionRenderer` | `@/components/exam/QuestionRenderer` | question, answer, flags, shuffle |
| `FlagButton` | `@/components/exam/FlagButton` | `isFlagged`, `onToggle` |
