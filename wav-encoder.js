/**
 * WaveCraft WAV Audio Encoder Module
 * Encodes a standard Web Audio API AudioBuffer into a high-fidelity 16-bit PCM WAV Blob.
 */

export function encodeWAV(audioBuffer) {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const format = 1; // 1 = Raw PCM (uncompressed)
  const bitDepth = 16;
  
  // Interleave channels if stereo; use single channel if mono
  let samples;
  if (numChannels === 2) {
    samples = interleave(audioBuffer.getChannelData(0), audioBuffer.getChannelData(1));
  } else if (numChannels === 1) {
    samples = audioBuffer.getChannelData(0);
  } else {
    // If more than 2 channels, downmix to stereo
    samples = downmixToStereo(audioBuffer);
  }
  
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  
  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* file length (36 + data size) */
  view.setUint32(4, 36 + samples.length * 2, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (1 = PCM) */
  view.setUint16(20, format, true);
  /* channel count (capped/mapped to stereo/mono) */
  view.setUint16(22, Math.min(numChannels, 2), true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * Math.min(numChannels, 2) * (bitDepth / 8), true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, Math.min(numChannels, 2) * (bitDepth / 8), true);
  /* bits per sample */
  view.setUint16(34, bitDepth, true);
  
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, samples.length * 2, true);
  
  /* write PCM samples */
  floatTo16BitPCM(view, 44, samples);
  
  return new Blob([view], { type: 'audio/wav' });
}

function interleave(inputL, inputR) {
  const length = inputL.length + inputR.length;
  const result = new Float32Array(length);
  let index = 0;
  let inputIndex = 0;
  
  while (index < length) {
    result[index++] = inputL[inputIndex];
    result[index++] = inputR[inputIndex];
    inputIndex++;
  }
  return result;
}

function downmixToStereo(audioBuffer) {
  const inputL = audioBuffer.getChannelData(0);
  const inputR = audioBuffer.getChannelData(1);
  const length = inputL.length + inputR.length;
  const result = new Float32Array(length);
  
  let index = 0;
  let inputIndex = 0;
  while (index < length) {
    result[index++] = inputL[inputIndex];
    result[index++] = inputR[inputIndex];
    inputIndex++;
  }
  return result;
}

function floatTo16BitPCM(output, offset, input) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, input[i]));
    // Scale to 16-bit signed integer range (-32768 to 32767)
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
