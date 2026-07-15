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

export function difficultyBadges({ movement = 'still', noColor = false, resetOnMistake = false } = {}) {
  const badges = [];
  if (noColor) badges.push('NO COLOR CUES');
  if (movement === 'continuous') badges.push('CONTINUOUS SPIN');
  if (movement === 'after-tap') badges.push('SPIN AFTER TAP');
  if (resetOnMistake) badges.push('RESET ON MISS');
  return badges;
}

export function continuousSpinPlan() {
  return [
    { degrees: 360, durationSeconds: 36 },
    { degrees: -360, durationSeconds: 48 },
    { degrees: 360, durationSeconds: 60 },
  ];
}

export function nextRingRotations(current, random = Math.random) {
  const motion = [
    { direction: 1, minimum: 45, range: 50 },
    { direction: -1, minimum: 35, range: 40 },
    { direction: 1, minimum: 25, range: 35 },
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
