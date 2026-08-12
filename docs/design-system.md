# GAP Design System

**Status:** Active
**Last updated:** 2026-08-12
**Source of truth for:** Brand use, visual tokens, UI patterns, responsive behavior, and accessibility

## Direction

GAP, the Growth Analyst Program, is an internal consulting-firm analyst development
portal: clean, modern,
professional, restrained, and warm. Favor strong typography, whitespace, thin borders,
clear hierarchy, and a single green accent. Avoid school-LMS styling, excessive cards,
decorative analytics, gradients used as spectacle, and visual clutter.

## Brand authority

1. `design_references/180DC Brand Identity Design Guide Draft (1).pdf` is the primary
   UC Davis visual guide.
2. `design_references/180DC Brand Guidelines 2024.pdf` governs global logo handling and
   voice where it does not conflict with the UC Davis guide.
3. The UC Davis guide wins on conflicting palette and typography choices.

## Color tokens

| Token | Value | Use |
| --- | --- | --- |
| Charcoal | `#434343` | Primary text, dark surfaces, headings |
| Brand green | `#55B441` | Primary actions, selected states, highlights |
| Deep green | `#519D39` | Hover/pressed states and restrained secondary accents |
| White | `#FFFFFF` | Main backgrounds and reversed text |

Implementation may add neutral tints derived from charcoal and white for page
backgrounds, muted text, borders, and disabled states. Status colors may add accessible
amber and red only when semantic meaning requires them. Green must not communicate an
error or overdue state.

## Typography

- Use Montserrat through `next/font/google` for MVP display and interface text.
- Proxima Nova is the preferred display face only if licensed font files are supplied and
  can be self-hosted through `next/font/local`.
- Do not fetch fonts through stylesheet links.
- Use bold, compact display headings; readable body sizes; and restrained uppercase
  tracking for section labels.
- Do not copy the PDF's print point sizes literally into the responsive web UI.

## Logo assets

Original approved assets live in `design_references/Official Logos/` and must remain
unchanged. Runtime copies should be normalized into `public/brand/` with predictable,
descriptive filenames.

| Runtime asset | Source use |
| --- | --- |
| `180dc-uc-davis-primary-dark.png` / `-light.png` | Full branch lockup for spacious light/dark surfaces |
| `180dc-uc-davis-compact-dark.png` / `-light.png` | Short branch lockup for compact light/dark surfaces |
| `180dc-uc-davis-landscape-dark.png` / `-light.png` | Horizontal navigation and page headers |
| `180dc-globe.png` | Compact mark where branch identity is already established |

- Use the full black-text UC Davis lockup on light sign-in or presentation surfaces.
- Use the matching white-text lockup on dark surfaces.
- Use a short UC Davis lockup for compact navigation.
- Use the globe only for favicon, avatar-like, or small-space treatment where the full
  branch identity is already visible elsewhere.
- Never recolor, distort, shadow, redraw, or add elements to a logo.
- Preserve transparency, aspect ratio, and clear space. Transparent canvas cropping is
  allowed if no visible pixels are changed.
- Provide meaningful alt text when the logo communicates identity; use empty alt text
  when nearby text repeats the complete name.

## Core UI patterns

- **Application shell:** compact brand header, clear page title, profile control, and
  minimal navigation.
- **Primary action:** solid brand green with white text and deep-green hover.
- **Secondary action:** white/neutral surface with charcoal border and text.
- **Cards:** white or near-white, subtle border, modest radius, minimal shadow.
- **Status badges:** short text labels with icon/color as redundant cues; never color
  alone.
- **Progress:** thin linear bar plus a textual value such as `2 / 6 modules complete`.
- **Forms:** visible labels, help/error text, clear focus rings, and full-width controls on
  small screens.
- **Tables:** quiet dividers and sticky/clear headers; use horizontal scrolling or cards
  on narrow screens.
- **Empty/error states:** concise explanation and one useful next action; no fake data.

## Responsive behavior

- Design student pages mobile-first in behavior even when composing desktop-first.
- Cards stack, deadlines stay near assignment titles, and submission controls remain
  thumb-friendly on small screens.
- Avoid fixed widths that cause horizontal overflow.
- Admin pages may prioritize desktop density but must remain operable on mobile.

## Accessibility baseline

- Meet WCAG AA color contrast for text and interactive controls.
- Provide visible keyboard focus and logical focus order.
- Use semantic headings, links, buttons, labels, tables, and status announcements.
- Ensure targets are at least 44 by 44 CSS pixels where practical.
- Do not hide essential information behind hover.
- Respect reduced-motion preferences and use motion only to clarify state.
