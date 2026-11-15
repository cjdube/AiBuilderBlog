// --- Core State Configurations ---
const STATES = {
  READY: 'READY',
  WORK: 'WORK',
  REST: 'REST',
  PAUSED: 'PAUSED'
};

let currentState = STATES.READY;
let previousTimerState = STATES.READY; // To know where to resume from if paused

let workDuration = 40; // Default work interval (seconds)
let restDuration = 20; // Default rest interval (seconds)

let timeRemaining = workDuration * 1000; // Track in milliseconds for visual fluid animations
let totalDuration = workDuration * 1000;

let currentRound = 0;
let lastTickSecond = -1; // To avoid duplicate beeps in a single second

// Precise Timer Loop Variables
let expectedTime = 0;
let timeoutId = null;
let requestFrameId = null;
let isTimerRunning = false;
let targetTime = 0; // Absolute timestamp when current phase finishes

// Web Audio API State
let audioCtx = null;
let isMuted = false;

// Wake Lock API State
let wakeLock = null;

// --- DOM Element References ---
const timeDisplay = document.getElementById('time-display');
const timerStateLabel = document.getElementById('timer-state-label');
const nextPhaseVal = document.getElementById('next-phase-val');
const cycleCountVal = document.getElementById('cycle-count-val');
const timerCard = document.getElementById('timer-card');
const primaryBtn = document.getElementById('primary-btn');
const primaryBtnText = document.getElementById('primary-btn-text');
const playIcon = document.getElementById('play-icon');
const pauseIcon = document.getElementById('pause-icon');
const resetBtn = document.getElementById('reset-btn');
const muteBtn = document.getElementById('mute-btn');
const soundOnIcon = document.getElementById('sound-on-icon');
const soundOffIcon = document.getElementById('sound-off-icon');
const wakelockIndicator = document.getElementById('wakelock-indicator');
const wakelockText = document.getElementById('wakelock-text');
const progressIndicator = document.getElementById('progress-indicator');

// Preset Chips
const preset4020 = document.getElementById('preset-40-20');
const preset3015 = document.getElementById('preset-30-15');
const preset2010 = document.getElementById('preset-20-10');

// SVG Circular Ring Configuration
const CIRCUMFERENCE = 552.92; // 2 * Math.PI * 88

// --- Web Audio Synthesizer Engine ---
function initAudio() {
  if (audioCtx) return;
  // Initialize standard or webkit audio contexts for wide iOS support
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (AudioContextClass) {
    audioCtx = new AudioContextClass();
  }
}

/**
 * Synthesizes dynamic, clean retro sound effects without external audio files.
 * Uses envelope ramping to avoid pops and clicks on speaker cones.
 * @param {Array<number>} frequencies - Tone frequencies to play in succession
 * @param {string} type - Oscillator wave type ('sine', 'triangle', 'square', 'sawtooth')
 * @param {number} duration - Length of individual note decay
 * @param {number} gap - Spacing between successive notes (arpeggios)
 */
function playSynthTone(frequencies, type = 'sine', duration = 0.15, gap = 0.08) {
  if (isMuted) return;
  initAudio();
  if (!audioCtx) return;
  
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const now = audioCtx.currentTime;
  
  frequencies.forEach((freq, index) => {
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now + (index * gap));
    
    // Premium audio envelope: smooth ramp up, organic exponential decay
    gainNode.gain.setValueAtTime(0.001, now + (index * gap));
    gainNode.gain.linearRampToValueAtTime(0.15, now + (index * gap) + 0.015);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + (index * gap) + duration);
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.start(now + (index * gap));
    osc.stop(now + (index * gap) + duration + 0.05);
  });
}

const AudioEffects = {
  // Short countdown tick
  tick: () => playSynthTone([900], 'sine', 0.04, 0),
  // Transition to exercise phase: uplifting bright ring
  workStart: () => playSynthTone([784, 987.77, 1174.66], 'triangle', 0.25, 0.08),
  // Transition to rest phase: soothing descending chime
  restStart: () => playSynthTone([659.25, 523.25, 392], 'sine', 0.35, 0.12),
  // Double beep when timer is completed or reset
  reset: () => playSynthTone([440, 440], 'sine', 0.15, 0.1)
};

// --- iOS Safari Screen Wake Lock Management ---
async function requestWakeLock() {
  if (!('wakeLock' in navigator)) {
    console.log('Wake Lock API not supported in this browser.');
    return;
  }
  
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakelockIndicator.classList.add('active');
    wakelockText.textContent = 'Keep Screen Active';
    
    // Automatically manage release listener
    wakeLock.addEventListener('release', () => {
      console.log('Screen Wake Lock was released.');
      if (!isTimerRunning) {
        wakelockIndicator.classList.remove('active');
        wakelockText.textContent = 'Keep Screen On';
      }
    });
  } catch (err) {
    console.error(`Wake Lock failed: ${err.name}, ${err.message}`);
  }
}

function releaseWakeLock() {
  if (wakeLock) {
    wakeLock.release();
    wakeLock = null;
  }
  wakelockIndicator.classList.remove('active');
  wakelockText.textContent = 'Keep Screen On';
}

// Re-acquire Wake Lock and resume AudioContext when the tab is restored to the viewport
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible') {
    if (wakeLock !== null && isTimerRunning) {
      await requestWakeLock();
    }
    // Re-resume Web Audio Context on iOS if browser suspended it in background
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }
});

// --- Dynamic Styling State Handlers ---
function updateThemeColors() {
  let startColor = 'var(--accent-ready-start)';
  let endColor = 'var(--accent-ready-end)';
  let shadowColor = 'rgba(130, 80, 223, 0.3)';
  
  if (currentState === STATES.WORK) {
    startColor = 'var(--accent-work-start)';
    endColor = 'var(--accent-work-end)';
    shadowColor = 'rgba(255, 110, 80, 0.35)';
  } else if (currentState === STATES.REST) {
    startColor = 'var(--accent-rest-start)';
    endColor = 'var(--accent-rest-end)';
    shadowColor = 'rgba(16, 185, 129, 0.3)';
  }
  
  document.documentElement.style.setProperty('--active-start', startColor);
  document.documentElement.style.setProperty('--active-end', endColor);
  document.documentElement.style.setProperty('--active-shadow', shadowColor);
}

// --- Circular Progress Visuals ---
function setProgress(percent) {
  const offset = CIRCUMFERENCE - (percent * CIRCUMFERENCE);
  progressIndicator.style.strokeDashoffset = offset;
}

// --- Core State Transitions ---
function updateUI() {
  updateThemeColors();
  
  // Format seconds rounded up for classic countdown appearance
  const secondsLeft = Math.max(0, Math.ceil(timeRemaining / 1000));
  timeDisplay.textContent = secondsLeft;
  
  // Dynamic labels
  switch (currentState) {
    case STATES.READY:
      timerStateLabel.textContent = 'READY';
      timerStateLabel.style.color = '#ffffff';
      nextPhaseVal.textContent = 'Work (40s)';
      break;
    case STATES.WORK:
      timerStateLabel.textContent = 'WORK';
      timerStateLabel.style.color = 'var(--accent-work-start)';
      nextPhaseVal.textContent = 'Rest (' + restDuration + 's)';
      break;
    case STATES.REST:
      timerStateLabel.textContent = 'REST';
      timerStateLabel.style.color = 'var(--accent-rest-start)';
      nextPhaseVal.textContent = 'Work (' + workDuration + 's)';
      break;
    case STATES.PAUSED:
      timerStateLabel.textContent = 'PAUSED';
      timerStateLabel.style.color = '#ffffff';
      break;
  }
  
  cycleCountVal.textContent = currentRound;
  
  // Button icon shifts
  if (isTimerRunning) {
    playIcon.style.display = 'none';
    pauseIcon.style.display = 'block';
    primaryBtnText.textContent = 'Pause';
    primaryBtn.classList.remove('pulse');
  } else {
    playIcon.style.display = 'block';
    pauseIcon.style.display = 'none';
    primaryBtnText.textContent = currentState === STATES.READY ? 'Start' : 'Resume';
  }
  
  // Progress Ring fraction calculation
  const fraction = timeRemaining / totalDuration;
  setProgress(Math.max(0, Math.min(1, fraction)));
}

// --- High-Precision Timer Engine ---
function timerTick() {
  if (!isTimerRunning) return;
  
  const now = Date.now();
  timeRemaining = targetTime - now;
  
  // Check countdown transition sound trigger (last 3, 2, 1 seconds)
  const currentSecond = Math.max(0, Math.ceil(timeRemaining / 1000));
  if (currentSecond <= 3 && currentSecond > 0 && currentSecond !== lastTickSecond) {
    AudioEffects.tick();
    lastTickSecond = currentSecond;
    // Add pop-in animation effect on text for feedback
    timeDisplay.classList.remove('pulse');
    void timeDisplay.offsetWidth; // Trigger reflow
    timeDisplay.classList.add('pulse');
  }
  
  // Phase complete transition
  if (timeRemaining <= 0) {
    handlePhaseComplete();
  } else {
    // Keep animating visually with requestAnimationFrame
    updateUI();
    requestFrameId = requestAnimationFrame(timerTick);
  }
}

function handlePhaseComplete() {
  cancelAnimationFrame(requestFrameId);
  
  if (currentState === STATES.WORK) {
    // Transition to REST
    currentState = STATES.REST;
    timeRemaining = restDuration * 1000;
    totalDuration = restDuration * 1000;
    targetTime = Date.now() + timeRemaining;
    lastTickSecond = -1;
    
    AudioEffects.restStart();
    
    // Card transitions pulse
    timerCard.classList.remove('pulse');
    void timerCard.offsetWidth;
    timerCard.classList.add('pulse');
    
    updateUI();
    requestFrameId = requestAnimationFrame(timerTick);
  } else if (currentState === STATES.REST) {
    // Transition to WORK
    currentState = STATES.WORK;
    timeRemaining = workDuration * 1000;
    totalDuration = workDuration * 1000;
    targetTime = Date.now() + timeRemaining;
    lastTickSecond = -1;
    
    currentRound++;
    AudioEffects.workStart();
    
    timerCard.classList.remove('pulse');
    void timerCard.offsetWidth;
    timerCard.classList.add('pulse');
    
    updateUI();
    requestFrameId = requestAnimationFrame(timerTick);
  }
}

// --- Main Control Triggers ---
function startTimer() {
  if (isTimerRunning) return;
  
  // Unlock or resume iOS Safari AudioContext on active gesture
  initAudio();
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  
  isTimerRunning = true;
  expectedTime = Date.now() + 1000;
  
  // Set up absolute deadline target
  targetTime = Date.now() + timeRemaining;
  
  if (currentState === STATES.READY) {
    currentState = STATES.WORK;
    timeRemaining = workDuration * 1000;
    totalDuration = workDuration * 1000;
    targetTime = Date.now() + timeRemaining;
    currentRound = 1;
    AudioEffects.workStart();
  } else if (currentState === STATES.PAUSED) {
    currentState = previousTimerState;
    targetTime = Date.now() + timeRemaining;
  }
  
  requestWakeLock();
  updateUI();
  requestFrameId = requestAnimationFrame(timerTick);
}

function pauseTimer() {
  if (!isTimerRunning) return;
  
  cancelAnimationFrame(requestFrameId);
  isTimerRunning = false;
  previousTimerState = currentState;
  currentState = STATES.PAUSED;
  
  releaseWakeLock();
  updateUI();
}

function resetTimer() {
  cancelAnimationFrame(requestFrameId);
  isTimerRunning = false;
  currentState = STATES.READY;
  currentRound = 0;
  timeRemaining = workDuration * 1000;
  totalDuration = workDuration * 1000;
  lastTickSecond = -1;
  
  AudioEffects.reset();
  releaseWakeLock();
  updateUI();
}

// --- Preset Configuration Managers ---
function selectPreset(work, rest, activeChip) {
  // If timer is running, pause it first
  if (isTimerRunning) {
    pauseTimer();
  }
  
  workDuration = work;
  restDuration = rest;
  
  // Update chip visual states
  [preset4020, preset3015, preset2010].forEach(chip => chip.classList.remove('active'));
  activeChip.classList.add('active');
  
  // Reset state to ready with new settings
  currentState = STATES.READY;
  currentRound = 0;
  timeRemaining = workDuration * 1000;
  totalDuration = workDuration * 1000;
  lastTickSecond = -1;
  
  updateUI();
}

// --- Event Listeners Bindings ---
primaryBtn.addEventListener('click', () => {
  if (isTimerRunning) {
    pauseTimer();
  } else {
    startTimer();
  }
});

resetBtn.addEventListener('click', resetTimer);

muteBtn.addEventListener('click', () => {
  isMuted = !isMuted;
  
  if (isMuted) {
    muteBtn.classList.remove('active');
    soundOnIcon.style.display = 'none';
    soundOffIcon.style.display = 'block';
  } else {
    muteBtn.classList.add('active');
    soundOnIcon.style.display = 'block';
    soundOffIcon.style.display = 'none';
    
    // Quick indicator chirp to let user hear the volume level
    initAudio();
    AudioEffects.tick();
  }
});

// Preset Triggers
preset4020.addEventListener('click', () => selectPreset(40, 20, preset4020));
preset3015.addEventListener('click', () => selectPreset(30, 15, preset3015));
preset2010.addEventListener('click', () => selectPreset(20, 10, preset2010));

// --- Global iOS Safari Audio Unlocking Routine ---
// iOS highly restricts Web Audio until a synchronous user tap plays a sound.
// We attach touch/click listeners to the entire window so the very first tap
// (whether on "Start", a preset, or anywhere) unlocks the AudioContext instantly.
function unlockAudioContext() {
  initAudio();
  if (!audioCtx) return;
  
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().then(() => {
      console.log('AudioContext successfully unlocked on iOS Safari.');
    });
  }
  
  // Play a silent buffer to trigger physical speaker activation
  const buffer = audioCtx.createBuffer(1, 1, 22050);
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(audioCtx.destination);
  source.start(0);
  
  // Cleanup listeners so we only run this once
  window.removeEventListener('click', unlockAudioContext);
  window.removeEventListener('touchend', unlockAudioContext);
}

window.addEventListener('click', unlockAudioContext, { passive: true });
window.addEventListener('touchend', unlockAudioContext, { passive: true });

// --- Initial Launch Setup ---
updateUI();
setProgress(1); // Set circular ring to 100% full
