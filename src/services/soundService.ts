/**
 * Sound Service using Web Audio API
 * Generates gentle, warm notification chimes for nearby help opportunities.
 */

class SoundService {
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const storedMute = localStorage.getItem('humanmap_sound_muted');
      if (storedMute === 'true') {
        this.isMuted = true;
      }
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    try {
      localStorage.setItem('humanmap_sound_muted', muted ? 'true' : 'false');
    } catch {
      // ignore
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Plays a gentle, pleasant marimba/celesta three-note chord for nearby help opportunities.
   * Frequencies: C6 (1046.5Hz) -> E6 (1318.5Hz) -> G6 (1567.9Hz) -> C7 (2093.0Hz)
   */
  public playHelpOpportunityChime(): void {
    if (this.isMuted) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Chord notes (gentle harmonics)
      const notes = [
        { freq: 659.25, time: 0, duration: 0.8, gain: 0.12 },    // E5
        { freq: 987.77, time: 0.08, duration: 0.9, gain: 0.14 }, // B5
        { freq: 1318.51, time: 0.16, duration: 1.1, gain: 0.15 }, // E6
        { freq: 1975.53, time: 0.24, duration: 1.2, gain: 0.10 }, // B6
      ];

      notes.forEach(({ freq, time, duration, gain }) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        // Soft sine wave blended with gentle triangle for warm bell tone
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + time);

        // Natural exponential decay envelope
        gainNode.gain.setValueAtTime(0.001, now + time);
        gainNode.gain.linearRampToValueAtTime(gain, now + time + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + time + duration);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(now + time);
        osc.stop(now + time + duration + 0.1);
      });
    } catch (e) {
      console.warn('Could not play notification sound:', e);
    }
  }
}

export const soundService = new SoundService();
