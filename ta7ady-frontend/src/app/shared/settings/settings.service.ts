import { Injectable, Signal, inject, signal } from '@angular/core';
import { ThemeService, type Theme } from '../../theme.service';

export type AlarmSoundId = 'classic' | 'triplet' | 'gong';

export type TimerKey =
  | 'password'
  | 'acting'
  | 'actingSteal'
  | 'ihbid'
  | 'offside'
  | 'top10'
  | 'scoresheet'
  | 'bank'
  | 'risk'
  | 'anameen'
  | 'whopicture';

export const TIMER_KEYS: readonly TimerKey[] = [
  'password',
  'acting',
  'actingSteal',
  'ihbid',
  'offside',
  'top10',
  'scoresheet',
  'bank',
  'risk',
  'anameen',
  'whopicture',
];

export const ALARM_SOUNDS: readonly AlarmSoundId[] = ['classic', 'triplet', 'gong'];

const SOUND_KEY = 'ta7ady-alarm-sound';
const VOLUME_KEY = 'ta7ady-alarm-volume';
const TEAM_A_KEY = 'ta7ady-team-a';
const TEAM_B_KEY = 'ta7ady-team-b';
const PLAYERS_A_KEY = 'ta7ady-players-a';
const PLAYERS_B_KEY = 'ta7ady-players-b';
const TIMERS_KEY = 'ta7ady-timer-overrides';
const VIBRATE_KEY = 'ta7ady-vibrate';

const DEFAULT_VOLUME = 5;

// Referee settings, persisted to localStorage and auto-saved on every change.
// Theme itself is owned by ThemeService (single writer of 'ta7ady-theme');
// this service re-exposes it so the settings modal is the one place to change it.
@Injectable({ providedIn: 'root' })
export class SettingsService {
  private themes = inject(ThemeService);

  readonly theme: Signal<Theme> = this.themes.theme;

  private readonly soundSrc = signal<AlarmSoundId>(readSound());
  private readonly volumeSrc = signal<number>(readVolume());
  private readonly teamASrc = signal<string>(readString(TEAM_A_KEY));
  private readonly teamBSrc = signal<string>(readString(TEAM_B_KEY));
  private readonly playersASrc = signal<string[]>(readPlayers(PLAYERS_A_KEY));
  private readonly playersBSrc = signal<string[]>(readPlayers(PLAYERS_B_KEY));
  private readonly overridesSrc = signal<Partial<Record<TimerKey, number | null>>>(
    readOverrides(),
  );
  private readonly vibrateSrc = signal<boolean>(readVibrate());

  readonly alarmSoundId: Signal<AlarmSoundId> = this.soundSrc.asReadonly();
  readonly alarmVolume: Signal<number> = this.volumeSrc.asReadonly();
  readonly teamA: Signal<string> = this.teamASrc.asReadonly();
  readonly teamB: Signal<string> = this.teamBSrc.asReadonly();
  readonly playersA: Signal<string[]> = this.playersASrc.asReadonly();
  readonly playersB: Signal<string[]> = this.playersBSrc.asReadonly();
  readonly timerOverrides: Signal<Partial<Record<TimerKey, number | null>>> =
    this.overridesSrc.asReadonly();
  readonly vibrateOnTimeout: Signal<boolean> = this.vibrateSrc.asReadonly();

  setTheme(t: Theme): void {
    this.themes.setTheme(t);
  }

  setAlarmSound(id: AlarmSoundId): void {
    if (id !== 'classic' && id !== 'triplet' && id !== 'gong') return;
    this.soundSrc.set(id);
    write(SOUND_KEY, id);
  }

  setAlarmVolume(v: number): void {
    const clamped = Math.min(10, Math.max(0, Math.round(v)));
    if (!Number.isFinite(clamped)) return;
    this.volumeSrc.set(clamped);
    write(VOLUME_KEY, String(clamped));
  }

  setTeamA(name: string): void {
    this.teamASrc.set(name ?? '');
    write(TEAM_A_KEY, this.teamASrc());
  }

  setTeamB(name: string): void {
    this.teamBSrc.set(name ?? '');
    write(TEAM_B_KEY, this.teamBSrc());
  }

  setPlayer(team: 'A' | 'B', index: 0 | 1, name: string): void {
    const src = team === 'A' ? this.playersASrc : this.playersBSrc;
    src.update((pair) => {
      const next: string[] = [pair[0] ?? '', pair[1] ?? ''];
      next[index] = name ?? '';
      return next;
    });
    write(team === 'A' ? PLAYERS_A_KEY : PLAYERS_B_KEY, JSON.stringify(src()));
  }

  setTimerOverride(key: TimerKey, seconds: number | null): void {
    const clean = normalizeOverride(seconds);
    this.overridesSrc.update((prev) => ({ ...prev, [key]: clean }));
    write(TIMERS_KEY, JSON.stringify(this.overridesSrc()));
  }

  setVibrate(on: boolean): void {
    this.vibrateSrc.set(!!on);
    write(VIBRATE_KEY, this.vibrateSrc() ? '1' : '0');
  }

  // Effective start value: the referee's override wins when set, else the fallback.
  timerSeconds(key: TimerKey, fallback: number): number {
    const o = this.overridesSrc()[key];
    if (typeof o === 'number' && Number.isFinite(o) && o > 0) return o;
    return fallback;
  }

  resetAll(): void {
    this.themes.setTheme('lapis');
    this.soundSrc.set('classic');
    this.volumeSrc.set(DEFAULT_VOLUME);
    this.teamASrc.set('');
    this.teamBSrc.set('');
    this.playersASrc.set(['', '']);
    this.playersBSrc.set(['', '']);
    this.overridesSrc.set({});
    this.vibrateSrc.set(true);
    write(SOUND_KEY, 'classic');
    write(VOLUME_KEY, String(DEFAULT_VOLUME));
    write(TEAM_A_KEY, '');
    write(TEAM_B_KEY, '');
    write(PLAYERS_A_KEY, JSON.stringify(['', '']));
    write(PLAYERS_B_KEY, JSON.stringify(['', '']));
    write(TIMERS_KEY, JSON.stringify({}));
    write(VIBRATE_KEY, '1');
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode: ignore */
  }
}

function readString(key: string): string {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

function readSound(): AlarmSoundId {
  const v = readString(SOUND_KEY);
  return v === 'triplet' || v === 'gong' || v === 'classic' ? v : 'classic';
}

function readVibrate(): boolean {
  const v = readString(VIBRATE_KEY);
  // Enabled by default: only an explicit stored off-switch disables it.
  if (v === '') return true;
  return v !== '0' && v !== 'false';
}

function readVolume(): number {
  const n = Number(readString(VOLUME_KEY));
  if (!Number.isFinite(n)) return DEFAULT_VOLUME;
  const clamped = Math.min(10, Math.max(0, Math.round(n)));
  return readString(VOLUME_KEY) === '' ? DEFAULT_VOLUME : clamped;
}

function readPlayers(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return ['', ''];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return ['', ''];
    return [asText(parsed[0]), asText(parsed[1])];
  } catch {
    return ['', ''];
  }
}

function readOverrides(): Partial<Record<TimerKey, number | null>> {
  try {
    const raw = localStorage.getItem(TIMERS_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    const out: Partial<Record<TimerKey, number | null>> = {};
    for (const k of TIMER_KEYS) {
      const v = (parsed as Record<string, unknown>)[k];
      if (v === null || v === undefined) continue;
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) out[k] = n;
    }
    return out;
  } catch {
    return {};
  }
}

function normalizeOverride(seconds: number | null): number | null {
  if (seconds === null || seconds === undefined) return null;
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return seconds;
}

function asText(v: unknown): string {
  return typeof v === 'string' ? v : '';
}
