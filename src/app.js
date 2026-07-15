import { continuousSpinPlan, createBoard, createSession, nextRingRotations, selectNumber } from './game.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const SIZE = 36;
const BEST_KEY = 'schulte-focus-best-v1';
const SETTINGS_KEY = 'schulte-focus-settings-v1';
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
const lastTapCounter = document.querySelector('#lastTapCounter');
const lastTapElement = document.querySelector('#lastTap');
const continuousToggle = document.querySelector('#continuousToggle');
const spinToggle = document.querySelector('#spinToggle');
const noColorToggle = document.querySelector('#noColorToggle');
const howDialog = document.querySelector('#howDialog');
const resultDialog = document.querySelector('#resultDialog');

let board = [];
let session = null;
let animationFrame = null;
let ringRotations = [0, 0, 0];
let spinTimer = null;

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
    const ringGroup = makeSvgElement('g', { class: 'ring', 'data-ring': ringIndex });
    ringGroup.dataset.rotation = ringRotations[ringIndex];
    ringGroup.setAttribute('transform', `rotate(${ringRotations[ringIndex]} 0 0)`);
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
      ringGroup.append(group);
      boardIndex += 1;
    }
    boardElement.append(ringGroup);
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
  lastTapElement.textContent = session?.lastTapped ?? '—';
  lastTapCounter.hidden = !noColorToggle.checked;
  boardWrap.classList.toggle('no-color', noColorToggle.checked);
  nextNumber.textContent = session?.status === 'complete' ? '✓' : session?.next ?? 1;
}

function spinRings() {
  ringRotations = nextRingRotations(ringRotations);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  boardWrap.classList.add('is-spinning');
  window.clearTimeout(spinTimer);

  document.querySelectorAll('.ring').forEach((ring, index) => {
    const previous = Number(ring.dataset.rotation ?? 0);
    const next = ringRotations[index];
    ring.querySelectorAll('animateTransform').forEach(animation => animation.remove());
    const texts = [...ring.querySelectorAll('text')];
    ring.setAttribute('transform', `rotate(${previous} 0 0)`);
    texts.forEach(text => {
      text.setAttribute('transform', `rotate(${-previous} ${text.getAttribute('x')} ${text.getAttribute('y')})`);
    });

    if (reducedMotion) {
      ring.setAttribute('transform', `rotate(${next} 0 0)`);
      texts.forEach(text => {
        text.setAttribute('transform', `rotate(${-next} ${text.getAttribute('x')} ${text.getAttribute('y')})`);
      });
    } else {
      const ringAnimation = makeSvgElement('animateTransform', {
        attributeName: 'transform',
        type: 'rotate',
        from: `${previous} 0 0`,
        to: `${next} 0 0`,
        dur: '0.52s',
        fill: 'freeze',
      });
      ring.append(ringAnimation);
      ringAnimation.beginElement();
      texts.forEach(text => {
        const x = text.getAttribute('x');
        const y = text.getAttribute('y');
        const textAnimation = makeSvgElement('animateTransform', {
          attributeName: 'transform',
          type: 'rotate',
          from: `${-previous} ${x} ${y}`,
          to: `${-next} ${x} ${y}`,
          dur: '0.52s',
          fill: 'freeze',
        });
        text.append(textAnimation);
        textAnimation.beginElement();
      });
      window.setTimeout(() => {
        if (!ring.contains(ringAnimation)) return;
        ring.setAttribute('transform', `rotate(${next} 0 0)`);
        texts.forEach(text => {
          text.setAttribute('transform', `rotate(${-next} ${text.getAttribute('x')} ${text.getAttribute('y')})`);
        });
        ring.querySelectorAll('animateTransform').forEach(animation => animation.remove());
      }, 540);
    }
    ring.dataset.rotation = next;
  });

  spinTimer = window.setTimeout(() => boardWrap.classList.remove('is-spinning'), reducedMotion ? 0 : 550);
}

function startContinuousSpin() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const plan = continuousSpinPlan();
  document.querySelectorAll('.ring').forEach((ring, index) => {
    const { degrees, durationSeconds } = plan[index];
    const ringAnimation = makeSvgElement('animateTransform', {
      attributeName: 'transform',
      type: 'rotate',
      from: '0 0 0',
      to: `${degrees} 0 0`,
      dur: `${durationSeconds}s`,
      repeatCount: 'indefinite',
      calcMode: 'linear',
      'data-continuous': 'true',
    });
    ring.append(ringAnimation);
    ringAnimation.beginElement();

    ring.querySelectorAll('text').forEach(text => {
      const x = text.getAttribute('x');
      const y = text.getAttribute('y');
      const textAnimation = makeSvgElement('animateTransform', {
        attributeName: 'transform',
        type: 'rotate',
        from: `0 ${x} ${y}`,
        to: `${-degrees} ${x} ${y}`,
        dur: `${durationSeconds}s`,
        repeatCount: 'indefinite',
        calcMode: 'linear',
        'data-continuous': 'true',
      });
      text.append(textAnimation);
      textAnimation.beginElement();
    });
  });
}

function stopContinuousSpin() {
  document.querySelectorAll('animateTransform[data-continuous="true"]').forEach(animation => animation.remove());
  document.querySelectorAll('.ring').forEach(ring => {
    ring.setAttribute('transform', 'rotate(0 0 0)');
    ring.dataset.rotation = '0';
    ring.querySelectorAll('text').forEach(text => text.removeAttribute('transform'));
  });
}

function chooseNumber(element, value) {
  if (!session || session.status !== 'playing' || boardWrap.classList.contains('is-spinning') || element.classList.contains('solved')) return;
  const previousNext = session.next;
  session = selectNumber(session, value, performance.now());

  if (session.next > previousNext) {
    element.classList.add('solved');
    element.setAttribute('aria-disabled', 'true');
    element.setAttribute('tabindex', '-1');
    if (document.activeElement === element) element.blur();
    if (!noColorToggle.checked) {
      element.classList.add('found');
    }
    if (spinToggle.checked && session.status === 'playing') spinRings();
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

function bestKey() {
  if (!continuousToggle.checked && !spinToggle.checked && !noColorToggle.checked) return BEST_KEY;
  const movement = continuousToggle.checked ? 'continuous' : spinToggle.checked ? 'spin' : 'still';
  const coloring = noColorToggle.checked ? 'plain' : 'colored';
  return `${BEST_KEY}:${movement}:${coloring}`;
}

function readBest() {
  try {
    return JSON.parse(localStorage.getItem(bestKey()));
  } catch {
    return null;
  }
}

function readSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) ?? {};
  } catch {
    return {};
  }
}

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      continuous: continuousToggle.checked,
      spin: spinToggle.checked,
      noColor: noColorToggle.checked,
    }));
  } catch {
    // Privacy settings still apply when browser storage is blocked.
  }
  updateStatus();
}

function lockDifficultyOptions(locked) {
  continuousToggle.disabled = locked;
  spinToggle.disabled = locked;
  noColorToggle.disabled = locked;
}

function finishRound() {
  cancelAnimationFrame(animationFrame);
  stopContinuousSpin();
  lockDifficultyOptions(false);
  timerElement.textContent = formatTime(session.elapsedMs);
  const oldBest = readBest();
  const isBest = !oldBest || session.elapsedMs < oldBest.elapsedMs;
  const best = isBest ? { elapsedMs: session.elapsedMs, mistakes: session.mistakes } : oldBest;
  try {
    localStorage.setItem(bestKey(), JSON.stringify(best));
  } catch {
    // Completing a round must not depend on persistent storage access.
  }

  document.querySelector('#resultTime').textContent = formatTime(session.elapsedMs);
  document.querySelector('#resultMistakes').textContent = session.mistakes;
  document.querySelector('#bestTime').textContent = `${formatTime(best.elapsedMs)}${isBest ? ' · new' : ''}`;
  resultDialog.showModal();
}

function prepareBoard() {
  cancelAnimationFrame(animationFrame);
  window.clearTimeout(spinTimer);
  stopContinuousSpin();
  boardWrap.classList.remove('is-spinning');
  board = createBoard(SIZE);
  session = null;
  ringRotations = [0, 0, 0];
  timerElement.textContent = '00:00.0';
  lockDifficultyOptions(false);
  boardWrap.classList.add('is-idle');
  startLayer.hidden = false;
  renderBoard();
  updateStatus();
}

function startRound() {
  session = createSession(SIZE, performance.now());
  lockDifficultyOptions(true);
  boardWrap.classList.remove('is-idle');
  startLayer.hidden = true;
  updateStatus();
  if (continuousToggle.checked) startContinuousSpin();
  updateTimer();
}

startButton.addEventListener('click', startRound);
resetButton.addEventListener('click', prepareBoard);
continuousToggle.addEventListener('change', () => {
  if (continuousToggle.checked) spinToggle.checked = false;
  saveSettings();
});
spinToggle.addEventListener('change', () => {
  if (spinToggle.checked) continuousToggle.checked = false;
  saveSettings();
});
noColorToggle.addEventListener('change', saveSettings);
document.querySelector('#howButton').addEventListener('click', () => howDialog.showModal());
document.querySelector('#playAgainButton').addEventListener('click', () => {
  resultDialog.close();
  prepareBoard();
});

const savedSettings = readSettings();
continuousToggle.checked = Boolean(savedSettings.continuous);
spinToggle.checked = Boolean(savedSettings.spin) && !continuousToggle.checked;
noColorToggle.checked = Boolean(savedSettings.noColor);
prepareBoard();
