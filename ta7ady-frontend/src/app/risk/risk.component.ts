import { GoogleSearchComponent } from '../shared/google-search/google-search.component';
import { GameHeaderComponent } from '../shared/game-header/game-header.component';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { httpResource } from '@angular/common/http';
import { API_BASE, ApiService, RiskPack, RiskQuestion } from '../api.service';
import { ScoreboardComponent } from '../shared/scoreboard/scoreboard.component';
import { TimerComponent } from '../shared/timer/timer.component';
import {
  AssignedTeam,
  AttributionChange,
  AttributionComponent,
  AuditEntry,
  AuditStripComponent,
  attributionDeltas,
} from '../shared/attribution/attribution.component';
import { ScoreBooking } from '../shared/score-booking';
import {
  RiskLifecycle,
  RISK_TIERS,
  cellKey,
  chooseUniform,
  pointValue,
  splitCell,
  tierPoints,
} from './risk-lifecycle';

export { RISK_TIERS, cellKey, chooseUniform, pointValue, splitCell, tierPoints } from './risk-lifecycle';
export const RISK_COUNT = 4;
export const RISK_CARDS = ['سرقة سؤال', 'وقت إضافي', 'اختيارات', 'الاتصال بصديق'] as const;

type CardState = { A: boolean[]; B: boolean[] };

@Component({
  selector: 'app-risk',
  standalone: true,
  imports: [GameHeaderComponent, GoogleSearchComponent, ScoreboardComponent, TimerComponent, AttributionComponent, AuditStripComponent],
  templateUrl: './risk.component.html',
  styleUrl: './risk.component.scss',
})
export class RiskComponent {
  private readonly api = inject(ApiService);
  readonly teamA = signal('');
  readonly teamB = signal('');
  readonly scoreA = signal(0);
  readonly scoreB = signal(0);
  readonly audit = signal<AuditEntry[]>([]);
  readonly msg = signal('');
  private readonly booking = new ScoreBooking(this.scoreA, this.scoreB, this.audit);
  private readonly lifecycle: RiskLifecycle;
  readonly packs: RiskLifecycle['packs'];
  readonly seen: RiskLifecycle['seen'];
  readonly open: RiskLifecycle['open'];
  readonly double: RiskLifecycle['double'];
  readonly assignments: RiskLifecycle['assignments'];
  readonly cards: RiskLifecycle['cards'];
  readonly rerolling = signal<number | null>(null);

  readonly tiers = RISK_TIERS;
  readonly cardLabels = RISK_CARDS;
  readonly gridCols = computed(() => `repeat(${Math.max(1, this.packs().length)}, minmax(0, 1fr))`);
  private readonly res = httpResource<RiskPack[]>(() => `${API_BASE}/risk?count=${RISK_COUNT}`);
  readonly loading = this.res.isLoading;

  constructor() {
    this.lifecycle = new RiskLifecycle(this.booking);
    this.packs = this.lifecycle.packs;
    this.seen = this.lifecycle.seen;
    this.open = this.lifecycle.open;
    this.double = this.lifecycle.double;
    this.assignments = this.lifecycle.assignments;
    this.cards = this.lifecycle.cards;
    effect(() => {
      const rows = this.res.value();
      const err = this.res.error();
      untracked(() => {
        if (rows) {
          this.loadBoard(rows);
          this.msg.set(rows.length ? '' : 'لا توجد مجموعات بعد — أضف من صفحة إدارة الأسئلة.');
        }
        if (err) this.msg.set('تعذر التحميل — تأكد أن السيرفر يعمل.');
      });
    }, { allowSignalWrites: true });
  }

  keyOf(packId: number, tier: number): string { return cellKey(packId, tier); }
  pts(tier: number): number { return tierPoints(tier); }

  loadBoard(rows: RiskPack[]): void { this.lifecycle.loadBoard(rows); }
  reload(): void { this.res.reload(); }

  cellAt(key: string | null): RiskQuestion | null {
    if (!key) return null;
    const { packId, tier } = splitCell(key);
    return this.packs().find((pack) => pack.id === packId)?.questions[tier] ?? null;
  }
  genreOf(key: string): string {
    const { packId } = splitCell(key);
    return this.packs().find((pack) => pack.id === packId)?.genre ?? '';
  }
  tierOf(key: string): number { return splitCell(key).tier; }
  isSeen(key: string): boolean { return this.seen().has(key); }
  isOpen(key: string): boolean { return this.open() === key; }
  isDouble(key: string): boolean { return this.double() === key && this.seen().has(key); }
  doubleFound(): boolean { return this.double() !== null && this.seen().has(this.double() as string); }
  toggleCell(key: string): void { this.lifecycle.toggleCell(key); }
  assigned(key: string): AssignedTeam { return this.assignments()[key] ?? null; }
  pointsOf(key: string): number { return pointValue(this.tierOf(key), this.double() === key); }

  onAssign(key: string, label: string, change: AttributionChange): void {
    const from = this.assigned(key);
    const to: AssignedTeam = from === change.picked ? null : change.picked;
    const { deltaA, deltaB } = attributionDeltas(this.pointsOf(key), from, to);
    this.booking.book('A', deltaA, label);
    this.booking.book('B', deltaB, label);
    this.lifecycle.setAssignment(key, to);
  }

  async rerollColumn(col: number): Promise<void> {
    if (this.rerolling() !== null) return;
    this.rerolling.set(col);
    try {
      const fresh = await firstValueFrom(this.api.riskRandom(1));
      const pack = fresh[0];
      if (!pack) throw new Error('empty');
      this.lifecycle.replaceColumn(col, pack);
      this.msg.set('');
    } catch {
      this.msg.set('تعذر تبديل هذا الجانب — حاول مجددًا.');
    } finally {
      this.rerolling.set(null);
    }
  }

  cardUsed(team: 'A' | 'B', index: number): boolean { return this.cards()[team][index]; }
  toggleCard(team: 'A' | 'B', index: number): void { this.lifecycle.toggleCard(team, index); }
}
