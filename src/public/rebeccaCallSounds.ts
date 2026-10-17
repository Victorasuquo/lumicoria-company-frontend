export function playCallSound(context: AudioContext, event: 'connected' | 'ended'): number {
  if (context.state !== 'running') return 0
  const frequencies = event === 'connected' ? [660, 880] : [550, 370]
  const spacing = .09
  const noteDuration = .14
  const start = context.currentTime + .01

  frequencies.forEach((frequency, index) => {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const time = start + index * spacing
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(frequency, time)
    gain.gain.setValueAtTime(0, time)
    gain.gain.linearRampToValueAtTime(.075, time + .015)
    gain.gain.exponentialRampToValueAtTime(.0001, time + noteDuration)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect() }
    oscillator.start(time)
    oscillator.stop(time + noteDuration + .01)
  })

  return .01 + spacing + noteDuration + .03
}
