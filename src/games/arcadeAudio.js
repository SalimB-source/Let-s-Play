const BPM = 116;
const NOTES = [55, 55, 82.4, 73.4, 55, 65.4, 82.4, 98, 55, 55, 82.4, 73.4, 65.4, 73.4, 98, 82.4];
const HOOK = [659.3, 0, 784, 0, 987.8, 880, 0, 784, 659.3, 0, 587.3, 659.3, 0, 784, 880, 0];

/** An original, lightweight Web Audio desert-funk loop (no external track). */
export class DesertGroove {
  constructor() {
    this.context = null;
    this.master = null;
    this.timer = null;
    this.step = 0;
    this.nextTime = 0;
    this.running = false;
  }

  async start() {
    if (this.running) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.context ||= new AudioContext();
    await this.context.resume();
    if (!this.master) {
      this.master = this.context.createGain();
      this.master.gain.value = 0.17;
      this.master.connect(this.context.destination);
    }
    this.running = true;
    this.nextTime = this.context.currentTime + 0.06;
    this.timer = window.setInterval(() => this.schedule(), 35);
  }

  schedule() {
    if (!this.context || !this.running) return;
    const stepLength = 60 / BPM / 4;
    while (this.nextTime < this.context.currentTime + 0.12) {
      this.playStep(this.step % 16, this.nextTime);
      this.step += 1;
      this.nextTime += stepLength;
    }
  }

  tone(frequency, time, duration, type, volume, filterFrequency = null) {
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, time);
    if (filterFrequency) {
      const filter = this.context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(filterFrequency, time);
      oscillator.connect(filter);
      filter.connect(gain);
    } else oscillator.connect(gain);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    gain.connect(this.master);
    oscillator.start(time);
    oscillator.stop(time + duration + 0.025);
  }

  noise(time, duration, volume, highpass = 5000) {
    const length = Math.ceil(this.context.sampleRate * duration);
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    source.buffer = buffer;
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(highpass, time);
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start(time);
    source.stop(time + duration);
  }

  playStep(step, time) {
    const beat = 60 / BPM;
    if ([0, 6, 8, 14].includes(step)) {
      this.tone(110, time, 0.18, 'sine', 0.34);
      this.tone(55, time + 0.035, 0.16, 'sine', 0.2);
    }
    if ([4, 12].includes(step)) {
      this.noise(time, 0.11, 0.11, 1100);
      this.tone(185, time, 0.085, 'triangle', 0.12);
    }
    if ([2, 6, 10, 14].includes(step)) this.noise(time, 0.045, 0.045, 7000);
    if ([0, 3, 6, 8, 11, 14].includes(step)) {
      this.tone(NOTES[step], time, beat * 0.34, 'sawtooth', 0.105, 420);
    }
    const hook = HOOK[step];
    if (hook) this.tone(hook, time, beat * 0.32, 'square', 0.035, 1700);
  }

  stop() {
    this.running = false;
    if (this.timer) window.clearInterval(this.timer);
    this.timer = null;
    if (this.context?.state === 'running') this.context.suspend();
  }

  destroy() {
    this.stop();
    if (this.context) this.context.close();
    this.context = null;
    this.master = null;
  }
}
