---
name: Asset Tracker Family Edition
colors:
  surface: '#f8fafa'
  surface-dim: '#d8dada'
  surface-bright: '#f8fafa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f4'
  surface-container: '#eceeee'
  surface-container-high: '#e6e8e9'
  surface-container-highest: '#e1e3e3'
  on-surface: '#191c1d'
  on-surface-variant: '#3f484a'
  inverse-surface: '#2e3131'
  inverse-on-surface: '#eff1f1'
  outline: '#6f797b'
  outline-variant: '#bec8ca'
  surface-tint: '#016874'
  primary: '#004e58'
  on-primary: '#ffffff'
  primary-container: '#006874'
  on-primary-container: '#97e4f2'
  inverse-primary: '#85d2e0'
  secondary: '#4a6267'
  on-secondary: '#ffffff'
  secondary-container: '#cde7ed'
  on-secondary-container: '#50686d'
  tertiary: '#3a4664'
  on-tertiary: '#ffffff'
  tertiary-container: '#525e7d'
  on-tertiary-container: '#ccd8fd'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#a2effd'
  primary-fixed-dim: '#85d2e0'
  on-primary-fixed: '#001f24'
  on-primary-fixed-variant: '#004f58'
  secondary-fixed: '#cde7ed'
  secondary-fixed-dim: '#b1cbd1'
  on-secondary-fixed: '#051f23'
  on-secondary-fixed-variant: '#334b4f'
  tertiary-fixed: '#d9e2ff'
  tertiary-fixed-dim: '#bac6ea'
  on-tertiary-fixed: '#0e1b36'
  on-tertiary-fixed-variant: '#3a4664'
  background: '#f8fafa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e3'
  status-critical: '#BA1A1A'
  status-warning: '#8F4E00'
  status-active: '#2E6C00'
  status-neutral: '#535F61'
  on-status-critical: '#FFFFFF'
  on-status-warning: '#FFFFFF'
  on-status-active: '#FFFFFF'
typography:
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.5px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: 0.15px
  title-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.1px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0.5px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0.25px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.1px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.5px
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin-mobile: 16px
  margin-tablet: 24px
---

## Brand & Style

The design system is rooted in the **Material 3** specification, emphasizing a clean, trustworthy, and modern aesthetic tailored for family asset management. It balances the rigor of an enterprise-grade utility with the approachability required for household use.

The visual narrative is defined by:
- **Trust & Security:** Utilizing deep tones and structured layouts to reassure users that their sensitive financial and property data is safe.
- **Efficiency:** A high-information-density approach that minimizes "searching" through a 8dp grid system.
- **Clarity:** Clear color signaling for critical deadlines (Expired/Expiring) to ensure the core value proposition—never missing a renewal—is met immediately upon opening the app.

The style is **Corporate / Modern**, using Material 3's "Surface" and "Container" logic to create a layered, organized environment that feels "Pro" but remains accessible for non-technical family members.

## Colors

This design system utilizes a palette built around **Deep Teal**, chosen for its psychological associations with stability and organization.

### Color Logic
- **Primary:** The core brand identity used for major actions (FABs, primary buttons) and active states.
- **Status Colors:** These are functional tokens used for the "Expiry Engine" logic:
  - **Critical (Red):** Used for items ≤7 days from expiry or already expired.
  - **Warning (Amber):** Used for items 8–30 days from expiry.
  - **Active (Green):** Indicates healthy status (>30 days).
  - **Neutral (Gray):** Used for items with no tracking or archived states.

### Dark Mode
In dark mode, surfaces shift to a deep charcoal (`#191C1D`) rather than pure black to maintain Material 3's tonal elevation system. Primary and status colors are adjusted to their lighter, desaturated counterparts to ensure WCAG AA contrast compliance against dark surfaces.

## Typography

The system uses **Plus Jakarta Sans** exclusively. This choice provides a modern, geometric feel that remains highly legible at small sizes, which is critical for Indonesian text that often contains longer words.

- **Headlines:** Set with slightly tighter letter spacing and heavier weights to create a strong hierarchy on the Dashboard.
- **Numbers:** Since the app is data-heavy (IDR values, dates, plate numbers), Ensure tabular lining is used for numerical data in lists to allow for easy vertical scanning.
- **Language Consideration:** Large headlines (Headline LG) should be used sparingly as Indonesian translations (e.g., "Ketenagakerjaan") can be significantly longer than English equivalents.

## Layout & Spacing

The layout follows an **8dp grid system**, ensuring all components align to a consistent mathematical rhythm. 

- **Grid Model:** A fluid grid is used for mobile. On handsets, use a 4-column grid with 16px margins. On tablets, transition to an 8-column grid with 24px margins.
- **Rhythm:** Vertical spacing between cards on the dashboard should be 12px or 16px (multiples of 4/8) to create a clear separation of asset categories.
- **Safe Areas:** Adhere to system-level safe areas for the BottomNavigationBar and top Status Bar.
- **Touch Targets:** All interactive elements (chips, list items, icons) must maintain a minimum touch target of 48x48dp, even if the visual element is smaller.

## Elevation & Depth

This system utilizes **Tonal Layers** as the primary method of conveying depth, in accordance with Material 3 principles.

- **Level 0 (Surface):** The background color of the app.
- **Level 1 (Surface Container Low):** Used for cards and secondary content containers. These have no shadow but a slightly different tonal value from the background.
- **Level 2 (Surface Container):** Used for primary list items and inputs. 
- **Modality:** High-level components like Dialogs and Floating Action Buttons (FABs) use **Ambient Shadows**. These shadows should be soft, blurred, and tinted with the Primary color (Deep Teal) at a very low opacity (8-12%) rather than neutral black, creating a more integrated, modern feel.

## Shapes

The shape language is **Rounded**, following the modern evolution of Material Design.

- **Small Components:** Checkboxes and small tags use a 4px (Soft) radius.
- **Medium Components:** Buttons, Input Fields, and Asset Cards use an 8px or 12px radius.
- **Large Components:** Bottom Sheets and Dialogs use a 28px radius on top corners only.
- **Pill Shapes:** Used exclusively for status badges (e.g., "Aktif", "Kadaluarsa") and the active indicator in the Bottom Navigation Bar.

## Components

### Buttons
- **Primary:** Filled with Deep Teal, white text. Large 12px radius.
- **Secondary:** Outlined with a 1px border.
- **FAB:** Large, rounded-square (16px radius) with Deep Teal background and white icon, positioned at the bottom right.

### Input Fields
- **Style:** Outlined Material 3 text fields.
- **States:** Focus state uses a 2px Deep Teal border. Error states (for invalid dates) use the Critical Red color for both the border and helper text.

### Cards (Asset Cards)
- Used on the Dashboard and Asset List.
- Contains an icon container (rounded 12px), Asset Name (Title MD), and a status badge.
- Offline status should be indicated by a subtle desaturation of the card's elevation.

### Status Badges (Chips)
- Compact, pill-shaped containers.
- **Active:** Light green background with dark green text.
- **Expiring Soon:** Light amber background with dark amber text.
- **Critical:** Light red background with dark red text.

### Lists
- Use 16px horizontal padding.
- Include "Dividers" only between items that don't have distinct container backgrounds.
- Every list item for an asset should show its "Last Updated" or "Next Expiry" as a Label-MD subtitle.