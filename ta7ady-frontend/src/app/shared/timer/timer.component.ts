import { Component, computed, inject, input, OnDestroy, OnInit, signal } from '@angular/core';
import { SettingsService, type TimerKey } from '../settings/settings.service';
import { AlarmService } from '../alarm/alarm.service';

// Reusable referee timer: dev-configured default, referee controls it.
// Single icon-only toggle (start/pause) + icon-only reset. Timeout alarm
// plays through AlarmService (referee's chosen sound + volume).
// When timerKey is set, the referee's settings override wins over defaultSeconds.
@Component({
  selector: 'app-timer',
  standalone: true,
  templateUrl: './timer.component.html',
  styleUrl: './timer.component.scss',
})
export class TimerComponent implements OnInit, OnDestroy {
  readonly defaultSeconds = input(30);
  readonly timerKey = input<TimerKey | null>(null);
  readonly label = input('');
  private settings = inject(SettingsService);
  private alarm = inject(AlarmService);
  readonly total = computed(() => {
    const key = this.timerKey();
    return key ? this.settings.timerSeconds(key, this.defaultSeconds()) : this.defaultSeconds();
  });
  readonly remaining = signal(30);
  readonly running = signal(false);
  readonly expired = signal(false);
  readonly fraction = computed(() => (this.total() > 0 ? this.remaining() / this.total() : 0));
  private id: ReturnType<typeof setInterval> | null = null;

  constructor() {}

  ngOnInit(): void {
    // Bound inputs are only available here, not in the constructor —
    // reading defaultSeconds() earlier silently falls back to 30.
    this.remaining.set(this.total());
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
      this.remaining.set(this.total());
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
    this.remaining.set(this.total());
    this.expired.set(false);
  }

  private stopTick(): void {
    if (this.id) clearInterval(this.id);
    this.id = null;
    this.running.set(false);
  }

  private beep(): void {
    this.alarm.play();
  }
}
