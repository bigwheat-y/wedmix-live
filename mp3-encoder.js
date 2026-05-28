/**
 * WaveCraft MP3 Audio Encoder Module
 * Dynamically loads lamejs and encodes standard Web Audio AudioBuffers into MP3 Blobs client-side.
 */

let lamejsPromise = null;

/**
 * Loads the lamejs library from CDN dynamically.
 */
function loadLamejs() {
  if (lamejsPromise) return lamejsPromise;
  
  lamejsPromise = new Promise((resolve, reject) => {
    // Check if already loaded globally
    if (window.lamejs) {
      resolve(window.lamejs);
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/lamejs/1.2.1/lame.all.min.js';
    script.onload = () => {
      if (window.lamejs) {
        resolve(window.lamejs);
      } else {
        reject(new Error('lamejs 载入失败：命名空间不存在'));
      }
    };
    script.onerror = () => {
      reject(new Error('无法从 CDN 加载 lamejs，请检查您的网络连接是否正常。'));
    };
    document.head.appendChild(script);
  });
  
  return lamejsPromise;
}

/**
 * Encodes an AudioBuffer into an MP3 Blob.
 * Supports progress callback for rendering feedback.
 */
export async function encodeMP3(audioBuffer, bitrate = 128, onProgress = null) {
  const lamejs = await loadLamejs();
  
  const numChannels = Math.min(audioBuffer.numberOfChannels, 2);
  const sampleRate = audioBuffer.sampleRate;
  
  // Create Lamejs Mp3Encoder
  const mp3encoder = new lamejs.Mp3Encoder(numChannels, sampleRate, bitrate);
  const mp3Data = [];
  
  // Extract channel float data and convert to 16-bit PCM arrays
  const leftFloat = audioBuffer.getChannelData(0);
  const leftPCM = convertFloat32ToInt16(leftFloat);
  
  let rightPCM = null;
  if (numChannels === 2) {
    const rightFloat = audioBuffer.getChannelData(1);
    rightPCM = convertFloat32ToInt16(rightFloat);
  }
  
  const sampleBlockSize = 1152; // LAME standard audio frames block size
  const totalSamples = leftPCM.length;
  
  let processed = 0;
  
  // Process block-by-block
  for (let i = 0; i < totalSamples; i += sampleBlockSize) {
    const leftChunk = leftPCM.subarray(i, i + sampleBlockSize);
    let mp3buf;
    
    if (numChannels === 2) {
      const rightChunk = rightPCM.subarray(i, i + sampleBlockSize);
      mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
    } else {
      mp3buf = mp3encoder.encodeBuffer(leftChunk);
    }
    
    if (mp3buf.length > 0) {
      mp3Data.push(new Int8Array(mp3buf));
    }
    
    processed += leftChunk.length;
    if (onProgress) {
      const percent = Math.round((processed / totalSamples) * 100);
      onProgress(percent);
    }
  }
  
  // Flush encoder internal buffer
  const mp3buf = mp3encoder.flush();
  if (mp3buf.length > 0) {
    mp3Data.push(new Int8Array(mp3buf));
  }
  
  return new Blob(mp3Data, { type: 'audio/mp3' });
}

/**
 * Converts Float32Array into Int16Array PCM format.
 */
function convertFloat32ToInt16(float32Array) {
  const len = float32Array.length;
  const buffer = new Int16Array(len);
  
  for (let i = 0; i < len; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    // Scale float (-1.0 to 1.0) to short integer range (-32768 to 32767)
    buffer[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  
  return buffer;
}
