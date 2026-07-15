# Schulte Focus

A fast, mobile-first circular Schulte visual-search exercise. Find the numbers from 1 through 36 in order.

Optional difficulty controls can rotate all three rings slowly at constant alternating speeds, move them independently after each correct tap, or disable solved-number coloring. The two movement modes are mutually exclusive. No-color mode shows an explicit **Last tap** counter so the player can recover their place. Best times are kept separately for each difficulty combination.

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
