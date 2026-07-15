export function createBoard(size, random = Math.random) {
  if (!Number.isInteger(size) || size <= 0) {
    throw new TypeError('Board size must be a positive integer');
  }

  const values = Array.from({ length: size }, (_, index) => index + 1);
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [values[index], values[swapIndex]] = [values[swapIndex], values[index]];
  }
  return values;
}

const PRESETS = {
  easy: { movement: 'still', noColor: false, resetOnMistake: false, fourRings: false },
  medium: { movement: 'still', noColor: true, resetOnMistake: false, fourRings: false },
  hard: { movement: 'after-tap', noColor: false, resetOnMistake: false, fourRings: false },
  'extra-hard': { movement: 'after-tap', noColor: true, resetOnMistake: true, fourRings: false },
  max: { movement: 'continuous', noColor: true, resetOnMistake: false, fourRings: true },
  hell: { movement: 'continuous', noColor: true, resetOnMistake: true, fourRings: true },
};

const PRESET_LABELS = {
  easy: 'EASY',
  medium: 'MEDIUM',
  hard: 'HARD',
  'extra-hard': 'EXTRA HARD',
  max: 'MAX',
  hell: 'HELL',
};

export function presetConfiguration(preset) {
  if (preset === 'custom') return null;
  if (!Object.hasOwn(PRESETS, preset)) throw new RangeError(`Unknown preset: ${preset}`);
  return { ...PRESETS[preset] };
}

export function boardLayout({ fourRings = false, debug = false } = {}) {
  if (debug) {
    return {
      size: 8,
      viewRadius: 250,
      rings: [
        { inner: 0, outer: 60, count: 2 },
        { inner: 60, outer: 120, count: 2 },
        { inner: 120, outer: 180, count: 2 },
        { inner: 180, outer: 240, count: 2 },
      ],
    };
  }
  if (fourRings) {
    return {
      size: 60,
      viewRadius: 250,
      rings: [
        { inner: 0, outer: 60, count: 6 },
        { inner: 60, outer: 120, count: 12 },
        { inner: 120, outer: 180, count: 18 },
        { inner: 180, outer: 240, count: 24 },
      ],
    };
  }
  return {
    size: 36,
    viewRadius: 230,
    rings: [
      { inner: 0, outer: 78, count: 6 },
      { inner: 78, outer: 148, count: 12 },
      { inner: 148, outer: 220, count: 18 },
    ],
  };
}

export function normalizeBest(stored) {
  if (Number.isFinite(stored) && stored >= 0) {
    return { elapsedMs: stored, mistakes: 0 };
  }
  if (!stored || typeof stored !== 'object' || !Number.isFinite(stored.elapsedMs) || stored.elapsedMs < 0) {
    return null;
  }
  return {
    elapsedMs: stored.elapsedMs,
    mistakes: Number.isFinite(stored.mistakes) && stored.mistakes >= 0 ? stored.mistakes : 0,
  };
}

export function difficultyBadges({ preset = 'custom', movement = 'still', noColor = false, resetOnMistake = false, fourRings = false, debug = false, size = 8 } = {}) {
  const badges = [];
  if (debug) badges.push(`DEBUG · ${size}`);
  if (preset !== 'custom' && PRESET_LABELS[preset]) badges.push(PRESET_LABELS[preset]);
  if (noColor) badges.push('NO COLOR CUES');
  if (movement === 'continuous') badges.push('CONTINUOUS SPIN');
  if (movement === 'after-tap') badges.push('SPIN AFTER TAP');
  if (resetOnMistake) badges.push('RESET ON MISS');
  if (fourRings) badges.push('FOUR RINGS');
  return badges;
}

export function continuousSpinPlan(ringCount = 3) {
  return [
    { degrees: 360, durationSeconds: 36 },
    { degrees: -360, durationSeconds: 48 },
    { degrees: 360, durationSeconds: 60 },
    { degrees: -360, durationSeconds: 72 },
  ].slice(0, ringCount);
}

export function nextRingRotations(current, random = Math.random) {
  const motion = [
    { direction: 1, minimum: 45, range: 50 },
    { direction: -1, minimum: 35, range: 40 },
    { direction: 1, minimum: 25, range: 35 },
    { direction: -1, minimum: 20, range: 30 },
  ];
  return current.map((angle, index) => {
    const { direction, minimum, range } = motion[index];
    return angle + direction * (minimum + random() * range);
  });
}

export function createSession(size, startedAt) {
  return {
    size,
    next: 1,
    lastTapped: null,
    mistakes: 0,
    startedAt,
    elapsedMs: 0,
    status: 'playing',
  };
}

export function selectNumber(session, selected, selectedAt) {
  if (session.status !== 'playing') return session;
  if (selected !== session.next) {
    return { ...session, mistakes: session.mistakes + 1 };
  }

  const next = session.next + 1;
  const complete = selected === session.size;
  return {
    ...session,
    next,
    lastTapped: selected,
    status: complete ? 'complete' : 'playing',
    elapsedMs: complete ? selectedAt - session.startedAt : session.elapsedMs,
  };
}
