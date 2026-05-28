import { triggerSynthEffect } from './synth-effects.js';
import { cacheAudioFile, getCachedAudioFile, deleteCachedAudioFile, generateConfigObject, clearAllCaches } from './config-manager.js';
import { icon } from './icons.js';

// Pre-built innerHTML strings for the play/pause transport button
const BTN_PLAY_HTML   = () => `${icon('play')} <span class="btn-text">PLAY PREVIEW</span>`;
const BTN_PAUSE_HTML  = () => `${icon('pause')} <span class="btn-text">PAUSE PREVIEW</span>`;
const BTN_RESUME_HTML = () => `${icon('play')} <span class="btn-text">RESUME PLAY</span>`;

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
let isEmergencyActive = false;
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
let vuLoopRunning = false;

// Scene reorder drag state
let sceneDragState = null;

// Auto-increment ID for new scenes / tracks
let nextSceneId = 9;
let nextTrackId = 1;

// Default wedding scenes setup
let scenes = [
  { id: 1, name: "宾客进场暖场", playMode: "sequential", fadeIn: 2.0, fadeOut: 2.0, loop: false, tracks: [] },
  { id: 2, name: "司仪开场致辞", playMode: "sequential", fadeIn: 1.0, fadeOut: 1.5, loop: false, tracks: [] },
  { id: 3, name: "新郎帅气入场", playMode: "sequential", fadeIn: 1.5, fadeOut: 2.0, loop: false, tracks: [] },
  { id: 4, name: "新娘圣洁入场", playMode: "sequential", fadeIn: 2.0, fadeOut: 2.5, loop: false, tracks: [] },
  { id: 5, name: "誓言交换与致辞", playMode: "sequential", fadeIn: 2.5, fadeOut: 2.0, loop: false, tracks: [] },
  { id: 6, name: "信物交换与拥吻", playMode: "sequential", fadeIn: 1.0, fadeOut: 2.0, loop: false, tracks: [] },
  { id: 7, name: "礼成退场欢庆", playMode: "sequential", fadeIn: 1.0, fadeOut: 2.5, loop: false, tracks: [] },
  { id: 8, name: "宴会背景与敬酒", playMode: "sequential", fadeIn: 2.5, fadeOut: 2.5, loop: false, tracks: [] }
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
  startLEDClock();
  updateLEDClock();

  // Try to load cached assets from IndexedDB database on startup
  loadCachedWeddingAssets();

  // Waveform click & drag to seek
  initWaveformSeek();

  // -----------------------------------------------------------------------
  // Windows crash prevention: clean up AudioContext and active sources when
  // the window is about to close. main.js sends 'app-before-close' via IPC.
  // In Electron's contextIsolation mode the ipcRenderer is not available
  // directly, so we listen on the window message channel that Electron
  // bridges through the preload (or fall back to beforeunload for safety).
  // -----------------------------------------------------------------------
  window.addEventListener('beforeunload', handleAppClose);

  // Global unhandled-rejection guard: prevents silent crashes on Windows
  // where an unhandled Promise rejection can terminate the renderer process.
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[WedMix] 未捕获的 Promise 异常:', event.reason);
    event.preventDefault(); // Prevent Electron from crashing the renderer
  });
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
  // innerHTML escapes < > & but NOT quotes — replace them manually
  // so the result is safe inside HTML attribute values (e.g. value="...")
  return div.innerHTML
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderScenes() {
  const container = scenesFlowList;

  if (sceneDragState) {
    sceneDragState = null;
    container.querySelectorAll('.scene-drop-indicator').forEach(el => el.remove());
  }

  container.innerHTML = '';

  scenes.forEach((scene, index) => {
    const card = document.createElement('div');
    card.className = 'scene-item-card' + (activeSceneId === scene.id ? ' active-on-air' : '');
    card.dataset.sceneId = scene.id;
    card.id = `scene-card-${scene.id}`;

    // Build track list HTML
    let trackListHTML = '';
    if (scene.tracks.length === 0) {
      trackListHTML = '<div class="scene-track-empty">暂无音频，请添加</div>';
    } else {
      scene.tracks.forEach((track, tIdx) => {
        const isPlaying = activeSceneId === scene.id && activeBgmSources[scene.id] &&
          scene.tracks[activeBgmSources[scene.id].playOrder[activeBgmSources[scene.id].currentOrderIndex]]?.id === track.id;
        const durationStr = track.buffer ? formatTime(track.buffer.duration) : '未加载';
        trackListHTML += `
          <div class="scene-track-row ${isPlaying ? 'playing' : ''}" data-track-id="${track.id}" data-scene-id="${scene.id}">
            <div class="track-drag-handle" draggable="true" data-track-id="${track.id}" data-scene-id="${scene.id}" title="拖拽排序">${icon('drag_handle')}</div>
            <div class="track-info" title="${escapeHtml(track.assignedTrackName || '')}">${icon('music')} ${escapeHtml(track.assignedTrackName || '未知')} (${durationStr})</div>
            <div class="track-params">
              <label>淡入:<input type="number" class="track-param-input" data-field="fadeIn" data-track-id="${track.id}" data-scene-id="${scene.id}" min="0" max="10" step="0.1" value="${track.fadeIn}">s</label>
              <label>淡出:<input type="number" class="track-param-input" data-field="fadeOut" data-track-id="${track.id}" data-scene-id="${scene.id}" min="0" max="10" step="0.1" value="${track.fadeOut}">s</label>
              <label>起始:<input type="number" class="track-param-input" data-field="startTime" data-track-id="${track.id}" data-scene-id="${scene.id}" min="0" step="0.1" value="${track.startTime || 0}">s</label>
              <label>结束:<input type="number" class="track-param-input" data-field="endTime" data-track-id="${track.id}" data-scene-id="${scene.id}" min="0" step="0.1" value="${track.endTime ?? ''}" placeholder="末尾">s</label>
            </div>
            <button class="btn-icon-only track-delete" data-track-id="${track.id}" data-scene-id="${scene.id}" title="删除此音频">${icon('trash')}</button>
          </div>`;
      });
    }

    card.innerHTML = `
      <div class="scene-drag-handle" data-scene-id="${scene.id}" draggable="true" title="拖拽排序">${icon('drag_handle')}</div>
      <div class="scene-num-indicator">${String(index + 1).padStart(2, '0')}</div>
      <div class="scene-body">
        <div class="scene-main-info">
          <input type="text" class="scene-name-input" value="${escapeHtml(scene.name)}" data-scene-id="${scene.id}">
          <span class="scene-status-label" id="scene-status-${scene.id}">${activeSceneId === scene.id ? 'ON AIR' : 'STANDBY'}</span>
        </div>
        <div class="scene-playlist">
          <div class="scene-playlist-header">
            <label>模式:<select class="scene-playmode-select" data-scene-id="${scene.id}">
              <option value="sequential" ${scene.playMode === 'sequential' ? 'selected' : ''}>顺序播放</option>
              <option value="random" ${scene.playMode === 'random' ? 'selected' : ''}>随机播放</option>
            </select></label>
            <label>场景淡入:<input type="number" class="scene-fade-input" data-field="fadeIn" data-scene-id="${scene.id}" min="0" max="10" step="0.5" value="${scene.fadeIn}">s</label>
            <label>场景淡出:<input type="number" class="scene-fade-input" data-field="fadeOut" data-scene-id="${scene.id}" min="0" max="10" step="0.5" value="${scene.fadeOut}">s</label>
            <label class="scene-loop-toggle"><input type="checkbox" class="scene-loop-checkbox" data-scene-id="${scene.id}" ${scene.loop ? 'checked' : ''}><span class="loop-label">🔁 循环</span></label>
          </div>
          <div class="scene-track-list">${trackListHTML}</div>
          <div class="scene-track-add-zone" data-scene-id="${scene.id}">
            <input type="file" class="track-file-input hidden-input" data-scene-id="${scene.id}" accept="audio/*">
            ${icon('upload')} 拖拽音频到此处 或 点击添加
          </div>
        </div>
      </div>
      <div class="scene-actions-column">
        <button class="btn-cue-trigger btn-tactical-cyan" data-scene-id="${scene.id}">${icon('lightning')} 触发</button>
        <div class="scene-move-group">
          <button class="btn-icon-only btn-move-scene btn-move-up" data-scene-id="${scene.id}" title="上移" ${index === 0 ? 'disabled' : ''}>${icon('chevron_up')}</button>
          <button class="btn-icon-only btn-move-scene btn-move-down" data-scene-id="${scene.id}" title="下移" ${index === scenes.length - 1 ? 'disabled' : ''}>${icon('chevron_down')}</button>
        </div>
        <button class="btn-icon-only btn-delete-scene" data-scene-id="${scene.id}" title="删除此环节">${icon('close')}</button>
      </div>
    `;

    container.appendChild(card);
  });

  // Add scene button
  const addBtn = document.createElement('button');
  addBtn.className = 'btn-add-scene';
  addBtn.innerHTML = `${icon('add')} 新增仪式环节`;
  addBtn.addEventListener('click', addScene);
  container.appendChild(addBtn);

  bindSceneEvents();
}

function bindSceneEvents() {
  scenes.forEach(scene => {
    const card = document.getElementById(`scene-card-${scene.id}`);
    if (!card) return;

    const dragHandle = card.querySelector('.scene-drag-handle');
    const nameInput = card.querySelector('.scene-name-input');
    const cueBtn = card.querySelector('.btn-cue-trigger');
    const deleteBtn = card.querySelector('.btn-delete-scene');
    const moveUpBtn = card.querySelector('.btn-move-up');
    const moveDownBtn = card.querySelector('.btn-move-down');
    const playModeSelect = card.querySelector('.scene-playmode-select');
    const loopCheckbox = card.querySelector('.scene-loop-checkbox');
    const addZone = card.querySelector('.scene-track-add-zone');
    const trackFileInput = card.querySelector('.track-file-input');

    // Scene drag handle
    dragHandle.addEventListener('dragstart', (e) => {
      if (scene.id === activeSceneId) { e.preventDefault(); return; }
      sceneDragState = { sourceId: scene.id };
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(scene.id));
    });

    if (moveUpBtn) moveUpBtn.addEventListener('click', () => moveSceneUp(scene.id));
    if (moveDownBtn) moveDownBtn.addEventListener('click', () => moveSceneDown(scene.id));

    // Name edit
    nameInput.addEventListener('blur', () => {
      const oldName = scene.name;
      scene.name = nameInput.value.trim() || scene.name;
      if (oldName !== scene.name) saveCurrentConfigToLocalStorage();
    });
    nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') nameInput.blur(); });

    // Play mode
    playModeSelect.addEventListener('change', () => {
      scene.playMode = playModeSelect.value;
      saveCurrentConfigToLocalStorage();
    });

    // Scene-level fade inputs
    card.querySelectorAll('.scene-fade-input').forEach(input => {
      input.addEventListener('change', () => {
        const field = input.dataset.field;
        scene[field] = parseFloat(input.value) || 0;
        saveCurrentConfigToLocalStorage();
      });
    });

    // Loop toggle
    loopCheckbox.addEventListener('change', () => {
      scene.loop = loopCheckbox.checked;
      // Keep the transport bar loop button in sync when the active scene's
      // checkbox is toggled directly on the scene card
      if (activeSceneId === scene.id) {
        // (loop button removed — scene card checkbox is the single source of truth)
      }
      saveCurrentConfigToLocalStorage();
    });

    // Track add zone
    addZone.addEventListener('click', () => trackFileInput.click());
    trackFileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) addTrackToScene(scene.id, e.target.files[0]);
      e.target.value = '';
    });
    addZone.addEventListener('dragover', (e) => { e.preventDefault(); addZone.classList.add('active-hover'); });
    addZone.addEventListener('dragleave', () => addZone.classList.remove('active-hover'));
    addZone.addEventListener('drop', (e) => {
      e.preventDefault();
      addZone.classList.remove('active-hover');
      if (e.dataTransfer.files.length > 0) addTrackToScene(scene.id, e.dataTransfer.files[0]);
    });

    // Track-level events
    card.querySelectorAll('.track-param-input').forEach(input => {
      input.addEventListener('change', () => {
        const trackId = input.dataset.trackId;
        const field = input.dataset.field;
        const track = scene.tracks.find(t => t.id === trackId);
        if (!track) return;
        if (field === 'endTime' && (input.value === '' || isNaN(parseFloat(input.value)))) {
          track.endTime = null;
        } else {
          track[field] = parseFloat(input.value) || 0;
        }
        saveCurrentConfigToLocalStorage();
      });
    });

    card.querySelectorAll('.track-delete').forEach(btn => {
      btn.addEventListener('click', () => removeTrackFromScene(scene.id, btn.dataset.trackId));
    });

    // Track drag handles for reorder within scene
    card.querySelectorAll('.track-drag-handle').forEach(handle => {
      handle.addEventListener('dragstart', (e) => {
        e.stopPropagation(); // Don't trigger scene drag
        handle.closest('.scene-track-row').classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', `track:${scene.id}:${handle.dataset.trackId}`);
      });
      handle.addEventListener('dragend', () => {
        card.querySelectorAll('.scene-track-row.dragging').forEach(r => r.classList.remove('dragging'));
        card.querySelectorAll('.track-drop-indicator').forEach(el => el.remove());
      });
    });

    // Track drop zones within scene
    card.querySelectorAll('.scene-track-row').forEach(row => {
      row.addEventListener('dragover', (e) => {
        e.preventDefault();
        const data = e.dataTransfer.types.includes('text/plain');
        if (!data) return;
        card.querySelectorAll('.track-drop-indicator').forEach(el => el.remove());
        const rect = row.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const indicator = document.createElement('div');
        indicator.className = 'track-drop-indicator';
        if (e.clientY < midY) row.before(indicator);
        else row.after(indicator);
      });
      row.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        card.querySelectorAll('.track-drop-indicator').forEach(el => el.remove());
        const text = e.dataTransfer.getData('text/plain');
        if (!text.startsWith('track:')) return;
        const [, dropSceneId, dragTrackId] = text.split(':');
        if (parseInt(dropSceneId) !== scene.id) return;
        const dropTrackId = row.dataset.trackId;
        if (dragTrackId === dropTrackId) return;
        const fromIdx = scene.tracks.findIndex(t => t.id === dragTrackId);
        const toIdx = scene.tracks.findIndex(t => t.id === dropTrackId);
        if (fromIdx < 0 || toIdx < 0) return;
        const rect = row.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        let insertIdx = e.clientY < midY ? toIdx : toIdx + 1;
        if (fromIdx < insertIdx) insertIdx--;
        const [moved] = scene.tracks.splice(fromIdx, 1);
        scene.tracks.splice(insertIdx, 0, moved);
        renderScenes();
        saveCurrentConfigToLocalStorage();
      });
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
  scenes.push({
    id: nextSceneId++,
    name: `新环节 ${scenes.length + 1}`,
    playMode: 'sequential',
    fadeIn: 2.0,
    fadeOut: 2.0,
    loop: false,
    tracks: []
  });
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

  const scene = scenes.find(s => s.id === sceneId);
  if (scene) {
    scene.tracks.forEach(t => {
      if (t.assignedTrackId) deleteCachedAudioFile(t.assignedTrackId).catch(() => {});
    });
  }

  scenes = scenes.filter(s => s.id !== sceneId);
  renderScenes();
  saveCurrentConfigToLocalStorage();
}

function moveSceneUp(sceneId) {
  const idx = scenes.findIndex(s => s.id === sceneId);
  if (idx <= 0) return;
  [scenes[idx - 1], scenes[idx]] = [scenes[idx], scenes[idx - 1]];
  renderScenes();
  saveCurrentConfigToLocalStorage();
}

function moveSceneDown(sceneId) {
  const idx = scenes.findIndex(s => s.id === sceneId);
  if (idx < 0 || idx >= scenes.length - 1) return;
  [scenes[idx], scenes[idx + 1]] = [scenes[idx + 1], scenes[idx]];
  renderScenes();
  saveCurrentConfigToLocalStorage();
}

function getSceneCardAtY(y) {
  const cards = scenesFlowList.querySelectorAll('.scene-item-card');
  for (const card of cards) {
    const rect = card.getBoundingClientRect();
    if (y >= rect.top && y <= rect.bottom) return card;
  }
  return null;
}

function handleSceneDragOver(e) {
  if (!sceneDragState) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';

  // Remove existing indicator
  scenesFlowList.querySelectorAll('.scene-drop-indicator').forEach(el => el.remove());

  const targetCard = getSceneCardAtY(e.clientY);
  if (!targetCard) return;
  const targetId = parseInt(targetCard.dataset.sceneId);
  if (targetId === sceneDragState.sourceId) return;

  const rect = targetCard.getBoundingClientRect();
  const midY = rect.top + rect.height / 2;
  const indicator = document.createElement('div');
  indicator.className = 'scene-drop-indicator';

  if (e.clientY < midY) {
    targetCard.before(indicator);
    sceneDragState.dropTargetId = targetId;
    sceneDragState.dropPosition = 'before';
  } else {
    targetCard.after(indicator);
    sceneDragState.dropTargetId = targetId;
    sceneDragState.dropPosition = 'after';
  }
}

function handleSceneDrop(e) {
  e.preventDefault();
  if (!sceneDragState || sceneDragState.dropTargetId == null) {
    sceneDragState = null;
    scenesFlowList.querySelectorAll('.scene-drop-indicator').forEach(el => el.remove());
    return;
  }

  const fromIdx = scenes.findIndex(s => s.id === sceneDragState.sourceId);
  const toIdx = scenes.findIndex(s => s.id === sceneDragState.dropTargetId);
  if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) {
    sceneDragState = null;
    renderScenes();
    return;
  }

  // Remove the dragged item first
  const [moved] = scenes.splice(fromIdx, 1);

  // Calculate insert position in the modified array
  let insertIdx;
  if (fromIdx < toIdx) {
    insertIdx = sceneDragState.dropPosition === 'after' ? toIdx : toIdx - 1;
  } else {
    insertIdx = sceneDragState.dropPosition === 'after' ? toIdx + 1 : toIdx;
  }

  scenes.splice(insertIdx, 0, moved);

  sceneDragState = null;
  renderScenes();
  saveCurrentConfigToLocalStorage();
}

function handleSceneDragEnd(e) {
  sceneDragState = null;
  scenesFlowList.querySelectorAll('.scene-drop-indicator').forEach(el => el.remove());
  scenesFlowList.querySelectorAll('.scene-item-card.dragging').forEach(el => el.classList.remove('dragging'));
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

  // Scene reorder: container-level drag events
  scenesFlowList.addEventListener('dragover', handleSceneDragOver);
  scenesFlowList.addEventListener('drop', handleSceneDrop);
  scenesFlowList.addEventListener('dragend', handleSceneDragEnd);

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

    audioCtx.onstatechange = () => {
      if (audioCtx.state === 'running' && !vuLoopRunning) {
        requestAnimationFrame(updateVUMetersLoop);
      }
    };
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().then(() => {
      if (!vuLoopRunning) requestAnimationFrame(updateVUMetersLoop);
    });
  }
  return audioCtx;
}

// LED System Clock — store interval ID so it can be cleared if needed
let ledClockIntervalId = null;

function startLEDClock() {
  if (ledClockIntervalId) clearInterval(ledClockIntervalId);
  ledClockIntervalId = setInterval(updateLEDClock, 1000);
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
// Playlist Utilities
// ==========================================================================
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildPlayOrder(scene) {
  if (scene.playMode === 'random') {
    return shuffleArray(scene.tracks.map((_, i) => i));
  }
  return scene.tracks.map((_, i) => i);
}

function clampTrackFade(track) {
  if (!track.buffer) return;
  const effectiveDuration = (track.endTime || track.buffer.duration) - (track.startTime || 0);
  if (effectiveDuration <= 0) return;
  track.fadeIn = Math.min(track.fadeIn, effectiveDuration * 0.5);
  track.fadeOut = Math.min(track.fadeOut, effectiveDuration * 0.5);
  if (track.fadeIn + track.fadeOut > effectiveDuration) {
    const ratio = effectiveDuration / (track.fadeIn + track.fadeOut);
    track.fadeIn *= ratio;
    track.fadeOut *= ratio;
  }
}

// ==========================================================================
// Scene Track Management
// ==========================================================================
async function addTrackToScene(sceneId, file) {
  const context = getAudioContext();
  const scene = scenes.find(s => s.id === sceneId);
  if (!scene) return;

  const trackId = `t${nextTrackId++}`;
  const assignedTrackId = `scene_${sceneId}_${trackId}`;

  try {
    showLoaderOverlay('CACHING AUDIO TRACK', 'Writing audio buffer persistently into local database...');
    await cacheAudioFile(assignedTrackId, file);
    hideLoaderOverlay();

    const arrayBuffer = await file.arrayBuffer();
    const decodedBuffer = await context.decodeAudioData(arrayBuffer.slice(0));

    scene.tracks.push({
      id: trackId,
      buffer: decodedBuffer,
      assignedTrackId: assignedTrackId,
      assignedTrackName: file.name,
      startTime: 0,
      endTime: null,
      fadeIn: 0,
      fadeOut: 0
    });

    renderScenes();
    saveCurrentConfigToLocalStorage();
  } catch (err) {
    hideLoaderOverlay();
    console.error('音频加载失败:', err);
    alert(`加载文件 "${file.name}" 失败，请确认它是有效的音频格式。`);
  }
}

function removeTrackFromScene(sceneId, trackId) {
  const scene = scenes.find(s => s.id === sceneId);
  if (!scene) return;

  const track = scene.tracks.find(t => t.id === trackId);
  if (!track) return;

  // If scene is currently playing and this track is involved
  if (activeSceneId === sceneId && activeBgmSources[sceneId]) {
    const state = activeBgmSources[sceneId];
    const currentIndex = state.playOrder[state.currentOrderIndex];
    const currentTrack = scene.tracks[currentIndex];

    if (currentTrack && currentTrack.id === trackId) {
      // Deleting the currently playing track
      if (state.crossfadeTimer) clearTimeout(state.crossfadeTimer);
      try { state.currentSource?.stop(); state.currentSource?.disconnect(); } catch(e) {}
      try { state.currentGain?.disconnect(); } catch(e) {}

      if (scene.tracks.length <= 1) {
        stopLivePlayback();
      } else {
        // Remove the track, rebuild playOrder, advance
        scene.tracks = scene.tracks.filter(t => t.id !== trackId);
        state.playOrder = buildPlayOrder(scene);
        state.currentOrderIndex = 0;
        if (state.playOrder.length > 0) {
          playTrackInScene(sceneId, 0);
        } else {
          stopLivePlayback();
        }
      }
      if (track.assignedTrackId) deleteCachedAudioFile(track.assignedTrackId).catch(() => {});
      renderScenes();
      saveCurrentConfigToLocalStorage();
      return;
    }
  }

  scene.tracks = scene.tracks.filter(t => t.id !== trackId);
  if (track.assignedTrackId) deleteCachedAudioFile(track.assignedTrackId).catch(() => {});
  renderScenes();
  saveCurrentConfigToLocalStorage();
}

function moveTrackUp(sceneId, trackId) {
  const scene = scenes.find(s => s.id === sceneId);
  if (!scene) return;
  const idx = scene.tracks.findIndex(t => t.id === trackId);
  if (idx <= 0) return;
  [scene.tracks[idx - 1], scene.tracks[idx]] = [scene.tracks[idx], scene.tracks[idx - 1]];

  // Sync playOrder if scene is playing
  if (activeSceneId === sceneId && activeBgmSources[sceneId]) {
    const state = activeBgmSources[sceneId];
    const posA = state.playOrder.indexOf(idx - 1);
    const posB = state.playOrder.indexOf(idx);
    if (posA >= 0 && posB >= 0) {
      [state.playOrder[posA], state.playOrder[posB]] = [state.playOrder[posB], state.playOrder[posA]];
    }
  }

  renderScenes();
  saveCurrentConfigToLocalStorage();
}

function moveTrackDown(sceneId, trackId) {
  const scene = scenes.find(s => s.id === sceneId);
  if (!scene) return;
  const idx = scene.tracks.findIndex(t => t.id === trackId);
  if (idx < 0 || idx >= scene.tracks.length - 1) return;
  [scene.tracks[idx], scene.tracks[idx + 1]] = [scene.tracks[idx + 1], scene.tracks[idx]];

  if (activeSceneId === sceneId && activeBgmSources[sceneId]) {
    const state = activeBgmSources[sceneId];
    const posA = state.playOrder.indexOf(idx);
    const posB = state.playOrder.indexOf(idx + 1);
    if (posA >= 0 && posB >= 0) {
      [state.playOrder[posA], state.playOrder[posB]] = [state.playOrder[posB], state.playOrder[posA]];
    }
  }

  renderScenes();
  saveCurrentConfigToLocalStorage();
}

// ==========================================================================
// Playlist Playback Engine
// ==========================================================================
function playTrackInScene(sceneId, orderIndex) {
  const context = getAudioContext();
  const scene = scenes.find(s => s.id === sceneId);
  if (!scene || scene.tracks.length === 0) return;

  let state = activeBgmSources[sceneId];
  const isFirstTrack = !state;

  const trackIdx = state ? state.playOrder[orderIndex] : buildPlayOrder(scene)[orderIndex];
  const track = scene.tracks[trackIdx];
  if (!track || !track.buffer) return;

  const now = context.currentTime;

  // Ensure scene-level gain node exists
  if (!state) {
    const sceneGainNode = context.createGain();
    sceneGainNode.connect(bgmGain);
    const playOrder = buildPlayOrder(scene);
    state = {
      sceneGainNode,
      currentSource: null,
      currentGain: null,
      playOrder,
      currentOrderIndex: orderIndex,
      isPlaying: true,
      crossfadeTimer: null,
      transitionScheduled: false,
      needsAdvance: false,
      startTimestamp: now
    };
    activeBgmSources[sceneId] = state;
  }

  const effectiveStart = track.startTime || 0;
  const effectiveEnd = track.endTime || track.buffer.duration;
  const effectiveDuration = effectiveEnd - effectiveStart;

  if (effectiveDuration <= 0) return;

  // Clamp fade times so they never exceed half the effective duration
  clampTrackFade(track);

  // Create track-level source + gain
  const source = context.createBufferSource();
  source.buffer = track.buffer;
  source.loop = false;

  const trackGain = context.createGain();
  source.connect(trackGain);
  trackGain.connect(state.sceneGainNode);

  // Determine fade-in: scene-level for first track, track-level for transitions
  const fadeInTime = isFirstTrack ? scene.fadeIn : (track.fadeIn || 0);

  if (isFirstTrack && !isDuckingActive) {
    // Scene start: apply scene-level fade-in
    state.sceneGainNode.gain.setValueAtTime(0, now);
    state.sceneGainNode.gain.linearRampToValueAtTime(bgmVolume, now + fadeInTime);
    trackGain.gain.setValueAtTime(1, now);
  } else if (isFirstTrack && isDuckingActive) {
    state.sceneGainNode.gain.setValueAtTime(0, now);
    state.sceneGainNode.gain.linearRampToValueAtTime(0.25 * bgmVolume, now + fadeInTime);
    trackGain.gain.setValueAtTime(1, now);
  } else {
    // Inter-track transition: track-level fade-in, scene gain stays constant
    trackGain.gain.setValueAtTime(0, now);
    if (fadeInTime > 0) {
      trackGain.gain.linearRampToValueAtTime(1, now + fadeInTime);
    } else {
      trackGain.gain.setValueAtTime(1, now);
    }
  }

  source.start(now, effectiveStart, effectiveDuration);

  // Update state
  state.currentSource = source;
  state.currentGain = trackGain;
  state.currentOrderIndex = orderIndex;
  state.isPlaying = true;
  state.transitionScheduled = false;
  state.needsAdvance = false;
  state.startTimestamp = now;

  source.onended = () => {
    if (state.currentSource !== source) return; // already replaced
    if (!state.isPlaying) return;
    if (state.transitionScheduled) return;

    state.needsAdvance = true;
    advanceToNextTrack(sceneId);
  };

  // Schedule crossfade before track ends
  const crossfadeDuration = Math.max(track.fadeOut || 0, 0);
  const preCrossfadeTime = effectiveDuration - crossfadeDuration;
  if (preCrossfadeTime > 0 && scene.tracks.length > 1) {
    scheduleNextTrackCrossfade(sceneId, preCrossfadeTime);
  }

  // Update UI
  updateTrackDeckInfo(sceneId);
  if (isFirstTrack) {
    const targetCard = document.getElementById(`scene-card-${sceneId}`);
    if (targetCard) targetCard.classList.add('active-on-air');
    const targetStatus = document.getElementById(`scene-status-${sceneId}`);
    if (targetStatus) targetStatus.textContent = 'ON AIR';
  }

  playbackStartTime = context.currentTime;
  playbackOffset = effectiveStart;
  if (isFirstTrack) {
    if (activeVisualizerInterval) cancelAnimationFrame(activeVisualizerInterval);
    activeVisualizerInterval = null;
    activeVisualizerInterval = requestAnimationFrame(animateDeckPlayhead);
  }
}

function scheduleNextTrackCrossfade(sceneId, delaySeconds) {
  const state = activeBgmSources[sceneId];
  if (!state || state.transitionScheduled) return;

  state.transitionScheduled = true;
  if (state.crossfadeTimer) clearTimeout(state.crossfadeTimer);

  state.crossfadeTimer = setTimeout(() => {
    if (!state.isPlaying) return;
    advanceToNextTrack(sceneId);
  }, delaySeconds * 1000);
}

function advanceToNextTrack(sceneId, nextOrderIndex) {
  const context = getAudioContext();
  const scene = scenes.find(s => s.id === sceneId);
  const state = activeBgmSources[sceneId];
  if (!scene || !state) return;

  if (state.crossfadeTimer) { clearTimeout(state.crossfadeTimer); state.crossfadeTimer = null; }
  state.transitionScheduled = false;
  state.needsAdvance = false;

  // Determine next track index
  let nextIdx;
  if (nextOrderIndex !== undefined) {
    nextIdx = nextOrderIndex;
  } else {
    nextIdx = state.currentOrderIndex + 1;
    if (nextIdx >= state.playOrder.length) {
      if (scene.loop) {
        state.playOrder = buildPlayOrder(scene); // reshuffle for random mode
        nextIdx = 0;
      } else {
        // Playlist finished — fade out scene
        const fadeOutTime = scene.fadeOut || 2.0;
        const now = context.currentTime;
        state.sceneGainNode.gain.setValueAtTime(state.sceneGainNode.gain.value, now);
        state.sceneGainNode.gain.linearRampToValueAtTime(0.0001, now + fadeOutTime);
        const oldSource = state.currentSource;
        const oldGain = state.currentGain;
        const sceneGain = state.sceneGainNode;
        setTimeout(() => {
          try { oldSource?.stop(); oldSource?.disconnect(); oldGain?.disconnect(); } catch(e) {}
          try { sceneGain?.disconnect(); } catch(e) {}
          delete activeBgmSources[sceneId];
        }, (fadeOutTime + 0.2) * 1000);
        const card = document.getElementById(`scene-card-${sceneId}`);
        if (card) card.classList.remove('active-on-air');
        const status = document.getElementById(`scene-status-${sceneId}`);
        if (status) status.textContent = 'STANDBY';
        if (activeSceneId === sceneId) {
          activeSceneId = null;
          masterStatusTag.textContent = 'STANDBY';
          masterStatusTag.className = 'status-indicator-tag status-ready';
          btnLivePlayPause.innerHTML = BTN_PLAY_HTML();
        }
        return;
      }
    }
  }

  const now = context.currentTime;
  const nextTrackIdx = state.playOrder[nextIdx];
  const nextTrack = scene.tracks[nextTrackIdx];

  // Guard against infinite recursion: if we've looped through all tracks and
  // none have a valid buffer, abort rather than recurse indefinitely.
  if (!nextTrack || !nextTrack.buffer) {
    const safeNextIdx = nextIdx + 1;
    if (safeNextIdx >= state.playOrder.length) {
      // No valid tracks at all — clean up this specific scene's state without
      // touching activeSceneId (which may already point to a different scene).
      console.warn(`[WedMix] 场景 ${sceneId} 中所有轨道均无有效音频，停止播放。`);
      try { state.currentSource?.stop(); state.currentSource?.disconnect(); state.currentGain?.disconnect(); state.sceneGainNode?.disconnect(); } catch(e) {}
      delete activeBgmSources[sceneId];
      const _card = document.getElementById(`scene-card-${sceneId}`);
      if (_card) _card.classList.remove('active-on-air');
      const _status = document.getElementById(`scene-status-${sceneId}`);
      if (_status) _status.textContent = 'STANDBY';
      if (activeSceneId === sceneId) {
        activeSceneId = null;
        masterStatusTag.textContent = 'STANDBY';
        masterStatusTag.className = 'status-indicator-tag status-ready';
        btnLivePlayPause.innerHTML = BTN_PLAY_HTML();
      }
      return;
    }
    advanceToNextTrack(sceneId, safeNextIdx);
    return;
  }

  const effectiveStart = nextTrack.startTime || 0;
  const effectiveEnd = nextTrack.endTime || nextTrack.buffer.duration;
  const effectiveDuration = effectiveEnd - effectiveStart;
  if (effectiveDuration <= 0) {
    const safeNextIdx = nextIdx + 1;
    if (safeNextIdx >= state.playOrder.length) {
      console.warn(`[WedMix] 场景 ${sceneId} 中所有轨道有效时长均为零，停止播放。`);
      try { state.currentSource?.stop(); state.currentSource?.disconnect(); state.currentGain?.disconnect(); state.sceneGainNode?.disconnect(); } catch(e) {}
      delete activeBgmSources[sceneId];
      const _card = document.getElementById(`scene-card-${sceneId}`);
      if (_card) _card.classList.remove('active-on-air');
      const _status = document.getElementById(`scene-status-${sceneId}`);
      if (_status) _status.textContent = 'STANDBY';
      if (activeSceneId === sceneId) {
        activeSceneId = null;
        masterStatusTag.textContent = 'STANDBY';
        masterStatusTag.className = 'status-indicator-tag status-ready';
        btnLivePlayPause.innerHTML = BTN_PLAY_HTML();
      }
      return;
    }
    advanceToNextTrack(sceneId, safeNextIdx);
    return;
  }

  // Create new track source + gain
  const newSource = context.createBufferSource();
  newSource.buffer = nextTrack.buffer;
  newSource.loop = false;
  const newTrackGain = context.createGain();
  newSource.connect(newTrackGain);
  newTrackGain.connect(state.sceneGainNode);

  // Crossfade: max of current track's fadeOut and next track's fadeIn
  const fadeOutTime = (state.currentGain && state.currentSource) ?
    Math.max(scene.tracks[state.playOrder[state.currentOrderIndex]]?.fadeOut || 0, nextTrack.fadeIn || 0) :
    (nextTrack.fadeIn || 0);

  // Start new track
  newTrackGain.gain.setValueAtTime(0, now);
  if (fadeOutTime > 0) {
    newTrackGain.gain.linearRampToValueAtTime(1, now + fadeOutTime);
  } else {
    newTrackGain.gain.setValueAtTime(1, now);
  }
  newSource.start(now, effectiveStart, effectiveDuration);

  // Fade out old track
  if (state.currentGain && state.currentSource) {
    const oldGain = state.currentGain;
    const oldSource = state.currentSource;
    oldGain.gain.setValueAtTime(oldGain.gain.value, now);
    oldGain.gain.linearRampToValueAtTime(0, now + fadeOutTime);
    setTimeout(() => { try { oldSource.stop(); oldSource.disconnect(); oldGain.disconnect(); } catch(e) {} }, (fadeOutTime + 0.5) * 1000);
  }

  // Update state
  state.currentSource = newSource;
  state.currentGain = newTrackGain;
  state.currentOrderIndex = nextIdx;
  state.isPlaying = true;
  state.transitionScheduled = false;
  state.startTimestamp = now;

  newSource.onended = () => {
    if (state.currentSource !== newSource) return;
    if (!state.isPlaying) return;
    if (state.transitionScheduled) return;
    state.needsAdvance = true;
    advanceToNextTrack(sceneId);
  };

  // Schedule next crossfade
  const nextCrossfadeDuration = nextTrack.fadeOut || 0;
  const preCrossfadeTime = effectiveDuration - nextCrossfadeDuration;
  if (preCrossfadeTime > 0 && scene.tracks.length > 1) {
    scheduleNextTrackCrossfade(sceneId, preCrossfadeTime);
  }

  playbackStartTime = context.currentTime;
  playbackOffset = effectiveStart;
  updateTrackDeckInfo(sceneId);
}

function updateTrackDeckInfo(sceneId) {
  const state = activeBgmSources[sceneId];
  const scene = scenes.find(s => s.id === sceneId);
  if (!state || !scene) return;

  const trackIdx = state.playOrder[state.currentOrderIndex];
  const track = scene.tracks[trackIdx];
  if (!track) return;

  activeDrawingBuffer = track.buffer;
  deckDisplayTrackTitle.textContent = track.assignedTrackName || '未知曲目';
  drawDeckWaveform(track.buffer);
  deckValTotalDuration.textContent = formatTime(track.buffer.duration);

  // Update track highlight in scene card
  const sceneCard = document.getElementById(`scene-card-${sceneId}`);
  if (sceneCard) {
    sceneCard.querySelectorAll('.scene-track-row').forEach((row, i) => {
      row.classList.toggle('playing', i === trackIdx);
    });
  }

  // Update crossfade info display
  deckValCrossfadePreset.textContent = `I:${scene.fadeIn.toFixed(1)}s / O:${scene.fadeOut.toFixed(1)}s`;
}

// ==========================================================================
// Scene Cue Playback Engine (Playlist-based)
// ==========================================================================
function triggerSceneCue(sceneId) {
  if (isConsoleLocked) { console.warn("调音台控制面板已锁定，屏蔽触发。"); return; }

  const targetScene = scenes.find(s => s.id === sceneId);
  if (!targetScene) return;

  if (targetScene.tracks.length === 0) {
    alert(`仪式场景 "${targetScene.name}" 尚未添加任何音频文件！请先上传。`);
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

  // FADE OUT PREVIOUS scene
  if (prevSceneId && activeBgmSources[prevSceneId]) {
    const prev = activeBgmSources[prevSceneId];
    const prevScene = scenes.find(s => s.id === prevSceneId);
    const fadeOutTime = prevScene ? prevScene.fadeOut : 2.0;
    const now = getAudioContext().currentTime;

    prev.sceneGainNode.gain.setValueAtTime(prev.sceneGainNode.gain.value, now);
    prev.sceneGainNode.gain.linearRampToValueAtTime(0.0001, now + fadeOutTime);

    const oldSource = prev.currentSource;
    const oldGain = prev.currentGain;
    const oldSceneGain = prev.sceneGainNode;
    if (prev.crossfadeTimer) clearTimeout(prev.crossfadeTimer);
    setTimeout(() => {
      try { oldSource?.stop(); oldSource?.disconnect(); oldGain?.disconnect(); } catch(e) {}
      try { oldSceneGain?.disconnect(); } catch(e) {}
    }, (fadeOutTime + 0.2) * 1000);
    delete activeBgmSources[prevSceneId];

    const prevCard = document.getElementById(`scene-card-${prevSceneId}`);
    if (prevCard) prevCard.classList.remove('active-on-air');
    const prevStatus = document.getElementById(`scene-status-${prevSceneId}`);
    if (prevStatus) prevStatus.textContent = 'STANDBY';
  }

  // Start new scene playlist from first track
  playTrackInScene(sceneId, 0);

  btnLivePlayPause.innerHTML = BTN_PAUSE_HTML();
}

// ==========================================================================
// Transport Bar Control Logic (Playlist-aware)
// ==========================================================================
function toggleLivePlayback() {
  if (isConsoleLocked) return;
  if (!activeSceneId) return;

  const state = activeBgmSources[activeSceneId];
  if (!state) return;

  const context = getAudioContext();
  const scene = scenes.find(s => s.id === activeSceneId);

  if (state.isPlaying) {
    // Pause
    state.isPlaying = false;
    btnLivePlayPause.innerHTML = BTN_RESUME_HTML();
    cancelAnimationFrame(activeVisualizerInterval);
    activeVisualizerInterval = null;
    if (state.crossfadeTimer) { clearTimeout(state.crossfadeTimer); state.crossfadeTimer = null; }

    const elapsed = context.currentTime - playbackStartTime;
    playbackOffset += elapsed;

    // Calculate effective end of current track
    const trackIdx = state.playOrder[state.currentOrderIndex];
    const track = scene ? scene.tracks[trackIdx] : null;
    const effectiveEnd = track ? (track.endTime || track.buffer.duration) : activeDrawingBuffer.duration;
    const effectiveStart = track ? (track.startTime || 0) : 0;
    if (playbackOffset >= effectiveEnd) {
      playbackOffset = effectiveStart;
    }

    try { state.currentSource?.stop(); state.currentSource?.disconnect(); } catch(e) {}
  } else {
    // Resume
    state.isPlaying = true;
    state.transitionScheduled = false;
    state.needsAdvance = false;
    btnLivePlayPause.innerHTML = BTN_PAUSE_HTML();

    const trackIdx = state.playOrder[state.currentOrderIndex];
    const track = scene ? scene.tracks[trackIdx] : null;
    if (!track || !track.buffer) return;

    const effectiveStart = track.startTime || 0;
    const effectiveEnd = track.endTime || track.buffer.duration;
    const remainingDuration = effectiveEnd - playbackOffset;

    const newSource = context.createBufferSource();
    newSource.buffer = track.buffer;
    newSource.loop = false;

    // Reconnect to sceneGainNode directly in case currentGain was disconnected
    // during a scene switch while paused.
    // IMPORTANT: connect before start() so the audio graph is wired up first.
    if (!state.currentGain || !state.sceneGainNode) return;
    try {
      newSource.connect(state.currentGain);
    } catch (e) {
      // currentGain was disconnected — create a fresh one
      const freshGain = context.createGain();
      freshGain.gain.setValueAtTime(1, context.currentTime);
      freshGain.connect(state.sceneGainNode);
      state.currentGain = freshGain;
      newSource.connect(freshGain);
    }

    if (remainingDuration > 0.01) {
      newSource.start(0, playbackOffset, remainingDuration);
    }
    playbackStartTime = context.currentTime;
    state.currentSource = newSource;
    state.startTimestamp = context.currentTime;

    newSource.onended = () => {
      if (state.currentSource !== newSource) return;
      if (!state.isPlaying) return;
      if (state.transitionScheduled) return;
      state.needsAdvance = true;
      advanceToNextTrack(activeSceneId);
    };

    // Reschedule crossfade
    const crossfadeDuration = track.fadeOut || 0;
    const preCrossfadeTime = remainingDuration - crossfadeDuration;
    if (preCrossfadeTime > 0 && scene.tracks.length > 1) {
      scheduleNextTrackCrossfade(activeSceneId, preCrossfadeTime);
    }

    cancelAnimationFrame(activeVisualizerInterval);
    activeVisualizerInterval = null;
    activeVisualizerInterval = requestAnimationFrame(animateDeckPlayhead);
  }
}

function stopLivePlayback() {
  if (isConsoleLocked) return;
  if (!activeSceneId) return;

  const state = activeBgmSources[activeSceneId];
  if (state) {
    if (state.crossfadeTimer) clearTimeout(state.crossfadeTimer);
    try { state.currentSource?.stop(); state.currentSource?.disconnect(); state.currentGain?.disconnect(); } catch(e) {}
    try { state.sceneGainNode?.disconnect(); } catch(e) {}
    delete activeBgmSources[activeSceneId];
  }

  const card = document.getElementById(`scene-card-${activeSceneId}`);
  if (card) card.classList.remove('active-on-air');
  const status = document.getElementById(`scene-status-${activeSceneId}`);
  if (status) status.textContent = 'STANDBY';

  activeSceneId = null;
  masterStatusTag.textContent = 'STANDBY';
  masterStatusTag.className = 'status-indicator-tag status-ready';

  btnLivePlayPause.innerHTML = BTN_PLAY_HTML();

  cancelAnimationFrame(activeVisualizerInterval);
  updatePlayheadMarkerUI(0);
  deckValCurrentTime.textContent = '0:00.0';
  playbackOffset = 0;
}

// ==========================================================================
// App Close Cleanup (Windows crash prevention)
// ==========================================================================
function handleAppClose() {
  // Stop all active BGM sources and disconnect the audio graph so Windows
  // releases the audio device immediately. Without this, the WASAPI session
  // can remain open and block the next launch.
  try {
    cancelAnimationFrame(activeVisualizerInterval);
    if (ledClockIntervalId) clearInterval(ledClockIntervalId);

    Object.keys(activeBgmSources).forEach(sceneId => {
      const s = activeBgmSources[sceneId];
      if (s.crossfadeTimer) clearTimeout(s.crossfadeTimer);
      try { s.currentSource?.stop(); s.currentSource?.disconnect(); } catch(e) {}
      try { s.currentGain?.disconnect(); } catch(e) {}
      try { s.sceneGainNode?.disconnect(); } catch(e) {}
    });
    activeBgmSources = {};

    activeSoundboardSources.forEach(src => { try { src.stop(); } catch(e) {} });
    activeSoundboardSources = [];

    if (audioCtx && audioCtx.state !== 'closed') {
      audioCtx.close().catch(() => {});
    }
  } catch(e) {
    // Best-effort cleanup — never throw during unload
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
// Visualizer Waveform Drawer & Marker Animators (Track-level params)
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

  // Draw startTime/endTime markers for the current playing track
  if (activeSceneId && activeBgmSources[activeSceneId]) {
    const state = activeBgmSources[activeSceneId];
    const scene = scenes.find(s => s.id === activeSceneId);
    if (scene && audioBuffer.duration > 0) {
      const trackIdx = state.playOrder[state.currentOrderIndex];
      const track = scene.tracks[trackIdx];
      const trackStart = track ? (track.startTime || 0) : 0;
      const trackEnd = track ? (track.endTime || audioBuffer.duration) : audioBuffer.duration;

      const startPx = (trackStart / audioBuffer.duration) * width;
      const endPx = (trackEnd / audioBuffer.duration) * width;

      // Dim regions outside the active range
      ctx.fillStyle = 'rgba(7, 7, 11, 0.6)';
      if (startPx > 0) ctx.fillRect(0, 0, startPx, height);
      if (endPx < width) ctx.fillRect(endPx, 0, width - endPx, height);

      // Start/end boundary lines
      ctx.strokeStyle = 'rgba(0, 242, 254, 0.6)';
      ctx.lineWidth = 1;
      if (trackStart > 0) { ctx.beginPath(); ctx.moveTo(startPx, 0); ctx.lineTo(startPx, height); ctx.stroke(); }
      if (trackEnd < audioBuffer.duration) { ctx.beginPath(); ctx.moveTo(endPx, 0); ctx.lineTo(endPx, height); ctx.stroke(); }
    }
  }

  canvas.parentElement.classList.toggle('has-active-track', !!audioBuffer);
}

// ==========================================================================
// Waveform Seek (Click & Drag to change playback position)
// ==========================================================================
function initWaveformSeek() {
  const workspace = deckWaveformCanvas.parentElement;
  let isDragging = false;
  let seekTargetSceneId = null;

  const previewEl = document.createElement('div');
  previewEl.className = 'seek-time-preview hidden';
  workspace.appendChild(previewEl);

  function xToTime(clientX) {
    if (!activeDrawingBuffer) return 0;
    const rect = deckWaveformCanvas.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return ratio * activeDrawingBuffer.duration;
  }

  function clampToEffectiveRange(time) {
    if (!activeSceneId) return time;
    const state = activeBgmSources[activeSceneId];
    const scene = scenes.find(s => s.id === activeSceneId);
    if (!state || !scene) return time;
    const track = scene.tracks[state.playOrder[state.currentOrderIndex]];
    if (!track || !track.buffer) return time;
    return Math.max(track.startTime || 0, Math.min(track.endTime || track.buffer.duration, time));
  }

  function updateSeekUI(time) {
    updatePlayheadMarkerUI(time);
    deckValCurrentTime.textContent = formatTime(time);
    previewEl.textContent = formatTime(time);
    previewEl.style.left = `${(time / activeDrawingBuffer.duration) * 100}%`;
  }

  function performSeek(targetTime) {
    if (!activeSceneId || !activeDrawingBuffer) return;
    if (activeSceneId !== seekTargetSceneId) return;

    const state = activeBgmSources[activeSceneId];
    if (!state) return;

    const context = getAudioContext();
    const scene = scenes.find(s => s.id === activeSceneId);
    const track = scene?.tracks[state.playOrder[state.currentOrderIndex]];
    if (!track || !track.buffer) return;

    const effectiveStart = track.startTime || 0;
    const effectiveEnd = track.endTime || track.buffer.duration;

    if (targetTime < effectiveStart) targetTime = effectiveStart;
    if (targetTime >= effectiveEnd) targetTime = Math.max(effectiveStart, effectiveEnd - 0.01);

    const remainingDuration = effectiveEnd - targetTime;

    if (state.isPlaying) {
      // Seeked to (near) end — delegate to track-advance logic
      if (remainingDuration <= 0.01) {
        updateSeekUI(targetTime);
        advanceToNextTrack(activeSceneId);
        return;
      }

      if (state.crossfadeTimer) { clearTimeout(state.crossfadeTimer); state.crossfadeTimer = null; }
      state.needsAdvance = false;
      state.transitionScheduled = false;

      try { state.currentSource?.stop(); state.currentSource?.disconnect(); } catch (e) {}

      // Clear stale gain automation (BUG-1 fix)
      state.sceneGainNode.gain.cancelScheduledValues(context.currentTime);
      state.sceneGainNode.gain.setValueAtTime(bgmVolume, context.currentTime);
      state.currentGain.gain.cancelScheduledValues(context.currentTime);
      state.currentGain.gain.setValueAtTime(1, context.currentTime);

      const newSource = context.createBufferSource();
      newSource.buffer = track.buffer;
      newSource.loop = false;
      newSource.connect(state.currentGain);
      newSource.start(0, targetTime, remainingDuration);

      state.currentSource = newSource;
      playbackStartTime = context.currentTime;
      playbackOffset = targetTime;
      state.startTimestamp = context.currentTime;

      newSource.onended = () => {
        if (state.currentSource !== newSource) return;
        if (!state.isPlaying) return;
        if (state.transitionScheduled) return;
        state.needsAdvance = true;
        advanceToNextTrack(activeSceneId);
      };

      const crossfadeDuration = track.fadeOut || 0;
      const preCrossfadeTime = remainingDuration - crossfadeDuration;
      if (preCrossfadeTime > 0 && scene.tracks.length > 1) {
        scheduleNextTrackCrossfade(activeSceneId, preCrossfadeTime);
      }
    } else {
      playbackOffset = targetTime;
    }

    updateSeekUI(targetTime);
  }

  workspace.addEventListener('mousedown', (e) => {
    if (isConsoleLocked) return;
    if (!activeDrawingBuffer) return;
    if (!activeSceneId || !activeBgmSources[activeSceneId]) return;

    isDragging = true;
    seekTargetSceneId = activeSceneId;
    workspace.classList.add('seeking');
    previewEl.classList.remove('hidden');

    cancelAnimationFrame(activeVisualizerInterval);
    activeVisualizerInterval = null;

    const time = clampToEffectiveRange(xToTime(e.clientX));
    updateSeekUI(time);
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    updateSeekUI(clampToEffectiveRange(xToTime(e.clientX)));
  });

  document.addEventListener('mouseup', (e) => {
    if (!isDragging) return;
    isDragging = false;
    workspace.classList.remove('seeking');
    previewEl.classList.add('hidden');

    performSeek(clampToEffectiveRange(xToTime(e.clientX)));

    if (activeSceneId && activeBgmSources[activeSceneId]?.isPlaying) {
      activeVisualizerInterval = requestAnimationFrame(animateDeckPlayhead);
    }
  });
}

function animateDeckPlayhead() {
  if (!activeSceneId || !activeDrawingBuffer) return;
  const workspace = deckWaveformCanvas?.parentElement;
  if (workspace?.classList.contains('seeking')) return;

  const state = activeBgmSources[activeSceneId];
  if (state && state.isPlaying) {
    const elapsed = audioCtx.currentTime - playbackStartTime;
    const scene = scenes.find(s => s.id === activeSceneId);
    const trackIdx = state.playOrder[state.currentOrderIndex];
    const track = scene ? scene.tracks[trackIdx] : null;
    const effectiveStart = track ? (track.startTime || 0) : 0;
    const effectiveEnd = track ? (track.endTime || activeDrawingBuffer.duration) : activeDrawingBuffer.duration;

    let currentPos = playbackOffset + elapsed;

    if (currentPos < effectiveEnd) {
      updatePlayheadMarkerUI(currentPos);
      deckValCurrentTime.textContent = formatTime(currentPos);
      activeVisualizerInterval = requestAnimationFrame(animateDeckPlayhead);
    } else {
      // Track ended, playhead will be updated by advanceToNextTrack
      // Don't call stopLivePlayback here — the onended handler handles it
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
    padCustomFileName.textContent = pad.assignedTrackName ? `${pad.assignedTrackName}` : '点击或拖拽上传音频效果音';
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
      const decodedBuffer = await context.decodeAudioData(event.target.result.slice(0));
      padCustomFileInput.decodedBuffer = decodedBuffer;
      padCustomFileInput.fileName = file.name;
      padCustomFileInput.rawFile = file;
      padCustomFileName.textContent = `${file.name} (解码就绪)`;
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

    pad.type = "synth";
    pad.synthEffectId = def.synthEffectId;
    pad.name = def.name;
    pad.buffer = null;
    pad.assignedTrackId = null;
    pad.assignedTrackName = null;

    const padBtn = document.getElementById(`pad-btn-${pad.id}`);
    if (padBtn) padBtn.querySelector('.pad-title').textContent = def.name;

    saveCurrentConfigToLocalStorage();
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

    if (activeSceneId && activeBgmSources[activeSceneId]) {
      const activeGain = activeBgmSources[activeSceneId].sceneGainNode.gain;
      activeGain.setValueAtTime(activeGain.value, now);
      activeGain.linearRampToValueAtTime(crossfaderGain * bgmVolume, now + 0.5);
    }
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
    activeBgmSources[activeSceneId].sceneGainNode.gain.setValueAtTime(targetGain, context.currentTime);
  }
}

// ==========================================================================
// 🚨 EMERGENCY FADE OUT
// ==========================================================================
function triggerEmergencyFadeOut() {
  if (isEmergencyActive) return;
  isEmergencyActive = true;

  try {
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
        try { activeBgmSources[sceneId].currentSource?.stop(); activeBgmSources[sceneId].currentSource?.disconnect(); activeBgmSources[sceneId].currentGain?.disconnect(); activeBgmSources[sceneId].sceneGainNode?.disconnect(); } catch(e) {}
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
      btnLivePlayPause.innerHTML = BTN_PLAY_HTML();
      deckDisplayTrackTitle.textContent = 'NO ACTIVE TRACK';
      isEmergencyActive = false;
    }, fadeOutSecs * 1000 + 200);
  } catch (e) {
    isEmergencyActive = false;
    throw e;
  }
}

// ==========================================================================
// VU LED Bouncing Meter Animation Loop
// ==========================================================================
function updateVUMetersLoop() {
  if (!audioCtx || audioCtx.state !== 'running') {
    vuLoopRunning = false;
    for (let i = 0; i < 15; i++) {
      leftLEDs[i].classList.remove('lit');
      rightLEDs[i].classList.remove('lit');
    }
    return;
  }
  vuLoopRunning = true;
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

    // Build a flat list of all decode tasks and run them in parallel.
    // Each task catches its own error so one bad file doesn't abort the rest.
    const sceneTasks = scenes.flatMap(scene =>
      scene.tracks
        .filter(track => track.assignedTrackId)
        .map(async track => {
          try {
            const fileBlob = await getCachedAudioFile(track.assignedTrackId);
            if (fileBlob) {
              const arrayBuf = await fileBlob.arrayBuffer();
              const decodedBuffer = await context.decodeAudioData(arrayBuf.slice(0));
              track.buffer = decodedBuffer;
              if (fileBlob.name) track.assignedTrackName = fileBlob.name;
            }
          } catch (err) {
            console.warn(`[WedMix] 场景轨道 ${track.assignedTrackId} 缓存恢复失败:`, err);
          }
        })
    );

    const padTasks = soundboard.map(async pad => {
      try {
        const trackId = `pad_${pad.id}_active`;
        const fileBlob = await getCachedAudioFile(trackId);
        if (fileBlob) {
          const arrayBuf = await fileBlob.arrayBuffer();
          const decodedBuffer = await context.decodeAudioData(arrayBuf.slice(0));
          pad.buffer = decodedBuffer;
          pad.assignedTrackId = trackId;
          pad.assignedTrackName = fileBlob.name;
          pad.type = 'custom';
          const padBtn = document.getElementById(`pad-btn-${pad.id}`);
          if (padBtn) padBtn.querySelector('.pad-title').textContent = fileBlob.name.replace(/\.[^/.]+$/, "");
        }
      } catch (err) {
        console.warn(`[WedMix] 音效板 ${pad.id} 缓存恢复失败:`, err);
      }
    });

    await Promise.all([...sceneTasks, ...padTasks]);

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

    // 2. Collect scene audio files (per-track)
    // Use streamFiles:true so JSZip doesn't hold all Blobs in memory at once,
    // reducing peak RAM usage on Windows (especially important for multi-track
    // weddings where total audio can exceed 1GB uncompressed).
    for (const scene of scenes) {
      for (const track of scene.tracks) {
        if (track.assignedTrackId && track.assignedTrackName) {
          const blob = await getCachedAudioFile(track.assignedTrackId);
          if (blob) {
            const zipPath = `audio/scene_${scene.id}_${track.id}_${track.assignedTrackName}`;
            zip.file(zipPath, blob, { binary: true });
          }
        }
      }
    }

    // 3. Collect soundboard custom audio files
    for (const pad of soundboard) {
      if (pad.type === 'custom' && pad.assignedTrackId && pad.assignedTrackName) {
        const blob = await getCachedAudioFile(pad.assignedTrackId);
        if (blob) {
          zip.file(`audio/pad_${pad.id}_${pad.assignedTrackName}`, blob, { binary: true });
        }
      }
    }

    // 4. Generate ZIP with STORE compression for audio (already compressed),
    // which avoids a second CPU-intensive compression pass and reduces peak
    // memory usage significantly on Windows.
    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'STORE',   // audio files are already compressed (MP3/AAC)
      streamFiles: true       // process files one at a time to reduce RAM peak
    });
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

    // Validate required top-level fields
    if (!config || typeof config !== 'object') throw new Error('config.json 格式无效');
    if (!Array.isArray(config.scenes)) throw new Error('config.json 缺少 scenes 数组');
    if (!Array.isArray(config.soundboard)) throw new Error('config.json 缺少 soundboard 数组');

    // 2. Apply config
    weddingSchemeName.value = config.schemeName || '';

    // Rebuild scenes from config (support v3.0 tracks format and legacy)
    if (config.scenes && config.scenes.length > 0) {
      scenes = config.scenes.map(cs => {
        if (cs.tracks && Array.isArray(cs.tracks)) {
          return {
            id: cs.id,
            name: cs.name,
            playMode: cs.playMode || 'sequential',
            fadeIn: cs.fadeIn || 2.0,
            fadeOut: cs.fadeOut || 2.0,
            loop: cs.loop || false,
            tracks: cs.tracks.map(t => ({
              id: t.id,
              buffer: null,
              assignedTrackId: t.assignedTrackId || null,
              assignedTrackName: t.assignedTrackName || null,
              startTime: t.startTime || 0,
              endTime: t.endTime || null,
              fadeIn: t.fadeIn || 0,
              fadeOut: t.fadeOut || 0
            }))
          };
        }
        const tracks = [];
        if (cs.assignedTrackId) {
          tracks.push({
            id: `t${nextTrackId++}`,
            buffer: null,
            assignedTrackId: cs.assignedTrackId,
            assignedTrackName: cs.assignedTrackName || null,
            startTime: cs.startTime || 0,
            endTime: cs.endTime || null,
            fadeIn: 0,
            fadeOut: 0
          });
        }
        return {
          id: cs.id,
          name: cs.name,
          playMode: 'sequential',
          fadeIn: cs.fadeIn || 2.0,
          fadeOut: cs.fadeOut || 2.0,
          loop: cs.loop || false,
          tracks
        };
      });
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
      if (!cs) continue;
      const csTracks = cs.tracks || (cs.assignedTrackId ? [{ id: 't1', assignedTrackId: cs.assignedTrackId, assignedTrackName: cs.assignedTrackName, audioZipPath: cs.audioZipPath }] : []);
      for (let ti = 0; ti < scene.tracks.length && ti < csTracks.length; ti++) {
        const track = scene.tracks[ti];
        const ct = csTracks[ti];
        if (!ct || !ct.audioZipPath) continue;
        const audioFile = zip.file(ct.audioZipPath);
        if (audioFile) {
          const arrayBuf = await audioFile.async('arraybuffer');
          const decodedBuffer = await context.decodeAudioData(arrayBuf.slice(0));
          track.buffer = decodedBuffer;
          track.assignedTrackId = track.assignedTrackId || `scene_${scene.id}_${track.id}`;
          const blob = await audioFile.async('blob');
          const namedBlob = new File([blob], track.assignedTrackName || `scene_${scene.id}_${track.id}.audio`, { type: blob.type || 'audio/mpeg' });
          await cacheAudioFile(track.assignedTrackId, namedBlob);
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

      // Validate required top-level fields before touching any app state
      if (!config || typeof config !== 'object') throw new Error('配置文件格式无效');
      if (config.scenes !== undefined && !Array.isArray(config.scenes)) throw new Error('配置文件 scenes 字段格式无效');
      if (config.soundboard !== undefined && !Array.isArray(config.soundboard)) throw new Error('配置文件 soundboard 字段格式无效');

      weddingSchemeName.value = config.schemeName;

      showLoaderOverlay('RESTORING CUE FLOWS', 'Rebuilding wedding cue checklist timeline assignments...');

      if (config.scenes) {
        if (config.version === '3.0' || config.scenes.some(cs => cs.tracks)) {
          // v3.0 with tracks
          scenes = config.scenes.map(cs => ({
            id: cs.id,
            name: cs.name,
            playMode: cs.playMode || 'sequential',
            fadeIn: cs.fadeIn || 2.0,
            fadeOut: cs.fadeOut || 2.0,
            loop: cs.loop || false,
            tracks: (cs.tracks || []).map(t => ({
              id: t.id,
              buffer: null,
              assignedTrackId: t.assignedTrackId || null,
              assignedTrackName: t.assignedTrackName || null,
              startTime: t.startTime || 0,
              endTime: t.endTime || null,
              fadeIn: t.fadeIn || 0,
              fadeOut: t.fadeOut || 0
            }))
          }));
          nextSceneId = Math.max(...scenes.map(s => s.id)) + 1;
        } else if (config.version === '2.0') {
          scenes = config.scenes.map(cs => {
            const tracks = [];
            if (cs.assignedTrackId) {
              tracks.push({
                id: `t${nextTrackId++}`,
                buffer: null,
                assignedTrackId: cs.assignedTrackId,
                assignedTrackName: cs.assignedTrackName || null,
                startTime: cs.startTime || 0,
                endTime: cs.endTime || null,
                fadeIn: 0,
                fadeOut: 0
              });
            }
            return {
              id: cs.id,
              name: cs.name,
              playMode: 'sequential',
              fadeIn: cs.fadeIn || 2.0,
              fadeOut: cs.fadeOut || 2.0,
              loop: cs.loop || false,
              tracks
            };
          });
          nextSceneId = Math.max(...scenes.map(s => s.id)) + 1;
        } else {
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
        for (const track of scene.tracks) {
          if (!track.assignedTrackId) continue;
          try {
            const fileBlob = await getCachedAudioFile(track.assignedTrackId);
            if (fileBlob) {
              const arrayBuf = await fileBlob.arrayBuffer();
              const decodedBuffer = await context.decodeAudioData(arrayBuf.slice(0));
              track.buffer = decodedBuffer;
              if (fileBlob.name) track.assignedTrackName = fileBlob.name;
            }
          } catch (err) {
            console.warn(`场景 ${scene.id} track ${track.id} 缓存音频恢复失败:`, err);
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
              const decodedBuffer = await context.decodeAudioData(arrayBuf.slice(0));
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
      const trackId = `t${nextTrackId++}`;
      const assignedTrackId = `demo_${trackId}`;

      // Encode the synthesized buffer to a WAV Blob and persist it in IndexedDB
      // so the demo tracks survive a page refresh.
      let demoBlob = null;
      try {
        const { encodeWAV } = await import('./wav-encoder.js');
        demoBlob = encodeWAV(demoBuffer);
        const demoFile = new File([demoBlob], `demo_${freq.toFixed(1)}Hz.wav`, { type: 'audio/wav' });
        await cacheAudioFile(assignedTrackId, demoFile);
      } catch (encErr) {
        console.warn('[WedMix] Demo 轨道持久化失败（WAV 编码错误），本次会话内仍可使用:', encErr);
      }

      scene.tracks = [{
        id: trackId,
        buffer: demoBuffer,
        assignedTrackId,
        assignedTrackName: `🔊 系统预置测试配乐 (${freq.toFixed(1)}Hz Loop)`,
        startTime: 0,
        endTime: null,
        fadeIn: 0,
        fadeOut: 0
      }];
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
    if (!config || typeof config !== 'object') return;

    if (config.schemeName) {
      weddingSchemeName.value = config.schemeName;
    }

    if (config.scenes && config.scenes.length > 0) {
      scenes = config.scenes.map(cs => {
        // v3.0 format: has tracks array
        if (cs.tracks && Array.isArray(cs.tracks)) {
          return {
            id: cs.id,
            name: cs.name,
            playMode: cs.playMode || 'sequential',
            fadeIn: cs.fadeIn || 2.0,
            fadeOut: cs.fadeOut || 2.0,
            loop: cs.loop || false,
            tracks: cs.tracks.map(t => ({
              id: t.id,
              buffer: null,
              assignedTrackId: t.assignedTrackId || null,
              assignedTrackName: t.assignedTrackName || null,
              startTime: t.startTime || 0,
              endTime: t.endTime || null,
              fadeIn: t.fadeIn || 0,
              fadeOut: t.fadeOut || 0
            }))
          };
        }
        // Legacy format (v1/v2): scene has single buffer — migrate to tracks array
        const tracks = [];
        if (cs.assignedTrackId) {
          tracks.push({
            id: 't1',
            buffer: null,
            assignedTrackId: cs.assignedTrackId,
            assignedTrackName: cs.assignedTrackName || null,
            startTime: cs.startTime || 0,
            endTime: cs.endTime || null,
            fadeIn: 0,
            fadeOut: 0
          });
        }
        return {
          id: cs.id,
          name: cs.name,
          playMode: 'sequential',
          fadeIn: cs.fadeIn || 2.0,
          fadeOut: cs.fadeOut || 2.0,
          loop: cs.loop || false,
          tracks
        };
      });

      // Ensure unique track IDs
      scenes.forEach(s => {
        s.tracks.forEach(t => {
          if (!t.id || t.id === 't1') {
            t.id = `t${nextTrackId++}`;
          }
        });
      });

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
      try { prev.currentSource?.stop(); prev.currentSource?.disconnect(); prev.currentGain?.disconnect(); prev.sceneGainNode?.disconnect(); } catch(e) {}
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

  nextTrackId = 1;
  scenes = [
    { id: 1, name: "宾客进场暖场", playMode: "sequential", fadeIn: 2.0, fadeOut: 2.0, loop: false, tracks: [] },
    { id: 2, name: "司仪开场致辞", playMode: "sequential", fadeIn: 1.0, fadeOut: 1.5, loop: false, tracks: [] },
    { id: 3, name: "新郎帅气入场", playMode: "sequential", fadeIn: 1.5, fadeOut: 2.0, loop: false, tracks: [] },
    { id: 4, name: "新娘圣洁入场", playMode: "sequential", fadeIn: 2.0, fadeOut: 2.5, loop: false, tracks: [] },
    { id: 5, name: "誓言交换与致辞", playMode: "sequential", fadeIn: 2.5, fadeOut: 2.0, loop: false, tracks: [] },
    { id: 6, name: "信物交换与拥吻", playMode: "sequential", fadeIn: 1.0, fadeOut: 2.0, loop: false, tracks: [] },
    { id: 7, name: "礼成退场欢庆", playMode: "sequential", fadeIn: 1.0, fadeOut: 2.5, loop: false, tracks: [] },
    { id: 8, name: "宴会背景与敬酒", playMode: "sequential", fadeIn: 2.5, fadeOut: 2.5, loop: false, tracks: [] }
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
  btnLivePlayPause.innerHTML = BTN_PLAY_HTML();
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
