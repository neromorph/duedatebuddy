---
name: Obsidian Prime
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#c4c7c8'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#8e9192'
  outline-variant: '#444748'
  surface-tint: '#c6c6c7'
  primary: '#ffffff'
  on-primary: '#2f3131'
  primary-container: '#e2e2e2'
  on-primary-container: '#636565'
  inverse-primary: '#5d5f5f'
  secondary: '#85d2e0'
  on-secondary: '#00363d'
  secondary-container: '#006672'
  on-secondary-container: '#94e1ee'
  tertiary: '#ffffff'
  on-tertiary: '#2f3131'
  tertiary-container: '#e2e2e2'
  on-tertiary-container: '#636565'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c7'
  on-primary-fixed: '#1a1c1c'
  on-primary-fixed-variant: '#454747'
  secondary-fixed: '#a2effd'
  secondary-fixed-dim: '#85d2e0'
  on-secondary-fixed: '#001f24'
  on-secondary-fixed-variant: '#004f58'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c7'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#454747'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  margin-mobile: 16px
  margin-desktop: 32px
  gutter: 16px
  stack-sm: 4px
  stack-md: 12px
  stack-lg: 24px
---

## Brand & Style
The design system is engineered for high-stakes asset management, prioritizing extreme legibility and rapid information processing. The brand personality is authoritative, precise, and uncompromising. 

The design style utilizes **High-Contrast Minimalism**. By leveraging a pure black background, the interface eliminates visual noise, allowing critical data points and white action elements to command immediate attention. The aesthetic is "premium technical," evoking the feel of a high-end physical hardware interface or a specialized financial terminal.

**Emotional Response:** Confidence, clarity, security, and surgical precision.

## Colors
The palette is rooted in an absolute "OLED" black base to maximize contrast and reduce eye strain in low-light environments. 

- **Primary Action:** Pure White (#FFFFFF) is reserved exclusively for primary triggers and high-priority components, creating a "punch-out" effect against the black background.
- **Surface Tiers:** Depth is achieved through two specific neutral values: Surface-1 (#121212) for primary containers and Surface-2 (#1a1a1a) for hovering elements or secondary cards.
- **Accents:** Deep Teal (#006874) is used surgically for status indicators, active states, and data visualizations to provide a sophisticated color break without distracting from the core information.
- **Status:** Standard semantic colors (Success, Warning, Error) should be used at high saturation levels to ensure they remain accessible against the dark surfaces.

## Typography
This design system utilizes **Plus Jakarta Sans** for its modern, geometric structure and excellent legibility in dark modes. 

- **Hierarchy:** Use pure white (#FFFFFF) for headlines and primary body text. Use a 60% opacity white or light gray (#A0A0A0) for secondary metadata and labels to create a clear visual stack.
- **Spacing:** Given the high contrast, slightly increased line-height is used to prevent "halation" (where bright text appears to bleed into the black background).
- **Labels:** Small labels utilize a bold weight and slight letter spacing to ensure they remain crisp and readable at small scales.

## Layout & Spacing
The layout follows a strict **8px grid system**. The philosophy is "breathable density"—information is packed efficiently but separated by clear, rhythmic spacing to avoid visual clutter.

- **Grid:** Use a 12-column fluid grid for desktop and a 4-column grid for mobile.
- **Margins:** High-contrast designs require generous outer margins (24px-32px on desktop) to frame the content and prevent the UI from feeling cramped.
- **Alignment:** Elements should be strictly aligned to the grid to reinforce the sense of order and technical precision.

## Elevation & Depth
In a pure black environment, traditional shadows are ineffective. This design system uses **Tonal Layering** and **Subtle Outlines** to convey depth.

- **Level 0 (Background):** Pure Black (#000000). Use for the main canvas.
- **Level 1 (Card/Container):** Surface-1 (#121212). Use for the primary content blocks.
- **Level 2 (Active/Hover):** Surface-2 (#1a1a1a). Use for interacting with elements or nested containers.
- **Outlines:** Use a 1px solid border of #2A2A2A to define container boundaries where tonal shifts are too subtle. 
- **Inner Glow:** For high-priority cards, a very faint 1px inner stroke of white at 5% opacity can be used to simulate a "beveled edge" light catch.

## Shapes
The shape language is defined by **Rounded 8px** corners. This provides a balance between the "sharp" technical feel of the app and a modern, approachable software experience.

- **Small Components:** Checkboxes and small tags use a 4px radius.
- **Standard Components:** Buttons, input fields, and standard cards use the 8px radius.
- **Large Components:** Bottom sheets and large modal containers use a 16px or 24px top-radius to signify a separate functional layer.

## Components
- **Buttons:** 
  - *Primary:* Pure White background with #000000 bold text. No border.
  - *Secondary:* Transparent background with a 1px white border and white text.
  - *Tertiary:* Ghost style—white text with no background until hover.
- **Input Fields:** Background should be Surface-1 (#121212) with a subtle #2A2A2A border. On focus, the border becomes the Deep Teal (#006874).
- **Cards:** Use Surface-1 for the background. Content within cards should follow the typographic hierarchy (White for titles, Gray for details).
- **Chips/Status:** Use the Deep Teal (#006874) with 20% opacity for the background and 100% opacity for the text/icon to create a "tinted" effect that is visible but not overwhelming.
- **Asset Trackers:** Data rows should have a thin #1A1A1A bottom border for separation. Use "Monospaced" numerical variants of Plus Jakarta Sans for financial figures to ensure vertical alignment.