---
name: Nocturne Logic
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#bbcac5'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#859490'
  outline-variant: '#3c4946'
  surface-tint: '#4ddcc6'
  primary: '#b5fff0'
  on-primary: '#003730'
  primary-container: '#5eead4'
  on-primary-container: '#00675b'
  inverse-primary: '#006b5e'
  secondary: '#b9c8de'
  on-secondary: '#233143'
  secondary-container: '#39485a'
  on-secondary-container: '#a7b6cc'
  tertiary: '#b4fff1'
  on-tertiary: '#003731'
  tertiary-container: '#50ebd5'
  on-tertiary-container: '#00675c'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#6ef9e2'
  primary-fixed-dim: '#4ddcc6'
  on-primary-fixed: '#00201b'
  on-primary-fixed-variant: '#005047'
  secondary-fixed: '#d4e4fa'
  secondary-fixed-dim: '#b9c8de'
  on-secondary-fixed: '#0d1c2d'
  on-secondary-fixed-variant: '#39485a'
  tertiary-fixed: '#62fae3'
  tertiary-fixed-dim: '#3cddc7'
  on-tertiary-fixed: '#00201c'
  on-tertiary-fixed-variant: '#005047'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
  container-max-width: 1280px
---

## Brand & Style

This design system is built for high-performance environments where focus and depth are paramount. The brand personality is sophisticated, technical, and serene. By transitioning to a dark-themed architecture, the interface minimizes eye strain and emphasizes content hierarchy through subtle tonal shifts rather than aggressive lighting.

The aesthetic blends **Minimalism** with **Modern Corporate** sensibilities. It utilizes heavy whitespace (even in the dark), a restricted palette of deep teals and charcoal, and exceptionally clean typography to evoke a sense of professional reliability and quiet confidence. The emotional response is one of calm authority and precision.

## Colors

The palette is anchored in a dark navy/charcoal foundation to provide a rich, expansive backdrop. The primary color is a deep teal, adjusted to a "fixed-dim" state (#5EEAD4) to ensure high legibility and vibrant contrast against dark surfaces without causing chromatic aberration or glare.

- **Primary:** A luminous teal used for critical actions and active states.
- **Surface:** A deep charcoal-navy that serves as the base layer.
- **Surface Containers:** Gradated variations of slate and navy used to create depth and separate functional zones.
- **Text:** Primarily off-white and light gray to maintain high contrast while avoiding the harshness of pure white on black.

## Typography

This design system utilizes **Plus Jakarta Sans** across all levels to maintain a friendly yet professional geometric appearance. The typography is scaled to ensure clarity in low-light environments.

Headlines use tighter letter-spacing and heavier weights to command attention, while body text maintains generous line heights for maximum readability. Labels are slightly tracked out to improve legibility at smaller scales. On mobile, headlines are reduced in size to prevent awkward line breaks while maintaining their bold weight.

## Layout & Spacing

The layout follows a **Fixed Grid** philosophy on desktop and a **Fluid Grid** on mobile. The system is built on an 8px base unit (Round Eight) to ensure mathematical harmony across all components.

- **Desktop:** 12-column grid with 24px gutters, centered within a 1280px container.
- **Tablet:** 8-column grid with 24px gutters and 32px side margins.
- **Mobile:** 4-column fluid grid with 16px gutters and 16px side margins.

Vertical spacing should always be a multiple of 8px. Use 48px or 64px for section spacing, and 16px or 24px for component-internal spacing.

## Elevation & Depth

In this dark mode environment, depth is communicated through **Tonal Layers** rather than heavy shadows. As elements "rise" toward the user, they become lighter in color.

- **Level 0 (Background):** The darkest navy (#020617).
- **Level 1 (Cards/Surface):** A slightly lighter charcoal-navy (#0F172A).
- **Level 2 (Modals/Overlays):** Surface Container Low (#1E293B).

Where shadows are necessary for high-priority floating elements (like dropdowns), use an extra-diffused, low-opacity black shadow with a subtle teal tint to maintain the brand’s color harmony.

## Shapes

The shape language is consistently **Rounded**, using a 0.5rem (8px) base radius. This creates a modern, approachable feel that softens the "technical" edge of the dark palette.

- **Standard Elements (Buttons, Inputs):** 0.5rem (8px).
- **Large Elements (Cards, Containers):** 1rem (16px).
- **Extra Large Elements (Modals):** 1.5rem (24px).

This geometric consistency ensures that the UI feels cohesive and intentional, regardless of the component's scale.

## Components

### Buttons
Primary buttons use the Teal #5EEAD4 with dark navy text. Secondary buttons use an outline style with #94A3B8. All buttons have an 8px corner radius and 12px horizontal padding.

### Input Fields
Inputs use `surface_container` as a background with a subtle 1px border of `surface_container_high`. Focused states feature a 2px Teal border.

### Cards
Cards are built using the `surface` color. They do not use borders; instead, they are defined by their tonal contrast against the `background`. 

### Chips
Small, interactive elements used for filtering. They use `surface_container_low` for the resting state and transition to Primary Teal for the active/selected state.

### Lists
List items are separated by a 1px border of `surface_container_low`. Hover states should use a subtle background shift to `surface_container`.

### Checkboxes & Radios
When selected, these are filled with Primary Teal. The "on" icon or dot should be the background color (#020617) for maximum contrast.