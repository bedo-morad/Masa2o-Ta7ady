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
    { id: 'triplet', label: 'تصاعدي' },
    { id: 'gong', label: 'ناعم' },
  ];

  readonly themes: { id: Theme; label: string }[] = [
    { id: 'night', label: 'ليلي' },
    { id: 'lapis', label: 'لازورد' },
    { id: 'sand', label: 'رملي' },
  ];

  readonly timerFields: { key: TimerKey; label: string }[] = [
    { key: 'password', label: 'الباسورد' },
    { key: 'acting', label: 'التمثيل' },
    { key: 'actingSteal', label: 'سرقة التمثيل' },
    { key: 'ihbid', label: 'اهبد صح' },
    { key: 'offside', label: 'أوفسايد' },
    { key: 'top10', label: 'توب 10' },
    { key: 'scoresheet', label: 'سكور شيت' },
    { key: 'bank', label: 'بنك' },
    { key: 'risk', label: 'ريسك' },
    { key: 'anameen', label: 'أنا مين؟' },
    { key: 'whopicture', label: 'مين في الصورة' },
  ];

  // In-game defaults per timerKey (must match each game's defaultSeconds).
  // Shown as the input placeholder; an empty field still means "use default".
  readonly timerDefaults: Record<TimerKey, number> = {
    password: 30,
    acting: 45,
    actingSteal: 10,
    ihbid: 30,
    offside: 5,
    top10: 10,
    scoresheet: 10,
    bank: 120,
    risk: 30,
    anameen: 60,
    whopicture: 10,
  };

  defaultPlaceholder(key: TimerKey): string {
    return String(this.timerDefaults[key]);
  }

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
