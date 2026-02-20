/**
 * AudioWorklet processor code - served as a static file and loaded
 * in the renderer process to convert MediaStream audio to PCM chunks.
 *
 * This string is injected into a Blob URL at runtime.
 */
export const AUDIO_WORKLET_CODE = `
class SyagAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._bufferSize = 4096;
    this._buffer = new Float32Array(this._bufferSize);
    this._writeIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;

    const channelData = input[0];
    if (!channelData) return true;

    for (let i = 0; i < channelData.length; i++) {
      this._buffer[this._writeIndex++] = channelData[i];
      if (this._writeIndex >= this._bufferSize) {
        this.port.postMessage({
          type: 'audio-chunk',
          pcm: this._buffer.slice()
        });
        this._writeIndex = 0;
      }
    }

    return true;
  }
}

registerProcessor('syag-audio-processor', SyagAudioProcessor);
`

/**
 * Resample audio from one sample rate to another (simple linear interpolation).
 * Used in main process when we need to convert captured audio to 16kHz for Whisper.
 */
export function resampleAudio(
  input: Float32Array,
  fromRate: number,
  toRate: number
): Float32Array {
  if (fromRate === toRate) return input

  const ratio = fromRate / toRate
  const outputLength = Math.round(input.length / ratio)
  const output = new Float32Array(outputLength)

  for (let i = 0; i < outputLength; i++) {
    const srcIndex = i * ratio
    const srcFloor = Math.floor(srcIndex)
    const srcCeil = Math.min(srcFloor + 1, input.length - 1)
    const frac = srcIndex - srcFloor
    output[i] = input[srcFloor] * (1 - frac) + input[srcCeil] * frac
  }

  return output
}

/**
 * Mix multiple audio channels (e.g., system audio + mic) into a single mono channel.
 */
export function mixAudioStreams(...streams: Float32Array[]): Float32Array {
  if (streams.length === 0) return new Float32Array(0)
  if (streams.length === 1) return streams[0]

  const maxLength = Math.max(...streams.map(s => s.length))
  const mixed = new Float32Array(maxLength)

  for (let i = 0; i < maxLength; i++) {
    let sum = 0
    let count = 0
    for (const stream of streams) {
      if (i < stream.length) {
        sum += stream[i]
        count++
      }
    }
    mixed[i] = count > 0 ? sum / count : 0
  }

  return mixed
}
