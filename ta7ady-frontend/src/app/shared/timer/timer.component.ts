import { Component, input, OnDestroy, OnInit, signal, computed } from '@angular/core';

// Reusable referee timer: dev-configured default, referee controls it.
// Single icon-only toggle (start/pause) + icon-only reset. Soft beep on timeout.
@Component({
  selector: 'app-timer',
  standalone: true,
  templateUrl: './timer.component.html',
  styleUrl: './timer.component.scss',
})
export class TimerComponent implements OnInit, OnDestroy {
  readonly defaultSeconds = input(30);
  readonly label = input('');
  readonly remaining = signal(30);
  readonly running = signal(false);
  readonly expired = signal(false);
  readonly fraction = computed(() =>
    this.defaultSeconds() > 0 ? this.remaining() / this.defaultSeconds() : 0,
  );
  private id: ReturnType<typeof setInterval> | null = null;
  private ctx: AudioContext | null = null;

  constructor() {}

  ngOnInit(): void {
    // Bound inputs are only available here, not in the constructor —
    // reading defaultSeconds() earlier silently falls back to 30.
    this.remaining.set(this.defaultSeconds());
  }

  ngOnDestroy(): void {
    this.stopTick();
  }

  toggle(): void {
    if (this.running()) this.stopTick();
    else this.start();
  }

  start(): void {
    if (this.running()) return;
    if (this.remaining() <= 0) {
      this.remaining.set(this.defaultSeconds());
      this.expired.set(false);
    }
    this.running.set(true);
    this.id = setInterval(() => {
      this.remaining.update((v) => v - 1);
      if (this.remaining() <= 0) {
        this.remaining.set(0);
        this.stopTick();
        this.expired.set(true);
        this.beep();
      }
    }, 1000);
  }

  reset(): void {
    this.stopTick();
    this.remaining.set(this.defaultSeconds());
    this.expired.set(false);
  }

  private stopTick(): void {
    if (this.id) clearInterval(this.id);
    this.id = null;
    this.running.set(false);
  }

  private beep(): void {
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx ??= new AC();
      const now = this.ctx.currentTime;
      [523.25, 392].forEach((freq, i) => {
        const o = this.ctx!.createOscillator();
        const g = this.ctx!.createGain();
        o.connect(g);
        g.connect(this.ctx!.destination);
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, now + i * 0.22);
        g.gain.exponentialRampToValueAtTime(0.14, now + i * 0.22 + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.22 + 0.2);
        o.start(now + i * 0.22);
        o.stop(now + i * 0.22 + 0.22);
      });
    } catch {
      /* audio unavailable: ignore */
    }
  }
}
