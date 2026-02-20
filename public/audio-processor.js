/**
 * AudioWorklet processor: captures mic (channel 0) and system (channel 1) separately
 * for "You" vs "Others" diarization. Sends chunks with channel index.
 */
class SyagAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this._bufferSize = 4096
    this._buffers = [new Float32Array(this._bufferSize), new Float32Array(this._bufferSize)]
    this._writeIndex = [0, 0]
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

    for (let ch = 0; ch < Math.min(2, input.length); ch++) {
      const channelData = input[ch]
      if (!channelData) continue

      const buf = this._buffers[ch]
      let wi = this._writeIndex[ch]
      for (let i = 0; i < channelData.length; i++) {
        buf[wi++] = channelData[i]
        if (wi >= this._bufferSize) {
          this.port.postMessage({
            type: 'audio-chunk',
            pcm: buf.slice(),
            channel: ch
          })
          wi = 0
        }
      }
      this._writeIndex[ch] = wi
    }

    return true
  }
}

registerProcessor('syag-audio-processor', SyagAudioProcessor)
