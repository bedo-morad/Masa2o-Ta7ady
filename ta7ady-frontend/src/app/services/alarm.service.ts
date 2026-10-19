import { Injectable, inject } from '@angular/core';
import { SettingsService, type AlarmSoundId } from './settings.service';

// Web Audio referee alarm, synthesized — no audio assets.
// Every note uses exponential ramps so there are no clicks.
@Injectable({ providedIn: 'root' })
export class AlarmService {
  private settings = inject(SettingsService);
  private ctx: AudioContext | null = null;

  // 0 = mute. Peak gain for a 0–10 volume step.
  gainFor(volume: number): number {
    if (!Number.isFinite(volume) || volume <= 0) return 0;
    return 0.06 + (Math.min(10, volume) / 10) * 0.44;
  }

  patternFor(id: AlarmSoundId): number[] {
    switch (id) {
      case 'triplet':
        // Rising triplet: bright E5 → G5 → C6 major lift, quick and cheery.
        return [659.25, 783.99, 1046.5];
      case 'gong':
        // Soft double-gong: two low warm strikes (A3 → C#4) with a long tail.
        return [220, 277.18];
      case 'classic':
      default:
        return [660, 520, 660];
    }
  }

  waveFor(_id: AlarmSoundId): OscillatorType {
    // All sine: loud enough across a room at full volume, never harsh.
    return 'sine';
  }

  // Per-sound pacing: the gong needs room to ring, the triplet stays snappy.
  timingFor(id: AlarmSoundId): { step: number; dur: number } {
    switch (id) {
      case 'gong':
        return { step: 0.55, dur: 1.1 };
      case 'triplet':
        return { step: 0.22, dur: 0.25 };
      case 'classic':
      default:
        return { step: 0.28, dur: 0.25 };
    }
  }

  play(): void {
    const volume = this.settings.alarmVolume();
    if (volume <= 0) return;
    const peak = this.gainFor(volume);
    const sound = this.settings.alarmSoundId();
    const notes = this.patternFor(sound);
    const wave = this.waveFor(sound);
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx ??= new AC();
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      const now = this.ctx.currentTime;
      const { step, dur } = this.timingFor(sound);
      notes.forEach((freq, i) => {
        const t = now + i * step;
        const o = this.ctx!.createOscillator();
        const g = this.ctx!.createGain();
        o.connect(g);
        g.connect(this.ctx!.destination);
        o.type = wave;
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), t + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.start(t);
        o.stop(t + dur + 0.02);
      });
    } catch {
      /* audio unavailable: ignore */
    }
  }
}
