# Schulte Focus

A fast, mobile-first circular Schulte visual-search exercise. Find the numbers from 1 through 36 in order.

Optional difficulty controls can rotate all three rings slowly at constant alternating speeds, move them with smaller eased alternating rotations after each correct tap, disable solved-number coloring, or reshuffle and restart the round after a mistake. The two movement modes are mutually exclusive. No-color mode shows an explicit **Last tap** counter so the player can recover their place. Reset-on-mistake and all movement/color combinations keep separate personal-best records.

## Privacy

The app has no accounts, analytics, backend, or runtime API calls. A personal-best time is stored only in the visitor's browser using `localStorage`.

## Run locally

Serve the directory with any static file server, for example:

```bash
npx serve .
```

## Test

```bash
npm test
```

## Deployment

The project is a static site and can be deployed directly to Vercel with no build command.
