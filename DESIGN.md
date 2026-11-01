---
name: The Royal Pavilion Box Office
description: Authentic architectural theater seating and real-time admission ledger
colors:
  canvas: "#0c0e12"
  surface: "#12151c"
  surface-raised: "#181c26"
  surface-sunken: "#101217"
  text-primary: "#f4f4f6"
  text-secondary: "#9ba1a6"
  text-muted: "#5e656d"
  border: "rgba(255, 255, 255, 0.08)"
  seat-selected: "#ffffff"
  seat-selected-text: "#0c0e12"
  seat-available: "#181c26"
  seat-available-border: "rgba(255, 255, 255, 0.15)"
  seat-booked: "#101217"
  seat-booked-text: "#3f444d"
  hold-amber: "#f59e0b"
  hold-amber-bg: "rgba(245, 158, 11, 0.10)"
  hold-amber-border: "rgba(245, 158, 11, 0.25)"
typography:
  fontFamily:
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    serif: "'Playfair Display', Georgia, serif"
    mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
---

# Design System: The Royal Pavilion Box Office

## Overview
A world-class, authentic cultural institution box office interface (modeled on the Lincoln Center, Royal Opera House, and National Theatre London). Designed with zero AI slop: no neon glows, no synthetic sci-fi jargon, and no fake laser gradients. 

## Architectural Layout
- **Institutional Top Bar**: Clean wordmark (`THE ROYAL PAVILION · HALL A`), show details (`London Symphony Orchestra · Dvořák Symphony No. 9`), and patron profile controls.
- **Auditorium Plan (Left 8 Cols)**:
  - Curved wooden apron representing **Stage & Orchestra Pit**.
  - **Center Aisle Division**: Seats 1–5 on the left stalls, center walkway aisle, seats 6–10 on the right stalls.
  - Three distinct architectural tiers:
    - **Rows A–B**: Stalls Orchestra ($65.00)
    - **Rows C–D**: Grand Tier ($45.00)
    - **Row E**: Balcony Promenade ($28.00)
- **Admission Ledger (Right 4 Cols)**:
  - Formatted like a real ticket receipt.
  - Itemized breakdown: Base admission, preservation levy, VAT.
  - Calm 5-minute hold countdown bar with linear depletion.
  - Direct "Confirm & Reserve Seat" action.
- **Passes Drawer**:
  - Realistic printed ticket stubs with left/right cutout notches, show schedule, and vector barcode for gate entry.

## Anti-Slop Discipline
- **No RGB / Neon Glows**: Surfaces are flat with clean 1px border contrast (`rgba(255, 255, 255, 0.08)`).
- **Physical Seat Design**: Selected seat is solid bone-white (`#ffffff`) with deep dark numeral (`#0c0e12`), providing immediate clarity without blurry halos.
- **Real Center Aisle**: Divided 50-seat grid into realistic auditorium blocks rather than an unformatted grid matrix.

## Motion System (Impeccable Animate)
- **Seat Tactile Spring**: Available seats respond with immediate tactile feedback (`whileHover: { scale: 1.08, y: -1 }`, `whileTap: { scale: 0.94 }`, `transition: { duration: 0.15s, ease: [0.16, 1, 0.3, 1] }`).
- **Ledger Cross-Fade**: The Admission Ledger smoothly cross-fades via `<AnimatePresence mode="wait">` (`y: 12 → 0`, `duration: 0.2s`) when seats are selected or released.
- **Drawer Staggered Ticket Emergence**: Admission passes emerge with an authored staggered reveal (`staggerChildren: 0.08s`, `y: 14 → 0`), reminiscent of tickets dispensed from an auditorium box office terminal.
- **Stage Acoustic Shimmer**: A gentle, continuous soundwave reflection sweeps across the stage apron.
- **Mobile Floating Dock**: Enters with a dampened spring (`type: "spring", stiffness: 380, damping: 28`).
