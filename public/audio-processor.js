/**
 * AudioWorklet processor for capturing audio from MediaStreams.
 * Collects PCM samples and sends them to the main thread in chunks.
 */
class SyagAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this._bufferSize = 4096
    this._buffer = new Float32Array(this._bufferSize)
    this._writeIndex = 0
    this._active = true

    this.port.onmessage = (event) => {
      if (event.data.type === 'stop') {
        this._active = false
      }
    }
  }

  process(inputs) {
    if (!this._active) return false

    const input = inputs[0]
    if (!input || input.length === 0) return true

    const channelData = input[0]
    if (!channelData) return true

    for (let i = 0; i < channelData.length; i++) {
      this._buffer[this._writeIndex++] = channelData[i]
      if (this._writeIndex >= this._bufferSize) {
        this.port.postMessage({
          type: 'audio-chunk',
          pcm: this._buffer.slice()
        })
        this._writeIndex = 0
      }
    }

    return true
  }
}

registerProcessor('syag-audio-processor', SyagAudioProcessor)
