import { Component, inject, input, output } from '@angular/core';
import { SettingsService } from '../settings/settings.service';

// Shared attribution interaction (SPECV2 §2.3): the referee taps team A or B
// for an answer. The component owns the toggle math (tap again unassigns)
// and emits the change; the hosting page applies the deltas to its own
// score signals (clamped at zero) and appends audit entries. Display +
// auto-score only: no turn order, no eligibility checks, no locks.

export type AssignedTeam = 'A' | 'B' | null;

export interface AttributionChange {
  label: string;
  points: number;
  picked: 'A' | 'B';
  from: AssignedTeam;
  to: AssignedTeam;
}

export interface AuditEntry {
  seq: number;
  team: 'A' | 'B';
  label: string;
  delta: number;
}

/** Signed score deltas for moving an assignment from `from` to `to`. */
export function attributionDeltas(
  points: number,
  from: AssignedTeam,
  to: AssignedTeam,
): { deltaA: number; deltaB: number } {
  let deltaA = 0;
  let deltaB = 0;
  if (from === 'A') deltaA -= points;
  if (from === 'B') deltaB -= points;
  if (to === 'A') deltaA += points;
  if (to === 'B') deltaB += points;
  return { deltaA, deltaB };
}

/** "+6" / "-3" / "0" for audit strips and point badges. */
export function signed(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

@Component({
  selector: 'app-attribution',
  standalone: true,
  templateUrl: './attribution.component.html',
  styleUrl: './attribution.component.scss',
})
export class AttributionComponent {
  readonly label = input('');
  readonly points = input(0);
  readonly assigned = input<AssignedTeam>(null);
  readonly teamA = input('');
  readonly teamB = input('');
  readonly short = input(false);
  // Presentation switches for hosts that want plain, large buttons (Risk §3.5):
  // hide the signed points badge, and stretch the buttons across the row side by side.
  readonly showPoints = input(true);
  readonly stretch = input(false);
  readonly change = output<AttributionChange>();

  tap(picked: 'A' | 'B'): void {
    const from = this.assigned();
    const to: AssignedTeam = from === picked ? null : picked;
    this.change.emit({ label: this.label(), points: this.points(), picked, from, to });
  }

  fmt(n: number): string {
    return signed(n);
  }
}

// Chronological "team ← label (+N)" strip. Kept in this file so both v2
// pages share one audit rendering; entries are owned by the hosting page.
@Component({
  selector: 'app-audit-strip',
  standalone: true,
  template: `
    @if (entries().length) {
      <ol class="audit" aria-label="سجل الاحتساب">
        @for (e of entries(); track e.seq) {
          <li class="entry" [class.neg]="e.delta < 0">
            <span class="eteam">{{ name(e.team) }}</span>
            <span class="arrow" aria-hidden="true">←</span>
            <span class="elabel">{{ e.label }}</span>
            <span class="edelta tabular-nums">({{ fmt(e.delta) }})</span>
          </li>
        }
      </ol>
    }
  `,
  styles: `
    .audit {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      max-height: 12rem;
      overflow-y: auto;
      background: var(--pitch-surface);
      border: 1px solid var(--pitch-line);
      border-radius: var(--radius-card);
      padding: 0.7rem 0.9rem;
    }
    .entry {
      display: flex;
      align-items: baseline;
      gap: 0.35rem;
      font-size: 0.9rem;
      color: var(--pitch-ink-dim);
    }
    .eteam { font-weight: 800; color: var(--pitch-ink); }
    .arrow { color: var(--pitch-gold); }
    .elabel {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .edelta { font-weight: 800; color: var(--pitch-accent); }
    .neg .edelta { color: var(--pitch-danger); }
  `,
})
export class AuditStripComponent {
  private settings = inject(SettingsService);
  readonly entries = input<AuditEntry[]>([]);
  readonly teamA = input('');
  readonly teamB = input('');

  name(t: 'A' | 'B'): string {
    return t === 'A'
      ? this.teamA() || this.settings.teamA() || 'الفريق الأول'
      : this.teamB() || this.settings.teamB() || 'الفريق الثاني';
  }

  fmt(n: number): string {
    return signed(n);
  }
}
