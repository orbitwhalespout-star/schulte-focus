import { boardLayout, continuousSpinPlan, createBoard, createSession, difficultyBadges, nextRingRotations, normalizeBest, presetConfiguration, selectNumber } from './game.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const BEST_KEY = 'schulte-focus-best-v1';
const SETTINGS_KEY = 'schulte-focus-settings-v1';


const boardElement = document.querySelector('#board');
const boardWrap = document.querySelector('#boardWrap');
const startLayer = document.querySelector('#startLayer');
const startButton = document.querySelector('#startButton');
const startCopy = document.querySelector('#startCopy');
const resetButton = document.querySelector('#resetButton');
const nextNumber = document.querySelector('#nextNumber');
const timerElement = document.querySelector('#timer');
const progressElement = document.querySelector('#progress');
const mistakesElement = document.querySelector('#mistakes');
const lastTapCounter = document.querySelector('#lastTapCounter');
const lastTapElement = document.querySelector('#lastTap');
const movementInputs = [...document.querySelectorAll('input[name="movement"]')];
const noColorToggle = document.querySelector('#noColorToggle');
const resetOnMistakeToggle = document.querySelector('#resetOnMistakeToggle');
const fourRingsToggle = document.querySelector('#fourRingsToggle');
const presetButtons = [...document.querySelectorAll('[data-preset]')];
const presetSummary = document.querySelector('#presetSummary');
const debugIndicator = document.querySelector('#debugIndicator');
const customControls = document.querySelector('#customControls');
const gameAnnouncement = document.querySelector('#gameAnnouncement');
const howDialog = document.querySelector('#howDialog');
const resultDialog = document.querySelector('#resultDialog');
const resultDifficulty = document.querySelector('#resultDifficulty');
const resultBadges = document.querySelector('#resultBadges');

let board = [];
let activeLayout = boardLayout();
let boardSize = activeLayout.size;
let session = null;
let animationFrame = null;
let ringRotations = Array(activeLayout.rings.length).fill(0);
let spinTimer = null;
let resetTimer = null;
let announcementFrame = null;
let debugMode = false;
let newBoardClickCount = 0;
let activePreset = 'easy';

function selectedPreset() {
  return activePreset;
}

function setPreset(preset) {
  activePreset = preset;
  presetButtons.forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.preset === preset));
  });
}

function customConfiguration() {
  return {
    movement: document.querySelector('input[name="movement"]:checked')?.value ?? 'still',
    noColor: noColorToggle.checked,
    resetOnMistake: resetOnMistakeToggle.checked,
    fourRings: fourRingsToggle.checked,
  };
}

function currentConfiguration() {
  const preset = selectedPreset();
  const configured = presetConfiguration(preset) ?? customConfiguration();
  return {
    ...configured,
    preset,
    fourRings: debugMode || configured.fourRings,
    debug: debugMode,
    size: boardSize,
  };
}

function movementMode() {
  return currentConfiguration().movement;
}

function updatePresetPresentation() {
  const config = currentConfiguration();
  const movement = config.movement === 'after-tap' ? 'Spin after tap' : config.movement === 'continuous' ? 'Continuous' : 'Still';
  presetSummary.textContent = `${config.fourRings ? 4 : 3} rings · ${movement} · ${config.noColor ? 'No color cues' : 'Color hints'} · ${config.resetOnMistake ? 'Reset on miss' : 'No reset'}`;
  customControls.hidden = selectedPreset() !== 'custom';
  debugIndicator.hidden = !debugMode;
}

function configureBoardLayout() {
  const config = currentConfiguration();
  activeLayout = boardLayout({ fourRings: config.fourRings, debug: debugMode });
  boardSize = activeLayout.size;
  ringRotations = Array(activeLayout.rings.length).fill(0);
  const diameter = activeLayout.viewRadius * 2;
  boardElement.setAttribute('viewBox', `${-activeLayout.viewRadius} ${-activeLayout.viewRadius} ${diameter} ${diameter}`);
  boardElement.setAttribute('aria-label', `Circular board containing numbers 1 through ${boardSize}`);
  startCopy.textContent = `Find 1 → ${boardSize}`;
  boardWrap.classList.toggle('four-rings', activeLayout.rings.length === 4);
  boardWrap.classList.toggle('debug-board', debugMode);
}

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

  activeLayout.rings.forEach((ring, ringIndex) => {
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
  const config = currentConfiguration();
  const found = session ? Math.min(session.next - 1, boardSize) : 0;
  progressElement.textContent = `${found} / ${boardSize}`;
  mistakesElement.textContent = session?.mistakes ?? 0;
  lastTapElement.textContent = session?.lastTapped ?? '—';
  lastTapCounter.hidden = !config.noColor;
  boardWrap.classList.toggle('no-color', config.noColor);
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
        dur: '0.9s',
        calcMode: 'spline',
        keyTimes: '0;1',
        keySplines: '0.22 1 0.36 1',
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
          dur: '0.9s',
          calcMode: 'spline',
          keyTimes: '0;1',
          keySplines: '0.22 1 0.36 1',
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
      }, 920);
    }
    ring.dataset.rotation = next;
  });

  spinTimer = window.setTimeout(() => boardWrap.classList.remove('is-spinning'), reducedMotion ? 0 : 930);
}

function startContinuousSpin() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const plan = continuousSpinPlan(activeLayout.rings.length);
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

function clearGameAnnouncement() {
  if (announcementFrame !== null) window.cancelAnimationFrame(announcementFrame);
  announcementFrame = null;
  gameAnnouncement.textContent = '';
}

function restartActiveRound() {
  resetTimer = null;
  cancelAnimationFrame(animationFrame);
  window.clearTimeout(spinTimer);
  stopContinuousSpin();
  board = createBoard(boardSize);
  session = createSession(boardSize, performance.now());
  ringRotations = Array(activeLayout.rings.length).fill(0);
  renderBoard();
  boardWrap.classList.remove('is-idle', 'is-spinning', 'is-resetting', 'shake');
  startLayer.hidden = true;
  lockDifficultyOptions(true);
  updateStatus();
  document.querySelector('[data-value="1"]').focus({ preventScroll: true });
  clearGameAnnouncement();
  announcementFrame = window.requestAnimationFrame(() => {
    announcementFrame = null;
    gameAnnouncement.textContent = 'Wrong number. Board reset. Find 1.';
  });
  if (movementMode() === 'continuous') startContinuousSpin();
  updateTimer();
}

function chooseNumber(element, value) {
  if (!session || session.status !== 'playing' || resetTimer !== null || boardWrap.classList.contains('is-spinning') || element.classList.contains('solved')) return;
  const previousNext = session.next;
  session = selectNumber(session, value, performance.now());

  if (session.next > previousNext) {
    const config = currentConfiguration();
    element.classList.add('solved');
    element.setAttribute('aria-disabled', 'true');
    element.setAttribute('tabindex', '-1');
    if (document.activeElement === element) element.blur();
    if (!config.noColor) {
      element.classList.add('found');
    }
    if (movementMode() === 'after-tap' && session.status === 'playing') spinRings();
  } else {
    element.classList.add('wrong');
    if (currentConfiguration().resetOnMistake) {
      boardWrap.classList.add('is-resetting');
      resetTimer = window.setTimeout(restartActiveRound, 180);
    } else {
      boardWrap.classList.remove('shake');
      void boardWrap.offsetWidth;
      boardWrap.classList.add('shake');
      window.setTimeout(() => element.classList.remove('wrong'), 220);
    }
  }

  updateStatus();
  if (session.status === 'complete') finishRound();
}

function bestKey() {
  const config = currentConfiguration();
  const mode = config.movement;
  let key = BEST_KEY;
  if (mode !== 'still' || config.noColor) {
    const movement = mode === 'after-tap' ? 'spin' : mode;
    const coloring = config.noColor ? 'plain' : 'colored';
    key = `${BEST_KEY}:${movement}:${coloring}`;
  }
  if (config.resetOnMistake) key = `${key}:reset`;
  if (config.fourRings) key = `${key}:four-rings`;
  if (debugMode) key = `${key}:debug-${boardSize}`;
  return key;
}

function readBest() {
  try {
    return normalizeBest(JSON.parse(localStorage.getItem(bestKey())));
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
  const custom = customConfiguration();
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      preset: selectedPreset(),
      ...custom,
    }));
  } catch {
    // Privacy settings still apply when browser storage is blocked.
  }
  updatePresetPresentation();
  updateStatus();
}

function lockDifficultyOptions(locked) {
  presetButtons.forEach(button => { button.disabled = locked; });
  movementInputs.forEach(input => { input.disabled = locked; });
  noColorToggle.disabled = locked;
  resetOnMistakeToggle.disabled = locked;
  fourRingsToggle.disabled = locked;
}

function renderResultDifficulty() {
  const labels = difficultyBadges(currentConfiguration());
  const badges = labels.map(label => {
    const badge = document.createElement('span');
    badge.className = 'difficulty-badge';
    badge.dataset.badge = label.toLowerCase().replace(/\s*·\s*/g, '-').replace(/\s+/g, '-');
    badge.textContent = label;
    return badge;
  });
  resultBadges.replaceChildren(...badges);
  resultDifficulty.hidden = labels.length === 0;
}

function finishRound() {
  cancelAnimationFrame(animationFrame);
  clearGameAnnouncement();
  window.clearTimeout(resetTimer);
  resetTimer = null;
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
  renderResultDifficulty();
  resultDialog.showModal();
}

function prepareBoard() {
  cancelAnimationFrame(animationFrame);
  window.clearTimeout(spinTimer);
  window.clearTimeout(resetTimer);
  resetTimer = null;
  stopContinuousSpin();
  boardWrap.classList.remove('is-spinning', 'is-resetting', 'shake');
  updatePresetPresentation();
  configureBoardLayout();
  board = createBoard(boardSize);
  session = null;
  timerElement.textContent = '00:00.0';
  clearGameAnnouncement();
  lockDifficultyOptions(false);
  boardWrap.classList.add('is-idle');
  startLayer.hidden = false;
  renderBoard();
  updateStatus();
}

function startRound() {
  session = createSession(boardSize, performance.now());
  lockDifficultyOptions(true);
  boardWrap.classList.remove('is-idle');
  startLayer.hidden = true;
  updateStatus();
  if (movementMode() === 'continuous') startContinuousSpin();
  updateTimer();
}

startButton.addEventListener('click', startRound);
resetButton.addEventListener('click', () => {
  newBoardClickCount += 1;
  const activatedDebug = !debugMode && newBoardClickCount >= 10;
  if (activatedDebug) debugMode = true;
  prepareBoard();
  if (activatedDebug) gameAnnouncement.textContent = 'Debug mode enabled. Eight-number board.';
});
movementInputs.forEach(input => input.addEventListener('change', saveSettings));
noColorToggle.addEventListener('change', saveSettings);
resetOnMistakeToggle.addEventListener('change', saveSettings);
fourRingsToggle.addEventListener('change', () => {
  saveSettings();
  prepareBoard();
});
presetButtons.forEach(button => button.addEventListener('click', () => {
  setPreset(button.dataset.preset);
  saveSettings();
  prepareBoard();
}));
document.querySelector('#howButton').addEventListener('click', () => howDialog.showModal());
document.querySelector('#playAgainButton').addEventListener('click', () => {
  resultDialog.close();
  prepareBoard();
});

const savedSettings = readSettings();
const savedMovement = ['still', 'continuous', 'after-tap'].includes(savedSettings.movement)
  ? savedSettings.movement
  : savedSettings.continuous ? 'continuous' : savedSettings.spin ? 'after-tap' : 'still';
const validPresets = ['easy', 'medium', 'hard', 'extra-hard', 'max', 'hell', 'custom'];
const legacyIsEasy = savedMovement === 'still' && !savedSettings.noColor && !savedSettings.resetOnMistake && !savedSettings.fourRings;
setPreset(validPresets.includes(savedSettings.preset)
  ? savedSettings.preset
  : legacyIsEasy ? 'easy' : 'custom');
document.querySelector(`input[name="movement"][value="${savedMovement}"]`).checked = true;
noColorToggle.checked = Boolean(savedSettings.noColor);
resetOnMistakeToggle.checked = Boolean(savedSettings.resetOnMistake);
fourRingsToggle.checked = Boolean(savedSettings.fourRings);
prepareBoard();
