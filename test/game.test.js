import test from 'node:test';
import assert from 'node:assert/strict';

import {
  afterTapDurations,
  boardLayout,
  continuousSpinPlan,
  createBoard,
  createSession,
  difficultyBadges,
  nextRingRotations,
  normalizeBest,
  presetConfiguration,
  selectNumber,
  variableSpinTimeline,
  withinSectorTolerance,
} from '../src/game.js';

test('createBoard returns every number exactly once', () => {
  const board = createBoard(36, () => 0.5);
  assert.equal(board.length, 36);
  assert.deepEqual([...board].sort((a, b) => a - b),
    Array.from({ length: 36 }, (_, index) => index + 1));
});

test('createBoard uses the supplied random source to shuffle positions', () => {
  const board = createBoard(5, () => 0);
  assert.deepEqual(board, [2, 3, 4, 5, 1]);
});

test('createBoard rejects unsupported board sizes', () => {
  assert.throws(() => createBoard(0), /positive integer/);
  assert.throws(() => createBoard(4.5), /positive integer/);
});

test('a session advances only when the expected number is selected', () => {
  const session = createSession(3, 1_000);
  assert.equal(session.lastTapped, null);
  const wrong = selectNumber(session, 2, 1_250);
  assert.equal(wrong.next, 1);
  assert.equal(wrong.mistakes, 1);
  assert.equal(wrong.status, 'playing');

  const correct = selectNumber(wrong, 1, 1_500);
  assert.equal(correct.next, 2);
  assert.equal(correct.lastTapped, 1);
  assert.equal(correct.mistakes, 1);
});

test('selecting the final number completes the session with elapsed time', () => {
  const session = { ...createSession(2, 2_000), next: 2 };
  const complete = selectNumber(session, 2, 3_234);
  assert.equal(complete.status, 'complete');
  assert.equal(complete.elapsedMs, 1_234);
  assert.equal(complete.next, 3);
});

test('nextRingRotations uses widely varied but gentle alternating distances', () => {
  const values = [0, 0.5, 0.75, 0.25];
  const random = () => values.shift();
  assert.deepEqual(nextRingRotations([0, 10, 20, 30], random), [25, -49, 91.25, 1]);
});

test('afterTapDurations varies each ring speed between 620ms and 1280ms', () => {
  const values = [0, 0.5, 0.75, 0.25];
  const random = () => values.shift();
  assert.deepEqual(afterTapDurations(4, random), [620, 950, 1115, 785]);
});

test('continuousSpinPlan alternates direction at slow distinct constant speeds', () => {
  assert.deepEqual(continuousSpinPlan(4), [
    { degrees: 360, durationSeconds: 36 },
    { degrees: -360, durationSeconds: 48 },
    { degrees: 360, durationSeconds: 60 },
    { degrees: -360, durationSeconds: 72 },
  ]);
});

test('variableSpinTimeline creates quirky uneven speed segments over four revolutions', () => {
  let index = 0;
  const timeline = variableSpinTimeline(360, () => index++ % 2);
  assert.equal(timeline.values.length, 41);
  assert.equal(timeline.keyTimes.length, 41);
  assert.equal(timeline.values[0], 0);
  assert.equal(timeline.values.at(-1), 1440);
  assert.equal(timeline.keyTimes[0], 0);
  assert.equal(timeline.keyTimes.at(-1), 1);
  const increments = timeline.values.slice(1).map((value, itemIndex) => value - timeline.values[itemIndex]);
  assert.equal(new Set(increments.map(value => value.toFixed(6))).size, 2);
  assert.ok(Math.min(...increments) >= 27 - 1e-9);
  assert.ok(Math.max(...increments) <= 45 + 1e-9);
});

test('withinSectorTolerance expands only the expected wedge boundaries by ten percent', () => {
  const sector = { inner: 60, outer: 120, startAngle: 0, endAngle: 60 };
  assert.equal(withinSectorTolerance({ ...sector, radius: 90, angle: 30 }), true);
  assert.equal(withinSectorTolerance({ ...sector, radius: 90, angle: 65.9 }), true);
  assert.equal(withinSectorTolerance({ ...sector, radius: 90, angle: 66.1 }), false);
  assert.equal(withinSectorTolerance({ ...sector, radius: 90, angle: 67 }), false);
  assert.equal(withinSectorTolerance({ ...sector, radius: 54.1, angle: 30 }), true);
  assert.equal(withinSectorTolerance({ ...sector, radius: 53, angle: 30 }), false);
  assert.equal(withinSectorTolerance({ ...sector, radius: 90, angle: 90 }), false);
  assert.equal(withinSectorTolerance({ inner: 0, outer: 60, startAngle: 330, endAngle: 390, radius: 30, angle: 2 }), true);
});

test('presetConfiguration defines the eight difficulty levels and leaves Custom editable', () => {
  assert.deepEqual(presetConfiguration('warm-up'), { movement: 'still', noColor: false, resetOnMistake: false, fourRings: false, twoRings: true });
  assert.throws(() => presetConfiguration('extra-easy'), RangeError);
  assert.deepEqual(presetConfiguration('easy'), { movement: 'still', noColor: false, resetOnMistake: false, fourRings: false });
  assert.deepEqual(presetConfiguration('medium'), { movement: 'still', noColor: true, resetOnMistake: false, fourRings: false });
  assert.deepEqual(presetConfiguration('hard'), { movement: 'after-tap', noColor: false, resetOnMistake: false, fourRings: false });
  assert.deepEqual(presetConfiguration('extra-hard'), { movement: 'still', noColor: false, resetOnMistake: false, fourRings: true });
  assert.deepEqual(presetConfiguration('max'), { movement: 'continuous', noColor: true, resetOnMistake: false, fourRings: true });
  assert.deepEqual(presetConfiguration('torture'), { movement: 'continuous', noColor: true, resetOnMistake: true, fourRings: true });
  assert.deepEqual(presetConfiguration('psycho'), { movement: 'continuous', afterTapOverlay: true, noColor: true, resetOnMistake: true, fourRings: true });
  assert.throws(() => presetConfiguration('hell'), RangeError);
  assert.equal(presetConfiguration('custom'), null);
  assert.throws(() => presetConfiguration('unknown'), RangeError);
});

test('boardLayout returns standard boards and ring-aware 8-number debug boards', () => {
  assert.deepEqual(boardLayout(), { size: 36, viewRadius: 230, rings: [
    { inner: 0, outer: 78, count: 6 },
    { inner: 78, outer: 148, count: 12 },
    { inner: 148, outer: 220, count: 18 },
  ] });
  const two = boardLayout({ twoRings: true });
  assert.equal(two.size, 18);
  assert.deepEqual(two.rings.map(ring => ring.count), [6, 12]);
  assert.equal(two.viewRadius, 158);
  const four = boardLayout({ fourRings: true });
  assert.equal(four.size, 60);
  assert.deepEqual(four.rings.map(ring => ring.count), [6, 12, 18, 24]);
  assert.equal(four.viewRadius, 250);
  const debugTwo = boardLayout({ twoRings: true, debug: true });
  assert.equal(debugTwo.size, 8);
  assert.deepEqual(debugTwo.rings.map(ring => ring.count), [4, 4]);
  const debugThree = boardLayout({ debug: true });
  assert.equal(debugThree.size, 8);
  assert.deepEqual(debugThree.rings.map(ring => ring.count), [2, 3, 3]);
  const debugFour = boardLayout({ fourRings: true, debug: true });
  assert.equal(debugFour.size, 8);
  assert.deepEqual(debugFour.rings.map(ring => ring.count), [2, 2, 2, 2]);
  assert.equal(debugFour.viewRadius, 250);
});

test('difficultyBadges shows presets/debug and omits unmodified Custom play', () => {
  assert.deepEqual(difficultyBadges({ preset: 'custom', movement: 'still' }), []);
  assert.deepEqual(difficultyBadges({ preset: 'warm-up', movement: 'still', twoRings: true }), ['WARM-UP', 'TWO RINGS']);
  assert.deepEqual(difficultyBadges({ preset: 'easy', movement: 'still' }), ['EASY']);
  assert.deepEqual(difficultyBadges({
    preset: 'torture', movement: 'continuous', noColor: true, resetOnMistake: true, fourRings: true, debug: true, size: 8,
  }), [
    'DEBUG · 8',
    'TORTURE',
    'NO COLOR CUES',
    'CONTINUOUS SPIN',
    'RESET ON MISS',
    'FOUR RINGS',
  ]);
  assert.deepEqual(difficultyBadges({
    preset: 'psycho', movement: 'continuous', afterTapOverlay: true, noColor: true, resetOnMistake: true, fourRings: true,
  }), [
    'PSYCHO',
    'NO COLOR CUES',
    'CONTINUOUS SPIN',
    'SPIN AFTER TAP',
    'RESET ON MISS',
    'FOUR RINGS',
  ]);
  assert.deepEqual(difficultyBadges({ preset: 'custom', movement: 'after-tap', fourRings: true }), [
    'SPIN AFTER TAP',
    'FOUR RINGS',
  ]);
});

test('normalizeBest accepts current and legacy scores while rejecting malformed Safari-local data', () => {
  assert.deepEqual(normalizeBest({ elapsedMs: 1234, mistakes: 2 }), { elapsedMs: 1234, mistakes: 2 });
  assert.deepEqual(normalizeBest({ elapsedMs: 1234, mistakes: 'bad' }), { elapsedMs: 1234, mistakes: 0 });
  assert.deepEqual(normalizeBest(1234), { elapsedMs: 1234, mistakes: 0 });
  assert.equal(normalizeBest({ elapsedMs: '1234' }), null);
  assert.equal(normalizeBest({}), null);
  assert.equal(normalizeBest(-1), null);
  assert.equal(normalizeBest(null), null);
});
