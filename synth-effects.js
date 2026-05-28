/**
 * WedMix Live Synthesized Soundboard Engine
 * Synthesizes high-quality sound effects dynamically on-the-fly using Web Audio API nodes.
 * Guarantees 100% offline reliability for live environments.
 */

/**
 * Triggers a pre-designed synthesized sound effect.
 * @param {string} effectName Name of the effect
 * @param {AudioContext} audioCtx Active AudioContext
 * @param {AudioNode} destination Node to connect the synth output to (e.g. Master Gain)
 */
export function triggerSynthEffect(effectName, audioCtx, destination) {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const now = audioCtx.currentTime;

  switch (effectName) {
    case 'bell':
      playCathedralBell(audioCtx, destination, now);
      break;
    case 'pad':
      playRomanticPad(audioCtx, destination, now);
      break;
    case 'fanfare':
      playToastFanfare(audioCtx, destination, now);
      break;
    case 'suspense':
      playSuspenseSweep(audioCtx, destination, now);
      break;
    default:
      console.warn(`未知的合成音效: ${effectName}`);
  }
}

/**
 * 1. 庄严教堂钟声 (Cathedral Bell)
 * Utilizes additive FM-like synthesis with metallic ratios.
 */
function playCathedralBell(audioCtx, destination, startTime) {
  const frequencies = [200, 300, 410, 520, 650, 770];
  const decays = [4.0, 3.2, 2.5, 2.0, 1.5, 1.0];
  const gains = [0.4, 0.3, 0.2, 0.15, 0.1, 0.05];

  const mainGain = audioCtx.createGain();
  mainGain.connect(destination);
  mainGain.gain.setValueAtTime(0, startTime);
  mainGain.gain.linearRampToValueAtTime(0.8, startTime + 0.01);
  mainGain.gain.exponentialRampToValueAtTime(0.001, startTime + 5.0);

  frequencies.forEach((freq, index) => {
    const osc = audioCtx.createOscillator();
    const bandGain = audioCtx.createGain();
    
    // Mix of sine waves to construct metallic bell timbre
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);
    
    // Add subtle frequency modulation vibrato
    osc.frequency.linearRampToValueAtTime(freq * 0.99, startTime + decays[index]);

    bandGain.gain.setValueAtTime(gains[index], startTime);
    bandGain.gain.exponentialRampToValueAtTime(0.001, startTime + decays[index]);

    osc.connect(bandGain);
    bandGain.connect(mainGain);
    
    osc.start(startTime);
    osc.stop(startTime + decays[index] + 0.5);
  });
}

/**
 * 2. 浪漫温暖背景音垫 (Romantic Warm Pad)
 * Utilizes dual detuned triangle waves filtered with slow attack/decay.
 */
function playRomanticPad(audioCtx, destination, startTime) {
  const rootFreq = 261.63; // C4
  const chords = [1.0, 1.25, 1.5, 1.875]; // Major 7th chord intervals: C4, E4, G4, B4
  
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(200, startTime);
  filter.frequency.exponentialRampToValueAtTime(800, startTime + 1.5);
  filter.frequency.exponentialRampToValueAtTime(300, startTime + 4.5);
  filter.Q.setValueAtTime(3, startTime);

  const mainGain = audioCtx.createGain();
  mainGain.connect(destination);
  mainGain.gain.setValueAtTime(0, startTime);
  mainGain.gain.linearRampToValueAtTime(0.6, startTime + 1.2); // Slow Attack
  mainGain.gain.setValueAtTime(0.6, startTime + 3.5);
  mainGain.gain.exponentialRampToValueAtTime(0.001, startTime + 6.0); // Slow Release

  // Sub-bass root note for warmth
  const subOsc = audioCtx.createOscillator();
  const subGain = audioCtx.createGain();
  subOsc.type = 'sine';
  subOsc.frequency.setValueAtTime(rootFreq / 2, startTime);
  subGain.gain.setValueAtTime(0.3, startTime);
  subGain.gain.exponentialRampToValueAtTime(0.001, startTime + 5.5);
  subOsc.connect(subGain);
  subGain.connect(mainGain);
  subOsc.start(startTime);
  subOsc.stop(startTime + 6.0);

  // Play chord pitches
  chords.forEach((interval) => {
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const voiceGain = audioCtx.createGain();

    osc1.type = 'triangle';
    osc2.type = 'triangle';

    // Detune voices for lush chorus effect
    osc1.frequency.setValueAtTime(rootFreq * interval - 1.5, startTime);
    osc2.frequency.setValueAtTime(rootFreq * interval + 1.5, startTime);

    voiceGain.gain.setValueAtTime(0.12, startTime);
    voiceGain.gain.exponentialRampToValueAtTime(0.001, startTime + 5.0);

    osc1.connect(voiceGain);
    osc2.connect(voiceGain);
    voiceGain.connect(filter);

    osc1.start(startTime);
    osc2.start(startTime);
    
    osc1.stop(startTime + 6.0);
    osc2.stop(startTime + 6.0);
  });

  filter.connect(mainGain);
}

/**
 * 3. 现场庆典皇家祝酒礼乐 (Celebration Brass Fanfare)
 * Utilizes sweep-filtered sawtooth waves to emulate a grand brass fanfare.
 */
function playToastFanfare(audioCtx, destination, startTime) {
  const notes = [196.00, 261.63, 329.63, 392.00, 523.25]; // G3, C4, E4, G4, C5 (Grand C Major chord)
  const duration = 3.5;

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(100, startTime);
  // Fast filter envelope sweep for brass 'plink'
  filter.frequency.exponentialRampToValueAtTime(4500, startTime + 0.15);
  filter.frequency.exponentialRampToValueAtTime(1200, startTime + duration);
  filter.Q.setValueAtTime(2, startTime);

  const mainGain = audioCtx.createGain();
  mainGain.connect(destination);
  mainGain.gain.setValueAtTime(0, startTime);
  mainGain.gain.linearRampToValueAtTime(0.7, startTime + 0.05); // Rapid Attack
  mainGain.gain.setValueAtTime(0.7, startTime + duration - 0.8);
  mainGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration); // Fast decay at end

  notes.forEach((freq, idx) => {
    const osc = audioCtx.createOscillator();
    const voiceGain = audioCtx.createGain();

    osc.type = 'sawtooth';
    // Arpeggiate slightly for extra grand entrance feel
    const noteStart = startTime + idx * 0.06;
    osc.frequency.setValueAtTime(freq, noteStart);

    voiceGain.gain.setValueAtTime(0.12, noteStart);
    voiceGain.gain.exponentialRampToValueAtTime(0.001, noteStart + duration);

    osc.connect(voiceGain);
    voiceGain.connect(filter);

    osc.start(noteStart);
    osc.stop(noteStart + duration + 0.5);
  });

  filter.connect(mainGain);
}

/**
 * 4. 现场悬念/开场定场音效 (Suspense Drumroll & Pitch Sweep)
 * emulates a dramatic transition/drumroll utilizing low-pass filtered noise and sweep.
 */
function playSuspenseSweep(audioCtx, destination, startTime) {
  const duration = 4.0;
  
  // 1. Synthesize Sweep Oscillator
  const osc = audioCtx.createOscillator();
  const oscGain = audioCtx.createGain();
  
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(60, startTime);
  // Huge dramatic upward sweep in frequency
  osc.frequency.exponentialRampToValueAtTime(650, startTime + duration - 0.5);
  
  oscGain.gain.setValueAtTime(0, startTime);
  oscGain.gain.linearRampToValueAtTime(0.4, startTime + duration - 1.0);
  oscGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  
  // 2. Synthesize Filter
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(200, startTime);
  filter.frequency.exponentialRampToValueAtTime(2200, startTime + duration - 0.5);
  filter.Q.setValueAtTime(5, startTime);

  osc.connect(filter);
  filter.connect(oscGain);
  oscGain.connect(destination);
  
  osc.start(startTime);
  osc.stop(startTime + duration + 0.5);

  // 3. Create White Noise for a rising swell effect
  const bufferSize = audioCtx.sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  
  // Fill buffer with random white noise
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  
  const noiseSource = audioCtx.createBufferSource();
  noiseSource.buffer = buffer;
  
  const noiseFilter = audioCtx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.setValueAtTime(150, startTime);
  noiseFilter.frequency.exponentialRampToValueAtTime(1800, startTime + duration);
  noiseFilter.Q.setValueAtTime(1.5, startTime);
  
  const noiseGain = audioCtx.createGain();
  noiseGain.gain.setValueAtTime(0, startTime);
  noiseGain.gain.linearRampToValueAtTime(0.35, startTime + duration - 0.5);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  
  noiseSource.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(destination);
  
  noiseSource.start(startTime);
  noiseSource.stop(startTime + duration);
}
