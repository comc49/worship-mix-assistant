/**
 * Plays a short loop through the browser's audio engine, and can swap the loop for a newly
 * processed one without losing its place, so a slider change is heard at once.
 * This is the only file in the lab that touches the Web Audio API.
 */

const CROSSFADE_SECONDS = 0.03;

interface PlayingLoop {
  source: AudioBufferSourceNode;
  gain: GainNode;
}

export class LoopPlayer {
  private context: AudioContext | null = null;
  private current: PlayingLoop | null = null;
  private startedAt = 0;
  private durationSeconds = 0;

  static isSupported(): boolean {
    return typeof AudioContext !== 'undefined';
  }

  get isPlaying(): boolean {
    return this.current !== null;
  }

  /** Starts the loop from the beginning. Must be called from a click, or the browser refuses to play. */
  async play(samples: Float32Array, sampleRate: number): Promise<void> {
    if (!LoopPlayer.isSupported()) {
      return;
    }
    if (this.context === null) {
      this.context = new AudioContext();
    }
    await this.context.resume();
    this.stop();

    this.durationSeconds = samples.length / sampleRate;
    this.startedAt = this.context.currentTime;
    this.current = this.startLoop(this.context, samples, sampleRate, 0);
  }

  /** Replaces what is playing with new samples, at the same place in the loop. */
  replace(samples: Float32Array, sampleRate: number): void {
    const context = this.context;
    const previous = this.current;
    if (context === null || previous === null) {
      return;
    }
    const newDurationSeconds = samples.length / sampleRate;
    const sameLength = Math.abs(newDurationSeconds - this.durationSeconds) < 0.001;
    // Same length: the same sound with different settings, so keep the place.
    // Different length: a different sound, so start it from the beginning.
    const offset = sameLength ? (this.positionSeconds() ?? 0) : 0;
    if (!sameLength) {
      this.durationSeconds = newDurationSeconds;
      this.startedAt = context.currentTime;
    }
    this.current = this.startLoop(context, samples, sampleRate, offset);
    this.fadeOutAndStop(context, previous);
  }

  stop(): void {
    if (this.context === null || this.current === null) {
      return;
    }
    this.fadeOutAndStop(this.context, this.current);
    this.current = null;
  }

  /** Where in the loop playback is, in seconds. null when stopped. */
  positionSeconds(): number | null {
    if (this.context === null || this.current === null || this.durationSeconds === 0) {
      return null;
    }
    const elapsed = this.context.currentTime - this.startedAt;
    return elapsed % this.durationSeconds;
  }

  async close(): Promise<void> {
    this.stop();
    if (this.context !== null) {
      await this.context.close();
      this.context = null;
    }
  }

  private startLoop(context: AudioContext, samples: Float32Array, sampleRate: number, offsetSeconds: number): PlayingLoop {
    const buffer = context.createBuffer(1, samples.length, sampleRate);
    buffer.copyToChannel(new Float32Array(samples), 0);

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const gain = context.createGain();
    gain.gain.setValueAtTime(0, context.currentTime);
    gain.gain.linearRampToValueAtTime(1, context.currentTime + CROSSFADE_SECONDS);

    source.connect(gain);
    gain.connect(context.destination);
    source.start(0, offsetSeconds);
    return { source, gain };
  }

  private fadeOutAndStop(context: AudioContext, loop: PlayingLoop): void {
    const now = context.currentTime;
    loop.gain.gain.cancelScheduledValues(now);
    loop.gain.gain.setValueAtTime(loop.gain.gain.value, now);
    loop.gain.gain.linearRampToValueAtTime(0, now + CROSSFADE_SECONDS);
    loop.source.stop(now + CROSSFADE_SECONDS + 0.01);
  }
}
