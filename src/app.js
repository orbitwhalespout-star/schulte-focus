import { createBoard, createSession, selectNumber } from './game.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const SIZE = 36;
const BEST_KEY = 'schulte-focus-best-v1';
const rings = [
  { inner: 0, outer: 78, count: 6 },
  { inner: 78, outer: 148, count: 12 },
  { inner: 148, outer: 220, count: 18 },
];

const boardElement = document.querySelector('#board');
const boardWrap = document.querySelector('#boardWrap');
const startLayer = document.querySelector('#startLayer');
const startButton = document.querySelector('#startButton');
const resetButton = document.querySelector('#resetButton');
const nextNumber = document.querySelector('#nextNumber');
const timerElement = document.querySelector('#timer');
const progressElement = document.querySelector('#progress');
const mistakesElement = document.querySelector('#mistakes');
const howDialog = document.querySelector('#howDialog');
const resultDialog = document.querySelector('#resultDialog');

let board = [];
let session = null;
let animationFrame = null;

function polar(radius, angle) {
  const radians = (angle - 90) * Math.PI / 180;
  return { x: radius * Math.cos(radians), y: radius * Math.sin(radians) };
}

function sectorPath(inner, outer, startAngle, endAngle) {
  const outerStart = polar(outer, startAngle);
  const outerEnd = polar(outer, endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  if (inner === 0) {
    return `M 0 0 L ${outerStart.x} ${outerStart.y} A ${outer} ${outer} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y} Z`;
  }

  const innerEnd = polar(inner, endAngle);
  const innerStart = polar(inner, startAngle);
  return `M ${outerStart.x} ${outerStart.y} A ${outer} ${outer} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y} L ${innerEnd.x} ${innerEnd.y} A ${inner} ${inner} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y} Z`;
}

function makeSvgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

function renderBoard() {
  boardElement.replaceChildren();
  let boardIndex = 0;

  rings.forEach((ring, ringIndex) => {
    const step = 360 / ring.count;
    const rotation = ringIndex % 2 === 0 ? 0 : step / 2;

    for (let cell = 0; cell < ring.count; cell += 1) {
      const start = cell * step + rotation;
      const end = start + step;
      const middle = start + step / 2;
      const textRadius = ring.inner === 0 ? ring.outer * 0.58 : (ring.inner + ring.outer) / 2;
      const textPoint = polar(textRadius, middle);
      const value = board[boardIndex];

      const group = makeSvgElement('g', {
        class: 'sector',
        role: 'button',
        tabindex: '0',
        'aria-label': `Number ${value}`,
        'data-value': value,
      });
      const path = makeSvgElement('path', { d: sectorPath(ring.inner, ring.outer, start, end) });
      const text = makeSvgElement('text', { x: textPoint.x, y: textPoint.y });
      text.textContent = value;
      group.append(path, text);
      group.addEventListener('click', () => chooseNumber(group, value));
      group.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          chooseNumber(group, value);
        }
      });
      boardElement.append(group);
      boardIndex += 1;
    }
  });
}

function formatTime(milliseconds) {
  const totalTenths = Math.floor(milliseconds / 100);
  const minutes = Math.floor(totalTenths / 600);
  const seconds = Math.floor((totalTenths % 600) / 10);
  const tenths = totalTenths % 10;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`;
}

function updateTimer() {
  if (!session || session.status !== 'playing') return;
  timerElement.textContent = formatTime(performance.now() - session.startedAt);
  animationFrame = requestAnimationFrame(updateTimer);
}

function updateStatus() {
  const found = session ? Math.min(session.next - 1, SIZE) : 0;
  progressElement.textContent = `${found} / ${SIZE}`;
  mistakesElement.textContent = session?.mistakes ?? 0;
  nextNumber.textContent = session?.status === 'complete' ? '✓' : session?.next ?? 1;
}

function chooseNumber(element, value) {
  if (!session || session.status !== 'playing' || element.classList.contains('found')) return;
  const previousNext = session.next;
  session = selectNumber(session, value, performance.now());

  if (session.next > previousNext) {
    element.classList.add('found');
    element.setAttribute('aria-disabled', 'true');
  } else {
    element.classList.add('wrong');
    boardWrap.classList.remove('shake');
    void boardWrap.offsetWidth;
    boardWrap.classList.add('shake');
    window.setTimeout(() => element.classList.remove('wrong'), 220);
  }

  updateStatus();
  if (session.status === 'complete') finishRound();
}

function readBest() {
  try {
    return JSON.parse(localStorage.getItem(BEST_KEY));
  } catch {
    return null;
  }
}

function finishRound() {
  cancelAnimationFrame(animationFrame);
  timerElement.textContent = formatTime(session.elapsedMs);
  const oldBest = readBest();
  const isBest = !oldBest || session.elapsedMs < oldBest.elapsedMs;
  const best = isBest ? { elapsedMs: session.elapsedMs, mistakes: session.mistakes } : oldBest;
  localStorage.setItem(BEST_KEY, JSON.stringify(best));

  document.querySelector('#resultTime').textContent = formatTime(session.elapsedMs);
  document.querySelector('#resultMistakes').textContent = session.mistakes;
  document.querySelector('#bestTime').textContent = `${formatTime(best.elapsedMs)}${isBest ? ' · new' : ''}`;
  resultDialog.showModal();
}

function prepareBoard() {
  cancelAnimationFrame(animationFrame);
  board = createBoard(SIZE);
  session = null;
  timerElement.textContent = '00:00.0';
  boardWrap.classList.add('is-idle');
  startLayer.hidden = false;
  renderBoard();
  updateStatus();
}

function startRound() {
  session = createSession(SIZE, performance.now());
  boardWrap.classList.remove('is-idle');
  startLayer.hidden = true;
  updateStatus();
  updateTimer();
}

startButton.addEventListener('click', startRound);
resetButton.addEventListener('click', prepareBoard);
document.querySelector('#howButton').addEventListener('click', () => howDialog.showModal());
document.querySelector('#playAgainButton').addEventListener('click', () => {
  resultDialog.close();
  prepareBoard();
});

prepareBoard();
