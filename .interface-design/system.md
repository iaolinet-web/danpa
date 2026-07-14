# danpa - Design System

## Intent

**Who:** Sales runners (corredores) in Latin America — street-level vendors who walk into shops, take orders on the fly, and need to move fast. They're on their feet, often on a phone, between clients.

**What:** Place orders quickly for their clients. The core verb is "agregar" (add) — scan, tap, confirm. Speed is the product.

**Feel:** Fast, confident, trustworthy. Not corporate — practical, like a well-worn clipboard that works perfectly. Think: a delivery driver's dashboard crossed with a modern POS terminal.

## Domain

- **Concepts:** Ruta (route), pedido (order), cliente (client), stock, entrega (delivery), zona (zone), vendedor (seller)
- **Metaphor:** The physical order pad — but faster. One-tap actions, immediate feedback.
- **Vocabulary:** Agregar, confirmar, entregar, ruta, zona

## Color World

Physical space: cardboard boxes, clean white labels, green delivery trucks, slate asphalt, warm shop interiors.

| Token | Hex | Use |
|---|---|---|
| `--surface-0` | `#f7f5f2` | Canvas — warm off-white, like packing paper |
| `--surface-1` | `#ffffff` | Cards, panels |
| `--surface-2` | `#f0ede8` | Inset areas, inputs, secondary surfaces |
| `--ink-primary` | `#1a1714` | Headlines, primary text — near-black with warmth |
| `--ink-secondary` | `#6b6560` | Supporting text |
| `--ink-muted` | `#a09890` | Placeholders, metadata |
| `--brand` | `#2d6a4f` | Actions, primary accent — deep delivery green |
| `--brand-light` | `#d8f3dc` | Success backgrounds, highlights |
| `--brand-hover` | `#1b4332` | Hover states on brand |
| `--danger` | `#c1292e` | Destructive actions |
| `--warning` | `#e09f3e` | Caution states |
| `--border-default` | `rgba(26, 23, 20, 0.08)` | Standard borders |
| `--border-subtle` | `rgba(26, 23, 20, 0.04)` | Soft separation |

## Signature Element

**The "agregar" button** — a product card's action zone. The bottom of every product card is a wide, full-width tap target. Green background, bold white text. One tap adds to cart with a micro-animation (brief scale pulse). The cart badge bounces. This is the most-touched element in the app — it should feel satisfying every time.

## Defaults Rejected

- **Generic blue dashboard** → Replaced with warm off-white canvas + deep green brand
- **Bland rounded cards** → Replaced with surface-elevation hierarchy (white cards on warm canvas, subtle border only)
- **Boring tables** → Replaced with card-based order history with status badges
- **Standard login page** → Replaced with asymmetric split layout — form on one side, brand moment on the other

## Depth Strategy

**Subtle single shadows** — soft lift for cards, no dramatic drops. Cards float gently above the warm canvas.

## Typography

- **Headlines:** Inter, 600 weight, -0.02em tracking
- **Body:** Inter, 400 weight
- **Labels:** Inter, 500 weight
- **Data/numbers:** Inter, 600 weight, tabular-nums

## Spacing

Base unit: 4px. Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64

## Border Radius

- Small (inputs, buttons): 8px
- Medium (cards): 12px
- Large (modals, panels): 16px
- Full (badges, avatars): 9999px

## Animation

- Micro-interactions: 150ms ease-out
- Cart badge bounce: 200ms with slight overshoot
- Page transitions: 200ms fade
