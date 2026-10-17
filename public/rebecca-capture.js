class RebeccaCapture extends AudioWorkletProcessor {
  constructor() {
    super()
    this.samples = []
    this.position = 0
    this.output = []
  }

  process(inputs) {
    const input = inputs[0]?.[0]
    if (!input) return true
    this.samples.push(...input)
    const ratio = sampleRate / 24000
    while (this.position + 1 < this.samples.length) {
      const index = Math.floor(this.position)
      const fraction = this.position - index
      const value = this.samples[index] * (1 - fraction) + this.samples[index + 1] * fraction
      this.output.push(Math.round(Math.max(-1, Math.min(1, value)) * (value < 0 ? 32768 : 32767)))
      this.position += ratio
      if (this.output.length === 2400) {
        const pcm = new ArrayBuffer(4800)
        const view = new DataView(pcm)
        this.output.forEach((sample, sampleIndex) => view.setInt16(sampleIndex * 2, sample, true))
        this.port.postMessage(pcm, [pcm])
        this.output = []
      }
    }
    const consumed = Math.floor(this.position)
    this.samples.splice(0, consumed)
    this.position -= consumed
    return true
  }
}

registerProcessor('rebecca-capture', RebeccaCapture)
