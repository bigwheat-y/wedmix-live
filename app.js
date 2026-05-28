import { triggerSynthEffect } from './synth-effects.js';
import { cacheAudioFile, getCachedAudioFile, deleteCachedAudioFile, generateConfigObject, clearAllCaches } from './config-manager.js';

// ==========================================================================
// Tactical Mixer State
// ==========================================================================
let audioCtx = null;
let masterGain = null;
let bgmGain = null;
let soundboardGain = null;
let splitterNode = null;
let analyserL = null;
let analyserR = null;

let isConsoleLocked = false;
let isDuckingActive = false;
let masterVolume = 0.8;
let bgmVolume = 1.0;
let crossfaderGain = 1.0;

// Active scene state
let activeSceneId = null;
let activeBgmSources = {};

// Soundboard polyphonic voices tracking
let activeSoundboardSources = [];

// VU meter elements cached
let leftLEDs = [];
let rightLEDs = [];

// Auto-increment ID for new scenes
let nextSceneId = 9;

// Default wedding scenes setup
let scenes = [
  { id: 1, name: "宾客进场暖场", assignedTrackId: null, assignedTrackName: null, buffer: null, fadeIn: 2.0, fadeOut: 2.0, startTime: 0, endTime: null, loop: false },
  { id: 2, name: "司仪开场致辞", assignedTrackId: null, assignedTrackName: null, buffer: null, fadeIn: 1.0, fadeOut: 1.5, startTime: 0, endTime: null, loop: false },
  { id: 3, name: "新郎帅气入场", assignedTrackId: null, assignedTrackName: null, buffer: null, fadeIn: 1.5, fadeOut: 2.0, startTime: 0, endTime: null, loop: false },
  { id: 4, name: "新娘圣洁入场", assignedTrackId: null, assignedTrackName: null, buffer: null, fadeIn: 2.0, fadeOut: 2.5, startTime: 0, endTime: null, loop: false },
  { id: 5, name: "誓言交换与致辞", assignedTrackId: null, assignedTrackName: null, buffer: null, fadeIn: 2.5, fadeOut: 2.0, startTime: 0, endTime: null, loop: false },
  { id: 6, name: "信物交换与拥吻", assignedTrackId: null, assignedTrackName: null, buffer: null, fadeIn: 1.0, fadeOut: 2.0, startTime: 0, endTime: null, loop: false },
  { id: 7, name: "礼成退场欢庆", assignedTrackId: null, assignedTrackName: null, buffer: null, fadeIn: 1.0, fadeOut: 2.5, startTime: 0, endTime: null, loop: false },
  { id: 8, name: "宴会背景与敬酒", assignedTrackId: null, assignedTrackName: null, buffer: null, fadeIn: 2.5, fadeOut: 2.5, startTime: 0, endTime: null, loop: false }
];

// Default soundboard pads setup
let soundboard = [
  { id: 1, name: "掌声雷动", type: "synth", synthEffectId: "fanfare", assignedTrackId: null, assignedTrackName: null, buffer: null, icon: "👏" },
  { id: 2, name: "欢呼尖叫", type: "synth", synthEffectId: "fanfare", assignedTrackId: null, assignedTrackName: null, buffer: null, icon: "🎉" },
  { id: 3, name: "教堂钟声", type: "synth", synthEffectId: "bell", assignedTrackId: null, assignedTrackName: null, buffer: null, icon: "🔔" },
  { id: 4, name: "浪漫音垫", type: "synth", synthEffectId: "pad", assignedTrackId: null, assignedTrackName: null, buffer: null, icon: "🌅" },
  { id: 5, name: "催泪音垫", type: "synth", synthEffectId: "pad", assignedTrackId: null, assignedTrackName: null, buffer: null, icon: "😭" },
  { id: 6, name: "祝酒礼乐", type: "synth", synthEffectId: "fanfare", assignedTrackId: null, assignedTrackName: null, buffer: null, icon: "👑" },
  { id: 7, name: "紧张鼓点", type: "synth", synthEffectId: "suspense", assignedTrackId: null, assignedTrackName: null, buffer: null, icon: "🥁" },
  { id: 8, name: "悬念扫频", type: "synth", synthEffectId: "suspense", assignedTrackId: null, assignedTrackName: null, buffer: null, icon: "⚡" },
  { id: 9, name: "进行曲选段", type: "synth", synthEffectId: "fanfare", assignedTrackId: null, assignedTrackName: null, buffer: null, icon: "👰" },
  { id: 10, name: "萨克斯浪漫", type: "synth", synthEffectId: "pad", assignedTrackId: null, assignedTrackName: null, buffer: null, icon: "🎷" },
  { id: 11, name: "爆笑气氛", type: "synth", synthEffectId: "fanfare", assignedTrackId: null, assignedTrackName: null, buffer: null, icon: "🤣" },
  { id: 12, name: "静音舱氛围", type: "synth", synthEffectId: "pad", assignedTrackId: null, assignedTrackName: null, buffer: null, icon: "🤫" }
];

// Active selected soundboard pad for config modal
let currentEditingPadId = null;

// Display visualizer waveform state
let activeDrawingBuffer = null;
let playheadTime = 0;
let playbackOffset = 0;
let playbackStartTime = 0;
let activeVisualizerInterval = null;

// ==========================================================================
// DOM Elements Cache (global only — scene elements are dynamic)
// ==========================================================================
let weddingSchemeName = null;
let btnSaveProfile = null;
let btnLoadProfileTrigger = null;
let btnPreloadDemo = null;
let btnResetAll = null;
let profileFileInput = null;
let ledTimeDisplay = null;

let masterStatusTag = null;
let scenesFlowList = null;

let deckDisplayTrackTitle = null;
let deckWaveformCanvas = null;
let deckWaveformLoader = null;
let deckValCurrentTime = null;
let deckValTotalDuration = null;
let deckValCrossfadePreset = null;

let btnLivePlayPause = null;
let btnLiveStop = null;
let btnLiveLoop = null;
let chkConsoleLock = null;

let btnEmergencyFade = null;
let btnDuckingSwitch = null;
let duckingLed = null;
let masterCrossfaderSlider = null;
let crossfaderPositionVal = null;
let masterVolumeSlider = null;
let masterVolumeVal = null;

let vuLeftMeter = null;
let vuRightMeter = null;

let padConfigModal = null;
let configPadTitle = null;
let configPadInputName = null;
let radioTypeSynth = null;
let radioTypeCustom = null;
let groupSynthSelect = null;
let groupCustomFile = null;
let configSynthEffectSelect = null;
let padCustomFileDropzone = null;
let padCustomFileInput = null;
let padCustomFileName = null;
let btnConfigReset = null;
let btnConfigSave = null;
let btnConfigClose = null;

let liveLoaderOverlay = null;
let liveLoaderTitle = null;
let liveLoaderDesc = null;

// ==========================================================================
// Core Entry & Initialization
// ==========================================================================
function initConsole() {
  cacheDOMElements();
  buildVUMeters();

  // Try to restore config from localStorage on startup
  restoreConfigFromLocalStorage();

  renderScenes();
  bindGlobalEventHandlers();

  // LED System Clock Loop
  setInterval(updateLEDClock, 1000);
  updateLEDClock();

  // Try to load cached assets from IndexedDB database on startup
  loadCachedWeddingAssets();
}

function cacheDOMElements() {
  weddingSchemeName = document.getElementById('wedding-scheme-name');
  btnSaveProfile = document.getElementById('btn-save-profile');
  btnLoadProfileTrigger = document.getElementById('btn-load-profile-trigger');
  btnPreloadDemo = document.getElementById('btn-preload-demo');
  btnResetAll = document.getElementById('btn-reset-all');
  profileFileInput = document.getElementById('profile-file-input');
  ledTimeDisplay = document.getElementById('led-time-display');

  masterStatusTag = document.getElementById('master-status-tag');
  scenesFlowList = document.getElementById('scenes-flow-list');

  deckDisplayTrackTitle = document.getElementById('deck-display-track-title');
  deckWaveformCanvas = document.getElementById('deck-waveform-canvas');
  deckWaveformLoader = document.getElementById('deck-waveform-loader');
  deckValCurrentTime = document.getElementById('deck-val-current-time');
  deckValTotalDuration = document.getElementById('deck-val-total-duration');
  deckValCrossfadePreset = document.getElementById('deck-val-crossfade-preset');

  btnLivePlayPause = document.getElementById('btn-live-play-pause');
  btnLiveStop = document.getElementById('btn-live-stop');
  btnLiveLoop = document.getElementById('btn-live-loop');
  chkConsoleLock = document.getElementById('chk-console-lock');

  btnEmergencyFade = document.getElementById('btn-emergency-fade');
  btnDuckingSwitch = document.getElementById('btn-ducking-switch');
  duckingLed = document.getElementById('ducking-led');
  masterCrossfaderSlider = document.getElementById('master-crossfader-slider');
  crossfaderPositionVal = document.getElementById('crossfader-position-val');
  masterVolumeSlider = document.getElementById('master-volume-slider');
  masterVolumeVal = document.getElementById('master-volume-val');

  vuLeftMeter = document.getElementById('vu-left-meter');
  vuRightMeter = document.getElementById('vu-right-meter');

  padConfigModal = document.getElementById('pad-config-modal');
  configPadTitle = document.getElementById('config-pad-title');
  configPadInputName = document.getElementById('config-pad-input-name');
  radioTypeSynth = document.getElementById('radio-type-synth');
  radioTypeCustom = document.getElementById('radio-type-custom');
  groupSynthSelect = document.getElementById('group-synth-select');
  groupCustomFile = document.getElementById('group-custom-file');
  configSynthEffectSelect = document.getElementById('config-synth-effect-select');
  padCustomFileDropzone = document.getElementById('pad-custom-file-dropzone');
  padCustomFileInput = document.getElementById('pad-custom-file-input');
  padCustomFileName = document.getElementById('pad-custom-file-name');
  btnConfigReset = document.getElementById('btn-config-reset');
  btnConfigSave = document.getElementById('btn-config-save');
  btnConfigClose = document.getElementById('btn-config-close');

  liveLoaderOverlay = document.getElementById('live-loader-overlay');
  liveLoaderTitle = document.getElementById('live-loader-title');
  liveLoaderDesc = document.getElementById('live-loader-desc');
}

function buildVUMeters() {
  const numLEDs = 15;
  vuLeftMeter.innerHTML = '';
  vuRightMeter.innerHTML = '';
  leftLEDs = [];
  rightLEDs = [];

  for (let i = 0; i < numLEDs; i++) {
    let colorClass = 'led-green';
    if (i >= 9 && i < 13) colorClass = 'led-yellow';
    if (i >= 13) colorClass = 'led-red';

    const segL = document.createElement('div');
    segL.className = `led-segment ${colorClass}`;
    vuLeftMeter.appendChild(segL);
    leftLEDs.push(segL);

    const segR = document.createElement('div');
    segR.className = `led-segment ${colorClass}`;
    vuRightMeter.appendChild(segR);
    rightLEDs.push(segR);
  }
}

// ==========================================================================
// Dynamic Scene Rendering
// ==========================================================================
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderScenes() {
  const container = scenesFlowList;
  container.innerHTML = '';

  scenes.forEach((scene, index) => {
    const card = document.createElement('div');
    card.className = 'scene-item-card' + (activeSceneId === scene.id ? ' active-on-air' : '');
    card.dataset.sceneId = scene.id;
    card.id = `scene-card-${scene.id}`;

    const trackDisplay = scene.assignedTrackName
      ? `🎵 ${scene.assignedTrackName}${scene.buffer ? ' (' + formatTime(scene.buffer.duration) + ')' : ' ⚠️ 音频未加载，请重新上传'}`
      : '📂 点击或拖拽音频文件配乐';

    const dropzoneClass = 'scene-file-dropzone' + (scene.assignedTrackName ? ' assigned' : '');

    card.innerHTML = `
      <div class="scene-num-indicator">${String(index + 1).padStart(2, '0')}</div>
      <div class="scene-body">
        <div class="scene-main-info">
          <input type="text" class="scene-name-input" value="${escapeHtml(scene.name)}" data-scene-id="${scene.id}">
          <span class="scene-status-label" id="scene-status-${scene.id}">${activeSceneId === scene.id ? 'ON AIR' : 'STANDBY'}</span>
        </div>
        <div class="${dropzoneClass}" id="scene-dropzone-${scene.id}">
          <input type="file" class="scene-file-input hidden-input" data-scene-id="${scene.id}" accept="audio/*">
          <span class="dropzone-text" id="scene-track-name-${scene.id}">${trackDisplay}</span>
        </div>
        <div class="scene-controls-row">
          <div class="scene-fading-group">
            <div class="fade-control"><label>淡入:</label><input type="number" class="fade-time-input" data-field="fadeIn" data-scene-id="${scene.id}" min="0" max="10" step="0.5" value="${scene.fadeIn}"><span>s</span></div>
            <div class="fade-control"><label>淡出:</label><input type="number" class="fade-time-input" data-field="fadeOut" data-scene-id="${scene.id}" min="0" max="10" step="0.5" value="${scene.fadeOut}"><span>s</span></div>
          </div>
          <div class="scene-time-group">
            <div class="fade-control"><label>起始:</label><input type="number" class="fade-time-input time-input" data-field="startTime" data-scene-id="${scene.id}" min="0" step="0.1" value="${scene.startTime || 0}"><span>s</span></div>
            <div class="fade-control"><label>结束:</label><input type="number" class="fade-time-input time-input" data-field="endTime" data-scene-id="${scene.id}" min="0" step="0.1" value="${scene.endTime || ''}" placeholder="末尾"><span>s</span></div>
          </div>
          <label class="scene-loop-toggle"><input type="checkbox" class="scene-loop-checkbox" data-scene-id="${scene.id}" ${scene.loop ? 'checked' : ''}><span class="loop-label">🔁</span></label>
        </div>
      </div>
      <div class="scene-actions-column">
        <button class="btn-cue-trigger btn-tactical-cyan" data-scene-id="${scene.id}">⚡ 触发</button>
        <button class="btn-delete-scene" data-scene-id="${scene.id}" title="删除此环节">✕</button>
      </div>
    `;

    container.appendChild(card);
  });

  // Add scene button
  const addBtn = document.createElement('button');
  addBtn.className = 'btn-add-scene';
  addBtn.innerHTML = '➕ 新增仪式环节';
  addBtn.addEventListener('click', addScene);
  container.appendChild(addBtn);

  // Bind per-scene events
  bindSceneEvents();
}

function bindSceneEvents() {
  scenes.forEach(scene => {
    const card = document.getElementById(`scene-card-${scene.id}`);
    if (!card) return;

    const dropzone = card.querySelector('.scene-file-dropzone');
    const fileInput = card.querySelector('.scene-file-input');
    const nameInput = card.querySelector('.scene-name-input');
    const cueBtn = card.querySelector('.btn-cue-trigger');
    const deleteBtn = card.querySelector('.btn-delete-scene');
    const loopCheckbox = card.querySelector('.scene-loop-checkbox');

    // File input click
    dropzone.addEventListener('click', (e) => {
      if (e.target.closest('.scene-file-input')) return;
      fileInput.click();
    });
    fileInput.addEventListener('change', (e) => handleSceneFileSelect(e, scene.id));

    // Drag-and-drop
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('active-hover'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('active-hover'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('active-hover');
      if (e.dataTransfer.files.length > 0) assignAudioToScene(e.dataTransfer.files[0], scene.id);
    });

    // Name edit
    nameInput.addEventListener('blur', () => {
      const oldName = scene.name;
      scene.name = nameInput.value.trim() || scene.name;
      if (oldName !== scene.name) {
        saveCurrentConfigToLocalStorage();
      }
    });
    nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') nameInput.blur(); });

    // Fade & time inputs
    card.querySelectorAll('.fade-time-input').forEach(input => {
      input.addEventListener('change', () => {
        const field = input.dataset.field;
        const val = parseFloat(input.value);
        if (field === 'endTime' && (input.value === '' || isNaN(val))) {
          scene.endTime = null;
        } else {
          scene[field] = val || 0;
        }
        updateDeckCrossfadeInfo();
        saveCurrentConfigToLocalStorage();
      });
    });

    // Loop toggle
    loopCheckbox.addEventListener('change', () => {
      scene.loop = loopCheckbox.checked;
      if (activeSceneId === scene.id && activeBgmSources[scene.id]) {
        const src = activeBgmSources[scene.id].sourceNode;
        src.loop = scene.loop;
        if (scene.loop) {
          src.loopStart = scene.startTime || 0;
          src.loopEnd = scene.endTime || (scene.buffer ? scene.buffer.duration : 0);
        }
      }
      saveCurrentConfigToLocalStorage();
    });

    // Cue trigger
    cueBtn.addEventListener('click', () => triggerSceneCue(scene.id));

    // Delete
    deleteBtn.addEventListener('click', () => deleteScene(scene.id));
  });
}

// ==========================================================================
// Scene CRUD Operations
// ==========================================================================
function addScene() {
  const newScene = {
    id: nextSceneId++,
    name: `新环节 ${scenes.length + 1}`,
    assignedTrackId: null,
    assignedTrackName: null,
    buffer: null,
    fadeIn: 2.0,
    fadeOut: 2.0,
    startTime: 0,
    endTime: null,
    loop: false
  };
  scenes.push(newScene);
  renderScenes();
  saveCurrentConfigToLocalStorage();
}

function deleteScene(sceneId) {
  if (scenes.length <= 1) {
    alert('至少需要保留一个仪式环节。');
    return;
  }

  if (activeSceneId === sceneId) {
    stopLivePlayback();
  }

  scenes = scenes.filter(s => s.id !== sceneId);
  deleteCachedAudioFile(`scene_${sceneId}_active`).catch(() => {});
  renderScenes();
  saveCurrentConfigToLocalStorage();
}

// ==========================================================================
// Global Event Handlers (non-scene)
// ==========================================================================
function bindGlobalEventHandlers() {
  // Config Saving/Loading
  btnSaveProfile.addEventListener('click', saveWeddingConfigProfile);
  btnLoadProfileTrigger.addEventListener('click', () => profileFileInput.click());
  btnPreloadDemo.addEventListener('click', preloadSystemDemoTracks);
  profileFileInput.addEventListener('change', loadWeddingConfigProfile);
  btnResetAll.addEventListener('click', resetWholeApplication);

  // Auto-save wedding scheme name on typing
  weddingSchemeName.addEventListener('input', () => {
    saveCurrentConfigToLocalStorage();
  });

  // Soundboard Trigger Pad bindings
  soundboard.forEach(pad => {
    const padBtn = document.getElementById(`pad-btn-${pad.id}`);
    const gearBtn = document.getElementById(`pad-gear-${pad.id}`);
    padBtn.addEventListener('click', () => triggerSoundboardPad(pad.id));
    gearBtn.addEventListener('click', (e) => { e.stopPropagation(); openPadConfigModal(pad.id); });
  });

  // Modal Configuration actions
  btnConfigClose.addEventListener('click', closePadConfigModal);
  radioTypeSynth.addEventListener('change', togglePadConfigTypeUI);
  radioTypeCustom.addEventListener('change', togglePadConfigTypeUI);
  btnConfigReset.addEventListener('click', resetPadConfigToDefault);
  btnConfigSave.addEventListener('click', savePadConfiguration);

  padCustomFileDropzone.addEventListener('click', () => padCustomFileInput.click());
  padCustomFileInput.addEventListener('change', handlePadCustomFileSelect);

  // Transport controls
  btnLivePlayPause.addEventListener('click', toggleLivePlayback);
  btnLiveStop.addEventListener('click', stopLivePlayback);
  btnLiveLoop.addEventListener('click', toggleLiveLoop);
  chkConsoleLock.addEventListener('change', handleConsoleLockToggle);

  // Master console controls
  btnEmergencyFade.addEventListener('click', triggerEmergencyFadeOut);
  btnDuckingSwitch.addEventListener('click', toggleMCDucking);
  masterCrossfaderSlider.addEventListener('input', handleCrossfaderChange);
  masterVolumeSlider.addEventListener('input', handleMasterVolumeChange);

  // Drag-and-drop for pad modal
  padCustomFileDropzone.addEventListener('dragover', (e) => { e.preventDefault(); padCustomFileDropzone.style.borderColor = 'var(--neon-cyan)'; });
  padCustomFileDropzone.addEventListener('dragleave', () => { padCustomFileDropzone.style.borderColor = 'rgba(255, 255, 255, 0.15)'; });
  padCustomFileDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    padCustomFileDropzone.style.borderColor = 'rgba(255, 255, 255, 0.15)';
    if (e.dataTransfer.files.length > 0) assignCustomFileToPadConfig(e.dataTransfer.files[0]);
  });

  window.addEventListener('resize', handleCanvasResize);
}

// ==========================================================================
// Mixer Engine Node initialization
// ==========================================================================
function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    bgmGain = audioCtx.createGain();
    soundboardGain = audioCtx.createGain();
    splitterNode = audioCtx.createChannelSplitter(2);
    analyserL = audioCtx.createAnalyser();
    analyserR = audioCtx.createAnalyser();
    analyserL.fftSize = 64;
    analyserR.fftSize = 64;

    bgmGain.connect(masterGain);
    soundboardGain.connect(masterGain);
    masterGain.connect(audioCtx.destination);
    masterGain.connect(splitterNode);
    splitterNode.connect(analyserL, 0);
    splitterNode.connect(analyserR, 1);

    masterGain.gain.setValueAtTime(masterVolume, audioCtx.currentTime);
    bgmGain.gain.setValueAtTime(bgmVolume, audioCtx.currentTime);
    soundboardGain.gain.setValueAtTime(0.8, audioCtx.currentTime);

    requestAnimationFrame(updateVUMetersLoop);
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

// ==========================================================================
// LED System Clock & Display Helpers
// ==========================================================================
function updateLEDClock() {
  const d = new Date();
  ledTimeDisplay.textContent = `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}`;
}

function formatTime(secs) {
  if (isNaN(secs) || secs === Infinity) return '0:00.0';
  const minutes = Math.floor(secs / 60);
  const seconds = Math.floor(secs % 60);
  const tenths = Math.floor((secs % 1) * 10);
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${tenths}`;
}

// ==========================================================================
// Scene Assign & Audio Decoding
// ==========================================================================
function handleSceneFileSelect(e, sceneId) {
  if (e.target.files.length > 0) assignAudioToScene(e.target.files[0], sceneId);
}

async function assignAudioToScene(file, sceneId) {
  const context = getAudioContext();
  const scene = scenes.find(s => s.id === sceneId);
  if (!scene) return;

  const label = document.getElementById(`scene-track-name-${sceneId}`);
  const dropzone = document.getElementById(`scene-dropzone-${sceneId}`);

  label.textContent = `⏳ DECODING: ${file.name}`;
  dropzone.classList.add('assigned');

  try {
    const arrayBuffer = await file.arrayBuffer();
    const trackId = `scene_${sceneId}_active`;

    showLoaderOverlay('CACHING SOUND TRACK', 'Writing audio buffer persistently into local database...');
    await cacheAudioFile(trackId, file);
    hideLoaderOverlay();

    const decodedBuffer = await context.decodeAudioData(arrayBuffer);

    scene.buffer = decodedBuffer;
    scene.assignedTrackId = trackId;
    scene.assignedTrackName = file.name;

    saveCurrentConfigToLocalStorage();

    label.textContent = `🎵 ${file.name} (${formatTime(decodedBuffer.duration)})`;
    label.title = file.name;

    if (activeSceneId === sceneId) {
      activeDrawingBuffer = decodedBuffer;
      deckDisplayTrackTitle.textContent = file.name;
      drawDeckWaveform(decodedBuffer);
      deckValTotalDuration.textContent = formatTime(decodedBuffer.duration);
    }

    console.log(`场景 ${sceneId} 配乐成功分配并缓存：`, file.name);
  } catch (err) {
    console.error(`场景 ${sceneId} 配乐载入失败:`, err);
    label.textContent = `❌ 载入失败，请重新上传`;
    dropzone.classList.remove('assigned');
    hideLoaderOverlay();
    alert(`加载文件 "${file.name}" 失败，请确认它是有效的音频格式。`);
  }
}

// ==========================================================================
// Overlapping Crossfade Scene Cue Playback Engine (with startTime/endTime/loop)
// ==========================================================================
function triggerSceneCue(sceneId) {
  if (isConsoleLocked) { console.warn("调音台控制面板已锁定，屏蔽触发。"); return; }

  const context = getAudioContext();
  const targetScene = scenes.find(s => s.id === sceneId);
  if (!targetScene) return;

  if (!targetScene.buffer) {
    alert(`仪式场景 "${targetScene.name}" 尚未分配背景配乐！请先上传音频。`);
    return;
  }

  if (activeSceneId === sceneId && activeBgmSources[sceneId] && activeBgmSources[sceneId].isPlaying) {
    console.log(`环节 "${targetScene.name}" 已在播放中。`);
    return;
  }

  console.log(`[CUE EVENT] 触发仪式环节 ${sceneId}: "${targetScene.name}"`);

  const prevSceneId = activeSceneId;
  activeSceneId = sceneId;

  masterStatusTag.textContent = `SCENE ${sceneId} ACTIVE`;
  masterStatusTag.className = 'status-indicator-tag status-active';

  // FADE OUT PREVIOUS
  const now = context.currentTime;

  if (prevSceneId && activeBgmSources[prevSceneId]) {
    const prev = activeBgmSources[prevSceneId];
    const prevScene = scenes.find(s => s.id === prevSceneId);
    const fadeOutTime = prevScene ? prevScene.fadeOut : 2.0;

    prev.gainNode.gain.setValueAtTime(prev.gainNode.gain.value, now);
    prev.gainNode.gain.linearRampToValueAtTime(0.0001, now + fadeOutTime);

    const oldSource = prev.sourceNode;
    const oldGain = prev.gainNode;
    setTimeout(() => { try { oldSource.stop(); oldSource.disconnect(); oldGain.disconnect(); } catch(e) {} }, (fadeOutTime + 0.2) * 1000);

    delete activeBgmSources[prevSceneId];
    const prevCard = document.getElementById(`scene-card-${prevSceneId}`);
    if (prevCard) prevCard.classList.remove('active-on-air');
    const prevStatus = document.getElementById(`scene-status-${prevSceneId}`);
    if (prevStatus) prevStatus.textContent = 'STANDBY';
  }

  // FADE IN NEW — with startTime/endTime/loop support
  const newSource = context.createBufferSource();
  newSource.buffer = targetScene.buffer;

  const effectiveStart = targetScene.startTime || 0;
  const effectiveEnd = targetScene.endTime || targetScene.buffer.duration;
  const effectiveDuration = effectiveEnd - effectiveStart;

  if (targetScene.loop) {
    newSource.loop = true;
    newSource.loopStart = effectiveStart;
    newSource.loopEnd = effectiveEnd;
    newSource.start(now, effectiveStart); // No duration limit for loops
  } else {
    newSource.loop = false;
    newSource.start(now, effectiveStart, effectiveDuration);
  }

  const newGain = context.createGain();
  newSource.connect(newGain);
  newGain.connect(bgmGain);

  const fadeInTime = targetScene.fadeIn;
  const initialGain = isDuckingActive ? 0.25 * bgmVolume : bgmVolume;

  newGain.gain.setValueAtTime(0, now);
  if (fadeInTime > 0) {
    newGain.gain.linearRampToValueAtTime(initialGain, now + fadeInTime);
  } else {
    newGain.gain.setValueAtTime(initialGain, now);
  }

  activeBgmSources[sceneId] = { sourceNode: newSource, gainNode: newGain, startTime: now, isPlaying: true };

  // Update UI
  const targetCard = document.getElementById(`scene-card-${sceneId}`);
  if (targetCard) targetCard.classList.add('active-on-air');
  const targetStatus = document.getElementById(`scene-status-${sceneId}`);
  if (targetStatus) targetStatus.textContent = 'ON AIR';

  activeDrawingBuffer = targetScene.buffer;
  deckDisplayTrackTitle.textContent = targetScene.assignedTrackName;
  drawDeckWaveform(targetScene.buffer);
  deckValTotalDuration.textContent = formatTime(targetScene.buffer.duration);
  updateDeckCrossfadeInfo();

  playbackStartTime = context.currentTime;
  playbackOffset = effectiveStart;

  if (activeVisualizerInterval) cancelAnimationFrame(activeVisualizerInterval);
  activeVisualizerInterval = requestAnimationFrame(animateDeckPlayhead);

  // Update loop button state to reflect current scene's loop
  btnLiveLoop.classList.toggle('active', targetScene.loop);
  btnLivePlayPause.innerHTML = `<span class="btn-icon">⏸️</span> <span class="btn-text">PAUSE PREVIEW</span>`;
}

function updateDeckCrossfadeInfo() {
  if (!activeSceneId) { deckValCrossfadePreset.textContent = '2.0s'; return; }
  const activeScene = scenes.find(s => s.id === activeSceneId);
  if (activeScene) {
    deckValCrossfadePreset.textContent = `I:${activeScene.fadeIn.toFixed(1)}s / O:${activeScene.fadeOut.toFixed(1)}s`;
  }
}

// ==========================================================================
// Transport Bar Control Logic
// ==========================================================================
function toggleLivePlayback() {
  if (isConsoleLocked) return;
  if (!activeSceneId) return;

  const prev = activeBgmSources[activeSceneId];
  if (!prev) return;

  const context = getAudioContext();
  const scene = scenes.find(s => s.id === activeSceneId);

  if (prev.isPlaying) {
    prev.isPlaying = false;
    btnLivePlayPause.innerHTML = `<span class="btn-icon">▶️</span> <span class="btn-text">RESUME PLAY</span>`;
    cancelAnimationFrame(activeVisualizerInterval);

    const elapsed = context.currentTime - playbackStartTime;
    playbackOffset += elapsed;

    const effectiveEnd = scene ? (scene.endTime || activeDrawingBuffer.duration) : activeDrawingBuffer.duration;
    if (playbackOffset >= effectiveEnd) {
      playbackOffset = scene ? (scene.startTime || 0) : 0;
    }

    try { prev.sourceNode.stop(); prev.sourceNode.disconnect(); } catch(e) {}
  } else {
    prev.isPlaying = true;
    btnLivePlayPause.innerHTML = `<span class="btn-icon">⏸️</span> <span class="btn-text">PAUSE PREVIEW</span>`;

    const newSource = context.createBufferSource();
    newSource.buffer = activeDrawingBuffer;

    if (scene && scene.loop) {
      newSource.loop = true;
      newSource.loopStart = scene.startTime || 0;
      newSource.loopEnd = scene.endTime || activeDrawingBuffer.duration;
    }

    newSource.connect(prev.gainNode);
    playbackStartTime = context.currentTime;
    newSource.start(0, playbackOffset);
    prev.sourceNode = newSource;

    activeVisualizerInterval = requestAnimationFrame(animateDeckPlayhead);
  }
}

function stopLivePlayback() {
  if (isConsoleLocked) return;
  if (!activeSceneId) return;

  const prev = activeBgmSources[activeSceneId];
  if (prev) {
    try { prev.sourceNode.stop(); prev.sourceNode.disconnect(); prev.gainNode.disconnect(); } catch(e) {}
    delete activeBgmSources[activeSceneId];
  }

  const card = document.getElementById(`scene-card-${activeSceneId}`);
  if (card) card.classList.remove('active-on-air');
  const status = document.getElementById(`scene-status-${activeSceneId}`);
  if (status) status.textContent = 'STANDBY';

  activeSceneId = null;
  masterStatusTag.textContent = 'STANDBY';
  masterStatusTag.className = 'status-indicator-tag status-ready';

  btnLivePlayPause.innerHTML = `<span class="btn-icon">▶️</span> <span class="btn-text">PLAY PREVIEW</span>`;

  cancelAnimationFrame(activeVisualizerInterval);
  updatePlayheadMarkerUI(0);
  deckValCurrentTime.textContent = '0:00.0';
  playbackOffset = 0;
}

function toggleLiveLoop() {
  // Toggle the active scene's loop property
  if (!activeSceneId) return;
  const scene = scenes.find(s => s.id === activeSceneId);
  if (!scene) return;

  scene.loop = !scene.loop;
  btnLiveLoop.classList.toggle('active', scene.loop);

  // Update checkbox in scene card
  const card = document.getElementById(`scene-card-${scene.id}`);
  if (card) {
    const chk = card.querySelector('.scene-loop-checkbox');
    if (chk) chk.checked = scene.loop;
  }

  // Apply to current playing source
  if (activeBgmSources[scene.id]) {
    const src = activeBgmSources[scene.id].sourceNode;
    src.loop = scene.loop;
    if (scene.loop) {
      src.loopStart = scene.startTime || 0;
      src.loopEnd = scene.endTime || (scene.buffer ? scene.buffer.duration : 0);
    }
  }
}

function handleConsoleLockToggle() {
  isConsoleLocked = chkConsoleLock.checked;
  if (isConsoleLocked) {
    chkConsoleLock.parentElement.classList.add('glow-red-lock');
  } else {
    chkConsoleLock.parentElement.classList.remove('glow-red-lock');
  }
}

// ==========================================================================
// Visualizer Waveform Drawer & Marker Animators (with startTime/endTime)
// ==========================================================================
function drawDeckWaveform(audioBuffer) {
  const canvas = deckWaveformCanvas;
  const ctx = canvas.getContext('2d');

  const dpr = window.devicePixelRatio || 1;
  const width = canvas.parentElement.clientWidth;
  const height = 120;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);

  if (!audioBuffer) {
    return;
  }

  const channelData = audioBuffer.getChannelData(0);
  const totalSamples = channelData.length;
  const step = Math.ceil(totalSamples / width);
  const midY = height / 2;

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#00f578');
  gradient.addColorStop(0.5, '#00f2fe');
  gradient.addColorStop(1, '#7f00ff');

  ctx.fillStyle = gradient;

  for (let i = 0; i < width; i++) {
    const startSample = i * step;
    let min = 1.0, max = -1.0;
    for (let j = 0; j < step; j++) {
      const idx = startSample + j;
      if (idx >= totalSamples) break;
      const val = channelData[idx];
      if (val < min) min = val;
      if (val > max) max = val;
    }
    const barHeight = Math.max(1, (max - min) * midY * 0.85);
    const y = midY - barHeight / 2;
    ctx.fillRect(i, y, 1.0, barHeight);
  }

  // Draw startTime/endTime markers if active scene has them
  if (activeSceneId) {
    const scene = scenes.find(s => s.id === activeSceneId);
    if (scene && audioBuffer.duration > 0) {
      const startPx = ((scene.startTime || 0) / audioBuffer.duration) * width;
      const endPx = ((scene.endTime || audioBuffer.duration) / audioBuffer.duration) * width;

      // Dim regions outside the active range
      ctx.fillStyle = 'rgba(7, 7, 11, 0.6)';
      if (startPx > 0) ctx.fillRect(0, 0, startPx, height);
      if (endPx < width) ctx.fillRect(endPx, 0, width - endPx, height);

      // Start/end boundary lines
      ctx.strokeStyle = 'rgba(0, 242, 254, 0.6)';
      ctx.lineWidth = 1;
      if (scene.startTime > 0) { ctx.beginPath(); ctx.moveTo(startPx, 0); ctx.lineTo(startPx, height); ctx.stroke(); }
      if (scene.endTime) { ctx.beginPath(); ctx.moveTo(endPx, 0); ctx.lineTo(endPx, height); ctx.stroke(); }
    }
  }
}

function animateDeckPlayhead() {
  if (!activeSceneId || !activeDrawingBuffer) return;

  const prev = activeBgmSources[activeSceneId];
  if (prev && prev.isPlaying) {
    const elapsed = audioCtx.currentTime - playbackStartTime;
    const scene = scenes.find(s => s.id === activeSceneId);
    const effectiveStart = scene ? (scene.startTime || 0) : 0;
    const effectiveEnd = scene ? (scene.endTime || activeDrawingBuffer.duration) : activeDrawingBuffer.duration;
    const effectiveDuration = effectiveEnd - effectiveStart;

    let currentPos = playbackOffset + elapsed;

    if (scene && scene.loop && effectiveDuration > 0) {
      // For looping, wrap around within the active range
      currentPos = effectiveStart + ((currentPos - effectiveStart) % effectiveDuration);
      updatePlayheadMarkerUI(currentPos);
      deckValCurrentTime.textContent = formatTime(currentPos);
      activeVisualizerInterval = requestAnimationFrame(animateDeckPlayhead);
    } else {
      if (currentPos < effectiveEnd) {
        updatePlayheadMarkerUI(currentPos);
        deckValCurrentTime.textContent = formatTime(currentPos);
        activeVisualizerInterval = requestAnimationFrame(animateDeckPlayhead);
      } else {
        stopLivePlayback();
      }
    }
  }
}

function updatePlayheadMarkerUI(time) {
  if (!activeDrawingBuffer) return;
  const percent = (time / activeDrawingBuffer.duration) * 100;
  document.getElementById('deck-playhead-marker').style.left = `${percent}%`;
}

function handleCanvasResize() {
  if (activeDrawingBuffer) {
    drawDeckWaveform(activeDrawingBuffer);
    let currentSecs = playbackOffset;
    if (activeSceneId && activeBgmSources[activeSceneId]?.isPlaying && audioCtx) {
      currentSecs += audioCtx.currentTime - playbackStartTime;
    }
    updatePlayheadMarkerUI(currentSecs);
  }
}

// ==========================================================================
// Polyphonic Soundboard Player
// ==========================================================================
function triggerSoundboardPad(padId) {
  const pad = soundboard.find(p => p.id === padId);
  if (!pad) return;

  const context = getAudioContext();
  const now = context.currentTime;

  const card = document.getElementById(`pad-card-${pad.id}`);
  card.classList.add('pad-playing');
  setTimeout(() => card.classList.remove('pad-playing'), 500);

  if (pad.type === 'synth') {
    triggerSynthEffect(pad.synthEffectId, context, soundboardGain);
  } else if (pad.type === 'custom') {
    if (!pad.buffer) { console.warn(`打击垫 "${pad.name}" 未绑定有效音轨。`); return; }

    const soundSource = context.createBufferSource();
    soundSource.buffer = pad.buffer;
    soundSource.connect(soundboardGain);
    soundSource.start(now);
    activeSoundboardSources.push(soundSource);
    soundSource.onended = () => { activeSoundboardSources = activeSoundboardSources.filter(s => s !== soundSource); };
  }
}

// ==========================================================================
// Soundboard Config Modals & Configuration Mapping
// ==========================================================================
function openPadConfigModal(padId) {
  const pad = soundboard.find(p => p.id === padId);
  if (!pad) return;

  currentEditingPadId = padId;
  configPadTitle.textContent = pad.name;
  configPadInputName.value = pad.name;

  if (pad.type === 'synth') {
    radioTypeSynth.checked = true;
    configSynthEffectSelect.value = pad.synthEffectId || 'bell';
  } else {
    radioTypeCustom.checked = true;
    padCustomFileName.textContent = pad.assignedTrackName ? `📂 ${pad.assignedTrackName}` : '📂 点击或拖拽上传音频效果音';
  }

  togglePadConfigTypeUI();
  padConfigModal.classList.remove('hidden');
}

function closePadConfigModal() { padConfigModal.classList.add('hidden'); currentEditingPadId = null; }

function togglePadConfigTypeUI() {
  if (radioTypeSynth.checked) { groupSynthSelect.classList.remove('hidden'); groupCustomFile.classList.add('hidden'); }
  else { groupSynthSelect.classList.add('hidden'); groupCustomFile.classList.remove('hidden'); }
}

function handlePadCustomFileSelect(e) { if (e.target.files.length > 0) assignCustomFileToPadConfig(e.target.files[0]); }

function assignCustomFileToPadConfig(file) {
  padCustomFileName.textContent = `⏳ DECODING: ${file.name}`;
  const context = getAudioContext();
  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const decodedBuffer = await context.decodeAudioData(event.target.result);
      padCustomFileInput.decodedBuffer = decodedBuffer;
      padCustomFileInput.fileName = file.name;
      padCustomFileInput.rawFile = file;
      padCustomFileName.textContent = `🎵 ${file.name} (解码就绪)`;
    } catch(err) {
      padCustomFileName.textContent = '❌ 文件解码失败，请换个格式重试';
      padCustomFileInput.decodedBuffer = null;
    }
  };
  reader.readAsArrayBuffer(file);
}

async function savePadConfiguration() {
  if (!currentEditingPadId) return;
  const pad = soundboard.find(p => p.id === currentEditingPadId);
  if (!pad) return;

  pad.name = configPadInputName.value.trim() || pad.name;
  document.getElementById(`pad-btn-${pad.id}`).querySelector('.pad-title').textContent = pad.name;

  if (radioTypeSynth.checked) {
    pad.type = 'synth';
    pad.synthEffectId = configSynthEffectSelect.value;
    pad.assignedTrackId = null; pad.assignedTrackName = null; pad.buffer = null;
  } else {
    pad.type = 'custom';
    if (padCustomFileInput.decodedBuffer) {
      pad.buffer = padCustomFileInput.decodedBuffer;
      pad.assignedTrackName = padCustomFileInput.fileName;
      pad.assignedTrackId = `pad_${pad.id}_active`;
      showLoaderOverlay('SAVING EFFECT PAD', 'Caching sound effect into database...');
      await cacheAudioFile(pad.assignedTrackId, padCustomFileInput.rawFile);
      hideLoaderOverlay();
      padCustomFileInput.decodedBuffer = null;
    }
  }
  saveCurrentConfigToLocalStorage();
  closePadConfigModal();
}

function resetPadConfigToDefault() {
  if (!currentEditingPadId) return;
  const pad = soundboard.find(p => p.id === currentEditingPadId);
  if (!pad) return;
  const defaults = [
    { id: 1, name: "掌声雷动", synthEffectId: "fanfare" }, { id: 2, name: "欢呼尖叫", synthEffectId: "fanfare" },
    { id: 3, name: "教堂钟声", synthEffectId: "bell" }, { id: 4, name: "浪漫音垫", synthEffectId: "pad" },
    { id: 5, name: "催泪音垫", synthEffectId: "pad" }, { id: 6, name: "祝酒礼乐", synthEffectId: "fanfare" },
    { id: 7, name: "紧张鼓点", synthEffectId: "suspense" }, { id: 8, name: "悬念扫频", synthEffectId: "suspense" },
    { id: 9, name: "进行曲选段", synthEffectId: "fanfare" }, { id: 10, name: "萨克斯浪漫", synthEffectId: "pad" },
    { id: 11, name: "爆笑气氛", synthEffectId: "fanfare" }, { id: 12, name: "静音舱氛围", synthEffectId: "pad" }
  ];
  const def = defaults.find(d => d.id === currentEditingPadId);
  if (def) {
    configPadInputName.value = def.name;
    radioTypeSynth.checked = true;
    configSynthEffectSelect.value = def.synthEffectId;
    togglePadConfigTypeUI();
    deleteCachedAudioFile(`pad_${pad.id}_active`).catch(() => {});
  }
}

// ==========================================================================
// MC Mic Ducking & Live Automation Transitions
// ==========================================================================
function toggleMCDucking() {
  const context = getAudioContext();
  isDuckingActive = !isDuckingActive;
  btnDuckingSwitch.classList.toggle('active', isDuckingActive);
  const now = context.currentTime;
  if (isDuckingActive) {
    bgmGain.gain.setValueAtTime(bgmGain.gain.value, now);
    bgmGain.gain.linearRampToValueAtTime(0.25 * bgmVolume, now + 0.3);
  } else {
    bgmGain.gain.setValueAtTime(bgmGain.gain.value, now);
    bgmGain.gain.linearRampToValueAtTime(bgmVolume, now + 0.5);
  }
}

function handleMasterVolumeChange(e) {
  masterVolume = parseFloat(e.target.value);
  masterVolumeVal.textContent = `${Math.round(masterVolume * 100)}%`;
  if (masterGain) masterGain.gain.setValueAtTime(masterVolume, audioCtx.currentTime);
}

function handleCrossfaderChange(e) {
  const context = getAudioContext();
  const val = parseFloat(e.target.value);

  let disp = "0.0 (CENTER)";
  if (val < 0) disp = `A: ${Math.round(Math.abs(val) * 100)}%`;
  if (val > 0) disp = `B: ${Math.round(val * 100)}%`;
  crossfaderPositionVal.textContent = disp;

  if (activeSceneId && activeBgmSources[activeSceneId]) {
    crossfaderGain = Math.max(0, Math.min(1, 1 - (val + 1) / 2));
    const targetGain = isDuckingActive ? 0.25 * crossfaderGain * bgmVolume : crossfaderGain * bgmVolume;
    activeBgmSources[activeSceneId].gainNode.gain.setValueAtTime(targetGain, context.currentTime);
  }
}

// ==========================================================================
// 🚨 EMERGENCY FADE OUT
// ==========================================================================
function triggerEmergencyFadeOut() {
  const context = getAudioContext();
  const now = context.currentTime;
  const fadeOutSecs = 1.5;

  btnEmergencyFade.classList.add('flash-warning-red');
  isConsoleLocked = true;
  chkConsoleLock.checked = true;
  chkConsoleLock.parentElement.classList.add('glow-red-lock');

  masterGain.gain.setValueAtTime(masterGain.gain.value, now);
  masterGain.gain.linearRampToValueAtTime(0.0001, now + fadeOutSecs);

  setTimeout(() => {
    Object.keys(activeBgmSources).forEach(sceneId => {
      try { activeBgmSources[sceneId].sourceNode.stop(); activeBgmSources[sceneId].sourceNode.disconnect(); } catch(e) {}
      const c = document.getElementById(`scene-card-${sceneId}`);
      if (c) c.classList.remove('active-on-air');
      const s = document.getElementById(`scene-status-${sceneId}`);
      if (s) s.textContent = 'STANDBY';
    });
    activeBgmSources = {};
    activeSceneId = null;

    activeSoundboardSources.forEach(src => { try { src.stop(); } catch(e) {} });
    activeSoundboardSources = [];

    cancelAnimationFrame(activeVisualizerInterval);
    updatePlayheadMarkerUI(0);
    deckValCurrentTime.textContent = '0:00.0';
    playbackOffset = 0;

    masterGain.gain.setValueAtTime(masterVolume, context.currentTime);

    isConsoleLocked = false;
    chkConsoleLock.checked = false;
    chkConsoleLock.parentElement.classList.remove('glow-red-lock');
    btnEmergencyFade.classList.remove('flash-warning-red');

    masterStatusTag.textContent = 'STANDBY';
    masterStatusTag.className = 'status-indicator-tag status-ready';
    btnLivePlayPause.innerHTML = `<span class="btn-icon">▶️</span> <span class="btn-text">PLAY PREVIEW</span>`;
    deckDisplayTrackTitle.textContent = 'NO ACTIVE TRACK';
  }, fadeOutSecs * 1000 + 200);
}

// ==========================================================================
// VU LED Bouncing Meter Animation Loop
// ==========================================================================
function updateVUMetersLoop() {
  if (!audioCtx) return;
  const arrayL = new Uint8Array(analyserL.frequencyBinCount);
  const arrayR = new Uint8Array(analyserR.frequencyBinCount);
  analyserL.getByteFrequencyData(arrayL);
  analyserR.getByteFrequencyData(arrayR);

  let sumL = 0; for (let i = 0; i < arrayL.length; i++) sumL += arrayL[i];
  const peakL = arrayL.length > 0 ? sumL / arrayL.length : 0;
  let sumR = 0; for (let i = 0; i < arrayR.length; i++) sumR += arrayR[i];
  const peakR = arrayR.length > 0 ? sumR / arrayR.length : 0;

  const litCountL = Math.min(15, Math.ceil(peakL / 12));
  const litCountR = Math.min(15, Math.ceil(peakR / 12));

  for (let i = 0; i < 15; i++) {
    leftLEDs[i].classList.toggle('lit', i < litCountL);
    rightLEDs[i].classList.toggle('lit', i < litCountR);
  }
  requestAnimationFrame(updateVUMetersLoop);
}

// ==========================================================================
// IndexedDB Caching & ZIP Export/Import
// ==========================================================================
async function loadCachedWeddingAssets() {
  showLoaderOverlay('SYNCHRONIZING AUDIO CACHES', 'Fetching saved audio tracks from browser IndexedDB...');
  try {
    const context = getAudioContext();

    for (const scene of scenes) {
      const trackId = `scene_${scene.id}_active`;
      const fileBlob = await getCachedAudioFile(trackId);
      if (fileBlob) {
        const arrayBuf = await fileBlob.arrayBuffer();
        const decodedBuffer = await context.decodeAudioData(arrayBuf);
        scene.buffer = decodedBuffer;
        scene.assignedTrackId = trackId;
        scene.assignedTrackName = fileBlob.name;
      }
    }

    for (const pad of soundboard) {
      const trackId = `pad_${pad.id}_active`;
      const fileBlob = await getCachedAudioFile(trackId);
      if (fileBlob) {
        const arrayBuf = await fileBlob.arrayBuffer();
        const decodedBuffer = await context.decodeAudioData(arrayBuf);
        pad.buffer = decodedBuffer;
        pad.assignedTrackId = trackId;
        pad.assignedTrackName = fileBlob.name;
        pad.type = 'custom';
        const padBtn = document.getElementById(`pad-btn-${pad.id}`);
        if (padBtn) padBtn.querySelector('.pad-title').textContent = fileBlob.name.replace(/\.[^/.]+$/, "");
      }
    }

    // Re-render to update track names in scene cards
    renderScenes();
  } catch(err) {
    console.error('从 IndexedDB 缓存恢复音频轨道时出错:', err);
  } finally {
    hideLoaderOverlay();
  }
}

// --- ZIP Export (config.json + audio files) ---
async function saveWeddingConfigProfile() {
  const scheme = weddingSchemeName.value.trim() || '未命名配乐方案';

  showLoaderOverlay('PACKAGING WEDDING PROFILE', 'Building ZIP archive with config and audio files...');

  try {
    const zip = new JSZip();

    // 1. Generate config JSON
    const configObj = generateConfigObject(scheme, scenes, soundboard, 2.5);
    zip.file('config.json', JSON.stringify(configObj, null, 2));

    // 2. Collect scene audio files
    for (const scene of scenes) {
      if (scene.assignedTrackId && scene.assignedTrackName) {
        const blob = await getCachedAudioFile(scene.assignedTrackId);
        if (blob) {
          zip.file(`audio/scene_${scene.id}_${scene.assignedTrackName}`, blob);
        }
      }
    }

    // 3. Collect soundboard custom audio files
    for (const pad of soundboard) {
      if (pad.type === 'custom' && pad.assignedTrackId && pad.assignedTrackName) {
        const blob = await getCachedAudioFile(pad.assignedTrackId);
        if (blob) {
          zip.file(`audio/pad_${pad.id}_${pad.assignedTrackName}`, blob);
        }
      }
    }

    // 4. Generate ZIP and download
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const cleanName = scheme.replace(/[^\w\u4e00-\u9fa5]/gi, '_');
    const filename = `WedMix_${cleanName}_${new Date().toISOString().slice(0, 10)}.zip`;

    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);

    hideLoaderOverlay();
    console.log(`ZIP 配置包导出成功: ${filename}`);
  } catch (err) {
    console.error('ZIP 导出失败:', err);
    hideLoaderOverlay();
    alert('导出配置包失败，请重试。');
  }
}

// --- ZIP / JSON Import ---
async function loadWeddingConfigProfile(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (file.name.endsWith('.zip')) {
    await importFromZip(file);
  } else {
    await importFromJSON(file);
  }

  // Reset file input so the same file can be re-imported
  e.target.value = '';
}

async function importFromZip(zipFile) {
  showLoaderOverlay('EXTRACTING WEDDING PACKAGE', 'Unpacking ZIP archive and decoding audio files...');

  try {
    const zip = await JSZip.loadAsync(zipFile);

    // 1. Read config.json
    const configFile = zip.file('config.json');
    if (!configFile) throw new Error('ZIP 中未找到 config.json');
    const configText = await configFile.async('string');
    const config = JSON.parse(configText);

    // 2. Apply config
    weddingSchemeName.value = config.schemeName || '';

    // Rebuild scenes from config
    if (config.scenes && config.scenes.length > 0) {
      scenes = config.scenes.map(cs => ({
        id: cs.id,
        name: cs.name,
        assignedTrackId: cs.assignedTrackId || null,
        assignedTrackName: cs.assignedTrackName || null,
        buffer: null,
        fadeIn: cs.fadeIn || 2.0,
        fadeOut: cs.fadeOut || 2.0,
        startTime: cs.startTime || 0,
        endTime: cs.endTime || null,
        loop: cs.loop || false
      }));

      // Update nextSceneId to be higher than any scene id
      nextSceneId = Math.max(...scenes.map(s => s.id)) + 1;
    }

    // Apply soundboard config
    if (config.soundboard) {
      config.soundboard.forEach(cp => {
        const pad = soundboard.find(p => p.id === cp.id);
        if (pad) {
          pad.name = cp.name;
          pad.type = cp.type;
          pad.synthEffectId = cp.synthEffectId;
          const padBtn = document.getElementById(`pad-btn-${pad.id}`);
          if (padBtn) padBtn.querySelector('.pad-title').textContent = pad.name;
        }
      });
    }

    // 3. Load audio files from ZIP
    const context = getAudioContext();

    for (const scene of scenes) {
      const cs = config.scenes.find(s => s.id === scene.id);
      if (cs && cs.audioZipPath) {
        const audioFile = zip.file(cs.audioZipPath);
        if (audioFile) {
          const arrayBuf = await audioFile.async('arraybuffer');
          const decodedBuffer = await context.decodeAudioData(arrayBuf.slice(0));

          scene.buffer = decodedBuffer;
          scene.assignedTrackId = `scene_${scene.id}_active`;

          // Cache in IndexedDB for persistence
          const blob = await audioFile.async('blob');
          const namedBlob = new File([blob], scene.assignedTrackName || `scene_${scene.id}.audio`, { type: blob.type || 'audio/mpeg' });
          await cacheAudioFile(scene.assignedTrackId, namedBlob);
        }
      }
    }

    for (const pad of soundboard) {
      const cp = config.soundboard?.find(p => p.id === pad.id);
      if (cp && cp.audioZipPath) {
        const audioFile = zip.file(cp.audioZipPath);
        if (audioFile) {
          const arrayBuf = await audioFile.async('arraybuffer');
          const decodedBuffer = await context.decodeAudioData(arrayBuf.slice(0));

          pad.buffer = decodedBuffer;
          pad.type = 'custom';
          pad.assignedTrackId = `pad_${pad.id}_active`;
          pad.assignedTrackName = cp.assignedTrackName;

          const blob = await audioFile.async('blob');
          const namedBlob = new File([blob], pad.assignedTrackName || `pad_${pad.id}.audio`, { type: blob.type || 'audio/mpeg' });
          await cacheAudioFile(pad.assignedTrackId, namedBlob);
        }
      }
    }

    renderScenes();
    hideLoaderOverlay();
    saveCurrentConfigToLocalStorage();
    alert(`🎉 婚礼配乐包 "${config.schemeName}" 导入成功！所有音乐已自动加载。`);
  } catch(err) {
    console.error('ZIP 导入失败:', err);
    hideLoaderOverlay();
    alert('导入 ZIP 配置包失败，请检查文件格式。');
  }
}

async function importFromJSON(jsonFile) {
  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const config = JSON.parse(event.target.result);
      weddingSchemeName.value = config.schemeName;

      showLoaderOverlay('RESTORING CUE FLOWS', 'Rebuilding wedding cue checklist timeline assignments...');

      if (config.scenes) {
        // Check if it's a v2 config with full scene definitions
        if (config.version === '2.0') {
          scenes = config.scenes.map(cs => ({
            id: cs.id,
            name: cs.name,
            assignedTrackId: cs.assignedTrackId || null,
            assignedTrackName: cs.assignedTrackName || null,
            buffer: null,
            fadeIn: cs.fadeIn || 2.0,
            fadeOut: cs.fadeOut || 2.0,
            startTime: cs.startTime || 0,
            endTime: cs.endTime || null,
            loop: cs.loop || false
          }));
          nextSceneId = Math.max(...scenes.map(s => s.id)) + 1;
        } else {
          // Legacy v1 config — just update fade timings on existing scenes
          config.scenes.forEach(cScene => {
            const scene = scenes.find(s => s.id === cScene.id);
            if (scene) {
              scene.fadeIn = cScene.fadeIn;
              scene.fadeOut = cScene.fadeOut;
            }
          });
        }
      }

      if (config.soundboard) {
        config.soundboard.forEach(cPad => {
          const pad = soundboard.find(p => p.id === cPad.id);
          if (pad) {
            pad.name = cPad.name;
            pad.type = cPad.type;
            pad.synthEffectId = cPad.synthEffectId;
            const padBtn = document.getElementById(`pad-btn-${pad.id}`);
            if (padBtn) padBtn.querySelector('.pad-title').textContent = pad.name;
          }
        });
      }

      // Attempt to restore audio buffers from IndexedDB cache
      const context = getAudioContext();
      for (const scene of scenes) {
        if (scene.assignedTrackId) {
          try {
            const fileBlob = await getCachedAudioFile(scene.assignedTrackId);
            if (fileBlob) {
              const arrayBuf = await fileBlob.arrayBuffer();
              const decodedBuffer = await context.decodeAudioData(arrayBuf);
              scene.buffer = decodedBuffer;
              if (fileBlob.name) scene.assignedTrackName = fileBlob.name;
            }
          } catch (err) {
            console.warn(`场景 ${scene.id} 缓存音频恢复失败:`, err);
          }
        }
      }

      for (const pad of soundboard) {
        const cPad = config.soundboard?.find(p => p.id === pad.id);
        if (pad.assignedTrackId || (cPad && cPad.type === 'custom' && cPad.assignedTrackId)) {
          const trackId = pad.assignedTrackId || cPad.assignedTrackId;
          try {
            const fileBlob = await getCachedAudioFile(trackId);
            if (fileBlob) {
              const arrayBuf = await fileBlob.arrayBuffer();
              const decodedBuffer = await context.decodeAudioData(arrayBuf);
              pad.buffer = decodedBuffer;
              pad.assignedTrackId = trackId;
              if (fileBlob.name) pad.assignedTrackName = fileBlob.name;
              pad.type = 'custom';
            }
          } catch (err) {
            console.warn(`音效板 ${pad.id} 缓存音频恢复失败:`, err);
          }
        }
      }

      renderScenes();
      hideLoaderOverlay();
      saveCurrentConfigToLocalStorage();
      alert(`婚礼配乐配置文件 "${config.schemeName}" 成功导入！如配置了新配乐，请为对应轨道槽导入新音频。`);
    } catch(err) {
      console.error(err);
      hideLoaderOverlay();
      alert('导入配置文件格式不正确，解析失败。');
    }
  };
  reader.readAsText(jsonFile);
}

// ==========================================================================
// Loader Overlay Helpers
// ==========================================================================
function showLoaderOverlay(title, desc) {
  liveLoaderTitle.textContent = title;
  liveLoaderDesc.textContent = desc;
  liveLoaderOverlay.classList.remove('hidden');
}

function hideLoaderOverlay() {
  liveLoaderOverlay.classList.add('hidden');
}

// ==========================================================================
// Demo Track Generator
// ==========================================================================
async function preloadSystemDemoTracks() {
  const context = getAudioContext();
  showLoaderOverlay('GENERATING SYNTH DEMO BGMs', 'Synthesizing high-fidelity stereo loops offline... Please wait.');

  const baseFreqs = [130.81, 146.83, 164.81, 174.61, 196.00, 220.00, 246.94, 261.63];

  try {
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const freq = baseFreqs[i % baseFreqs.length];

      const demoBuffer = await generateSynthBGMBuffer(context, freq);
      scene.buffer = demoBuffer;
      scene.assignedTrackId = `demo_scene_${scene.id}`;
      scene.assignedTrackName = `🔊 系统预置测试配乐 (${freq.toFixed(1)}Hz Loop)`;
    }

    renderScenes();
    hideLoaderOverlay();
    alert('🎉 系统测试演示音乐载入成功！您现在可以点击任何环节的 [⚡ 触发] 来聆听配乐。');
  } catch (err) {
    console.error('生成测试音乐出错:', err);
    hideLoaderOverlay();
    alert('载入演示音乐失败，请重试。');
  }
}

function generateSynthBGMBuffer(audioCtx, baseFreq) {
  const sampleRate = audioCtx.sampleRate;
  const duration = 10;
  const totalSamples = sampleRate * duration;
  const offlineCtx = new OfflineAudioContext(2, totalSamples, sampleRate);

  const chords = [
    { time: 0, notes: [baseFreq, baseFreq * 1.25, baseFreq * 1.5] },
    { time: 2.5, notes: [baseFreq * 1.33, baseFreq * 1.66, baseFreq * 2.0] },
    { time: 5.0, notes: [baseFreq * 1.5, baseFreq * 1.875, baseFreq * 2.25] },
    { time: 7.5, notes: [baseFreq * 1.2, baseFreq * 1.5, baseFreq * 1.8] }
  ];

  chords.forEach((chord) => {
    chord.notes.forEach((freq, index) => {
      const osc = offlineCtx.createOscillator();
      osc.type = index === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, chord.time);

      const gain = offlineCtx.createGain();
      gain.gain.setValueAtTime(0, chord.time);
      gain.gain.linearRampToValueAtTime(0.2, chord.time + 0.5);
      gain.gain.exponentialRampToValueAtTime(0.001, chord.time + 2.4);

      osc.connect(gain);
      gain.connect(offlineCtx.destination);
      osc.start(chord.time);
      osc.stop(chord.time + 2.5);
    });
  });

  return offlineCtx.startRendering();
}

// ==========================================================================
// Config Auto-Save and Restore / One-Key Reset
// ==========================================================================
function saveCurrentConfigToLocalStorage() {
  try {
    const scheme = weddingSchemeName.value.trim() || '未命名配乐方案';
    const configObj = generateConfigObject(scheme, scenes, soundboard, 2.5);
    localStorage.setItem('wedmix_current_config', JSON.stringify(configObj));
    console.log('自动保存当前页面配置到 localStorage');
  } catch (err) {
    console.error('自动保存页面配置失败:', err);
  }
}

function restoreConfigFromLocalStorage() {
  try {
    const configText = localStorage.getItem('wedmix_current_config');
    if (!configText) return;

    const config = JSON.parse(configText);
    if (!config) return;

    if (config.schemeName) {
      weddingSchemeName.value = config.schemeName;
    }

    if (config.scenes && config.scenes.length > 0) {
      scenes = config.scenes.map(cs => ({
        id: cs.id,
        name: cs.name,
        assignedTrackId: cs.assignedTrackId || null,
        assignedTrackName: cs.assignedTrackName || null,
        buffer: null,
        fadeIn: cs.fadeIn || 2.0,
        fadeOut: cs.fadeOut || 2.0,
        startTime: cs.startTime || 0,
        endTime: cs.endTime || null,
        loop: cs.loop || false
      }));

      // Calculate nextSceneId to prevent conflicts when adding new scenes
      nextSceneId = Math.max(...scenes.map(s => s.id)) + 1;
    }

    if (config.soundboard && config.soundboard.length > 0) {
      config.soundboard.forEach(cp => {
        const pad = soundboard.find(p => p.id === cp.id);
        if (pad) {
          pad.name = cp.name;
          pad.type = cp.type || 'synth';
          pad.synthEffectId = cp.synthEffectId || null;
          pad.assignedTrackId = cp.assignedTrackId || null;
          pad.assignedTrackName = cp.assignedTrackName || null;
        }
      });
    }

    console.log('已从 localStorage 恢复当前页面配置：', config.schemeName);
  } catch (err) {
    console.error('从 localStorage 恢复配置失败:', err);
  }
}

async function resetWholeApplication() {
  if (!confirm('您确定要重置所有配置和上传的音乐文件吗？此操作不可恢复！')) {
    return;
  }

  // 1. Stop all active BGM sources
  for (const sceneId in activeBgmSources) {
    const prev = activeBgmSources[sceneId];
    if (prev) {
      try { prev.sourceNode.stop(); prev.sourceNode.disconnect(); prev.gainNode.disconnect(); } catch(e) {}
    }
  }
  activeBgmSources = {};

  // 2. Stop all active soundboard sources
  activeSoundboardSources.forEach(src => { try { src.stop(); } catch(e) {} });
  activeSoundboardSources = [];

  // 3. Clear IndexedDB caches
  showLoaderOverlay('CLEARING CACHES', 'Removing all cached wedding audio tracks from browser IndexedDB database...');
  try {
    await clearAllCaches();
  } catch (err) {
    console.error('清除 IndexedDB 缓存失败:', err);
  } finally {
    hideLoaderOverlay();
  }

  // 4. Remove config from localStorage
  localStorage.removeItem('wedmix_current_config');

  // 5. Restore default variables
  weddingSchemeName.value = "张先生 & 李女士婚礼配乐方案";
  nextSceneId = 9;
  activeSceneId = null;

  scenes = [
    { id: 1, name: "宾客进场暖场", assignedTrackId: null, assignedTrackName: null, buffer: null, fadeIn: 2.0, fadeOut: 2.0, startTime: 0, endTime: null, loop: false },
    { id: 2, name: "司仪开场致辞", assignedTrackId: null, assignedTrackName: null, buffer: null, fadeIn: 1.0, fadeOut: 1.5, startTime: 0, endTime: null, loop: false },
    { id: 3, name: "新郎帅气入场", assignedTrackId: null, assignedTrackName: null, buffer: null, fadeIn: 1.5, fadeOut: 2.0, startTime: 0, endTime: null, loop: false },
    { id: 4, name: "新娘圣洁入场", assignedTrackId: null, assignedTrackName: null, buffer: null, fadeIn: 2.0, fadeOut: 2.5, startTime: 0, endTime: null, loop: false },
    { id: 5, name: "誓言交换与致辞", assignedTrackId: null, assignedTrackName: null, buffer: null, fadeIn: 2.5, fadeOut: 2.0, startTime: 0, endTime: null, loop: false },
    { id: 6, name: "信物交换与拥吻", assignedTrackId: null, assignedTrackName: null, buffer: null, fadeIn: 1.0, fadeOut: 2.0, startTime: 0, endTime: null, loop: false },
    { id: 7, name: "礼成退场欢庆", assignedTrackId: null, assignedTrackName: null, buffer: null, fadeIn: 1.0, fadeOut: 2.5, startTime: 0, endTime: null, loop: false },
    { id: 8, name: "宴会背景与敬酒", assignedTrackId: null, assignedTrackName: null, buffer: null, fadeIn: 2.5, fadeOut: 2.5, startTime: 0, endTime: null, loop: false }
  ];

  soundboard = [
    { id: 1, name: "掌声雷动", type: "synth", synthEffectId: "fanfare", assignedTrackId: null, assignedTrackName: null, buffer: null, icon: "👏" },
    { id: 2, name: "欢呼尖叫", type: "synth", synthEffectId: "fanfare", assignedTrackId: null, assignedTrackName: null, buffer: null, icon: "🎉" },
    { id: 3, name: "教堂钟声", type: "synth", synthEffectId: "bell", assignedTrackId: null, assignedTrackName: null, buffer: null, icon: "🔔" },
    { id: 4, name: "浪漫音垫", type: "synth", synthEffectId: "pad", assignedTrackId: null, assignedTrackName: null, buffer: null, icon: "🌅" },
    { id: 5, name: "催泪音垫", type: "synth", synthEffectId: "pad", assignedTrackId: null, assignedTrackName: null, buffer: null, icon: "😭" },
    { id: 6, name: "祝酒礼乐", type: "synth", synthEffectId: "fanfare", assignedTrackId: null, assignedTrackName: null, buffer: null, icon: "👑" },
    { id: 7, name: "紧张鼓点", type: "synth", synthEffectId: "suspense", assignedTrackId: null, assignedTrackName: null, buffer: null, icon: "🥁" },
    { id: 8, name: "悬念扫频", type: "synth", synthEffectId: "suspense", assignedTrackId: null, assignedTrackName: null, buffer: null, icon: "⚡" },
    { id: 9, name: "进行曲选段", type: "synth", synthEffectId: "fanfare", assignedTrackId: null, assignedTrackName: null, buffer: null, icon: "👰" },
    { id: 10, name: "萨克斯浪漫", type: "synth", synthEffectId: "pad", assignedTrackId: null, assignedTrackName: null, buffer: null, icon: "🎷" },
    { id: 11, name: "爆笑气氛", type: "synth", synthEffectId: "fanfare", assignedTrackId: null, assignedTrackName: null, buffer: null, icon: "🤣" },
    { id: 12, name: "静音舱氛围", type: "synth", synthEffectId: "pad", assignedTrackId: null, assignedTrackName: null, buffer: null, icon: "🤫" }
  ];

  // Reset soundboard titles in UI
  soundboard.forEach(pad => {
    const padBtn = document.getElementById(`pad-btn-${pad.id}`);
    if (padBtn) {
      padBtn.querySelector('.pad-title').textContent = pad.name;
    }
  });

  // 6. Reset UI states
  masterStatusTag.textContent = 'STANDBY';
  masterStatusTag.className = 'status-indicator-tag status-ready';
  btnLivePlayPause.innerHTML = `<span class="btn-icon">▶️</span> <span class="btn-text">PLAY PREVIEW</span>`;
  cancelAnimationFrame(activeVisualizerInterval);
  updatePlayheadMarkerUI(0);
  deckValCurrentTime.textContent = '0:00.0';
  deckValTotalDuration.textContent = '0:00.0';
  deckDisplayTrackTitle.textContent = 'STANDBY DECK - NO SOURCE LOADED';
  activeDrawingBuffer = null;
  drawDeckWaveform(null); // Clear waveform canvas
  playbackOffset = 0;

  renderScenes();
}

// Initialize on document ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initConsole);
} else {
  initConsole();
}
