import { Component, inject, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SettingsService, type AlarmSoundId, type TimerKey } from './settings.service';
import { AlarmService } from '../alarm/alarm.service';
import type { Theme } from '../../theme.service';

// Quiet grouped referee settings modal. Everything auto-saves on change.
@Component({
  selector: 'app-settings-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './settings-modal.component.html',
  styleUrl: './settings-modal.component.scss',
})
export class SettingsModalComponent {
  protected settings = inject(SettingsService);
  private alarm = inject(AlarmService);

  readonly closed = output<void>();

  readonly sounds: { id: AlarmSoundId; label: string }[] = [
    { id: 'classic', label: 'كلاسيكي' },
    { id: 'chime', label: 'رنين' },
    { id: 'buzzer', label: 'صفارة' },
  ];

  readonly themes: { id: Theme; label: string }[] = [
    { id: 'night', label: 'ليلي' },
    { id: 'lapis', label: 'لازورد' },
    { id: 'sand', label: 'رملي' },
  ];

  readonly timerFields: { key: TimerKey; label: string }[] = [
    { key: 'password', label: 'الباسورد' },
    { key: 'acting', label: 'التمثيل' },
    { key: 'actingSteal', label: 'خطف التمثيل' },
    { key: 'ihbid', label: 'اهبد صح' },
    { key: 'offside', label: 'أوفسايد' },
    { key: 'top10', label: 'التوب 10' },
    { key: 'scoresheet', label: 'ورقة المباراة' },
  ];

  close(): void {
    this.closed.emit();
  }

  preview(): void {
    this.alarm.play();
  }

  reset(): void {
    this.settings.resetAll();
  }

  timerText(key: TimerKey): string {
    const v = this.settings.timerOverrides()[key];
    return typeof v === 'number' ? String(v) : '';
  }

  onTimerText(key: TimerKey, raw: string): void {
    const text = (raw ?? '').trim();
    if (text === '') {
      this.settings.setTimerOverride(key, null);
      return;
    }
    const n = Number(text);
    this.settings.setTimerOverride(key, Number.isFinite(n) && n > 0 ? n : null);
  }
}
