# Schulte Focus

A fast, mobile-first circular Schulte visual-search exercise. Find the numbers in order across an 18-, 36-, or 60-number board.

Seven presets provide a progression from **Extra Easy** through **Hell**. Extra Easy uses two rings and 18 numbers. **Custom** keeps the individual movement, no-color, reset-on-mistake, and fourth-ring controls. Four-ring presets use 60 numbers. Movement modes remain mutually exclusive, labels stay upright, and each effective difficulty combination keeps a separate personal-best record.

Completion results show the selected preset and active modifiers as concise difficulty badges.

## Debug mode

Press **New board** 10 times to enable an eight-number board distributed across all four rings. Debug rounds keep presets, Custom controls, movement, coloring, reset behavior, results, and badges active, allowing the complete flow to be tested without selecting 18, 36, or 60 numbers. Debug personal bests are isolated from normal scores. Reload the page to leave debug mode.

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
