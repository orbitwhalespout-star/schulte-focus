import test from 'node:test';
import assert from 'node:assert/strict';

import { createBoard, createSession, selectNumber } from '../src/game.js';

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
  const wrong = selectNumber(session, 2, 1_250);
  assert.equal(wrong.next, 1);
  assert.equal(wrong.mistakes, 1);
  assert.equal(wrong.status, 'playing');

  const correct = selectNumber(wrong, 1, 1_500);
  assert.equal(correct.next, 2);
  assert.equal(correct.mistakes, 1);
});

test('selecting the final number completes the session with elapsed time', () => {
  const session = { ...createSession(2, 2_000), next: 2 };
  const complete = selectNumber(session, 2, 3_234);
  assert.equal(complete.status, 'complete');
  assert.equal(complete.elapsedMs, 1_234);
  assert.equal(complete.next, 3);
});
