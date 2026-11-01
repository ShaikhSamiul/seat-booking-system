# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Concert, theater, and cultural venue patrons reserving and purchasing specific allocated seating in real time with absolute certainty against double-booking.

## Product Purpose

The Royal Pavilion Box Office provides a reliable, dignified seat reservation platform for live performing arts. It guarantees that no two patrons can purchase the same seat simultaneously through atomic Redis mutex locks, paired with live WebSocket state updates.

## Positioning

Unlike mass-market ticket brokers that clutter the booking flow with deceptive countdown timers, dark patterns, and hidden fees, The Royal Pavilion Box Office offers a calm, architecturally authentic auditorium plan, an itemized admission ledger with complete price transparency, and immediate real-time concurrency feedback.

## Operating Context

- **Usage Mode**: Operate (focused task execution, scanability, real-time feedback).
- **Target Devices**: Mobile phones, tablets, and desktop workstations in low-light auditorium environments.
- **Auditorium**: Hall A (50 allocated seats, Stalls Orchestra, Grand Tier, and Balcony with center aisle division).

## Capabilities and Constraints

- **Single-Seat Hold Policy**: To prevent cart hoarding during peak on-sale moments, each authenticated patron is restricted to holding at most 1 seat concurrently. Selecting a second seat prompts the patron to either confirm or cancel their active hold.
- **5-Minute Concurrency Window**: Locks expire automatically after 300 seconds and are returned to the public pool via Redis TTL / in-memory timer eviction.
- **Account Protection**: Passwords hashed with bcrypt (salt rounds: 10), email uniqueness validation, and transparent error messaging on invalid credentials.
- **Fail-Fast Architecture**: Backend server automatically fails over to an in-memory locking cache if external Redis instances become unreachable.

## Brand Commitments

- **Name**: The Royal Pavilion Box Office (Hall A).
- **Aesthetic**: Authentic cultural institution (deep warm charcoal `#0c0e12`, clean bone-white `#ffffff` high-contrast selection, warm amber hold locks, and subtle hairline borders).
- **Iconography**: 100% vector SVG icons with zero generic emoji or AI ornament slop.

## Product Principles

1. **Physical Architectural Truth**: Seating maps reflect real theater layouts with center aisles and stage aprons.
2. **Precision Over Decoration**: Color is used strictly to communicate seat availability (available, 5m hold, booked, selected).
3. **Price Transparency**: Line items, preservation levies, and taxes are clearly itemized before purchase.
