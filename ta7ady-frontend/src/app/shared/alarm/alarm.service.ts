import { Injectable, inject } from '@angular/core';
import { SettingsService, type AlarmSoundId } from '../settings/settings.service';

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
      case 'chime':
        return [523, 659, 784];
      case 'buzzer':
        return [196, 196, 196];
      case 'classic':
      default:
        return [660, 520, 660];
    }
  }

  waveFor(id: AlarmSoundId): OscillatorType {
    return id === 'buzzer' ? 'square' : 'sine';
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
      notes.forEach((freq, i) => {
        const t = now + i * 0.28;
        const o = this.ctx!.createOscillator();
        const g = this.ctx!.createGain();
        o.connect(g);
        g.connect(this.ctx!.destination);
        o.type = wave;
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), t + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
        o.start(t);
        o.stop(t + 0.27);
      });
    } catch {
      /* audio unavailable: ignore */
    }
  }
}
