# Schulte Focus

A fast, mobile-first circular Schulte visual-search exercise. Find the numbers in order across an 18-, 36-, or 60-number board.

Eight presets provide a progression from **Warm-up** through **Psycho**. Warm-up uses two rings and 18 numbers. **Custom** keeps the individual movement, no-color, reset-on-mistake, and fourth-ring controls. Four-ring presets use 60 numbers. Movement modes remain mutually exclusive in Custom, labels stay upright, and each effective difficulty combination keeps a separate personal-best record.

Completion results show the selected preset and active modifiers as concise difficulty badges.

Reset on mistake reshuffles progress back to 1 without restarting the timer. After-tap movement varies both distance and duration on every tap. Torture keeps its continuous direction but adds a wider, quirky 40-segment randomized speed drift across four revolutions; other Continuous configurations remain constant-speed.

Pointer taps receive a geometric 10% allowance around the currently expected wedge's angular and radial boundaries. This does not make an entire neighboring sector correct, and keyboard input remains exact. **Psycho** retains Torture's randomized Continuous behavior, temporarily applies the randomized Spin after tap movement after each correct non-final tap, then resumes a fresh Continuous timeline from the exact settled angle.

## Debug mode

Press **New board** 10 times to enable an eight-number board distributed across the selected two, three, or four rings. Debug rounds keep presets, Custom controls, movement, coloring, reset behavior, results, and badges active, allowing the complete flow to be tested without selecting 18, 36, or 60 numbers. Debug personal bests are isolated from normal scores. Reload the page to leave debug mode.

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
