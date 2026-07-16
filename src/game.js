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
  'warm-up': { movement: 'still', noColor: false, resetOnMistake: false, fourRings: false, twoRings: true },
  easy: { movement: 'still', noColor: false, resetOnMistake: false, fourRings: false },
  medium: { movement: 'still', noColor: true, resetOnMistake: false, fourRings: false },
  hard: { movement: 'after-tap', noColor: false, resetOnMistake: false, fourRings: false },
  'extra-hard': { movement: 'still', noColor: false, resetOnMistake: false, fourRings: true },
  max: { movement: 'continuous', noColor: true, resetOnMistake: false, fourRings: true },
  torture: { movement: 'continuous', noColor: true, resetOnMistake: true, fourRings: true },
};

const PRESET_LABELS = {
  'warm-up': 'WARM-UP',
  easy: 'EASY',
  medium: 'MEDIUM',
  hard: 'HARD',
  'extra-hard': 'EXTRA HARD',
  max: 'MAX',
  torture: 'TORTURE',
};

export function presetConfiguration(preset) {
  if (preset === 'custom') return null;
  if (!Object.hasOwn(PRESETS, preset)) throw new RangeError(`Unknown preset: ${preset}`);
  return { ...PRESETS[preset] };
}

export function boardLayout({ twoRings = false, fourRings = false, debug = false } = {}) {
  if (debug) {
    if (twoRings) {
      return {
        size: 8,
        viewRadius: 250,
        rings: [
          { inner: 0, outer: 120, count: 4 },
          { inner: 120, outer: 240, count: 4 },
        ],
      };
    }
    if (!fourRings) {
      return {
        size: 8,
        viewRadius: 250,
        rings: [
          { inner: 0, outer: 80, count: 2 },
          { inner: 80, outer: 160, count: 3 },
          { inner: 160, outer: 240, count: 3 },
        ],
      };
    }
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
  if (twoRings) {
    return {
      size: 18,
      viewRadius: 158,
      rings: [
        { inner: 0, outer: 78, count: 6 },
        { inner: 78, outer: 148, count: 12 },
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

export function difficultyBadges({ preset = 'custom', movement = 'still', noColor = false, resetOnMistake = false, twoRings = false, fourRings = false, debug = false, size = 8 } = {}) {
  const badges = [];
  if (debug) badges.push(`DEBUG · ${size}`);
  if (preset !== 'custom' && PRESET_LABELS[preset]) badges.push(PRESET_LABELS[preset]);
  if (noColor) badges.push('NO COLOR CUES');
  if (movement === 'continuous') badges.push('CONTINUOUS SPIN');
  if (movement === 'after-tap') badges.push('SPIN AFTER TAP');
  if (resetOnMistake) badges.push('RESET ON MISS');
  if (twoRings) badges.push('TWO RINGS');
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

export function variableSpinTimeline(degrees, random = Math.random) {
  const segmentCount = 24;
  const totalDegrees = degrees * 4;
  const weights = Array.from({ length: segmentCount }, () => 0.88 + random() * 0.24);
  const scale = segmentCount / weights.reduce((total, weight) => total + weight, 0);
  const values = [0];
  weights.forEach(weight => values.push(values.at(-1) + (totalDegrees / segmentCount) * weight * scale));
  values[values.length - 1] = totalDegrees;
  const keyTimes = Array.from({ length: segmentCount + 1 }, (_, index) => index / segmentCount);
  return { values, keyTimes };
}

export function nextRingRotations(current, random = Math.random) {
  const motion = [
    { direction: 1, minimum: 25, range: 90 },
    { direction: -1, minimum: 18, range: 82 },
    { direction: 1, minimum: 15, range: 75 },
    { direction: -1, minimum: 12, range: 68 },
  ];
  return current.map((angle, index) => {
    const { direction, minimum, range } = motion[index];
    return angle + direction * (minimum + random() * range);
  });
}

export function afterTapDurations(ringCount, random = Math.random) {
  return Array.from({ length: ringCount }, () => 620 + Math.round(random() * 660));
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
