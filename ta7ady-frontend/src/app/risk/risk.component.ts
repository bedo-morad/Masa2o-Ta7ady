import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
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
} from '../shared/attribution/attribution.component';
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
  imports: [RouterLink, ScoreboardComponent, TimerComponent, AttributionComponent, AuditStripComponent],
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

  private readonly lifecycle: RiskLifecycle;
  readonly packs: RiskLifecycle['packs'];
  readonly seen: RiskLifecycle['seen'];
  readonly open: RiskLifecycle['open'];
  readonly double: RiskLifecycle['double'];
  readonly assignments: RiskLifecycle['assignments'];
  readonly cards: RiskLifecycle['cards'];
  readonly rerolling: RiskLifecycle['rerolling'];

  readonly tiers = RISK_TIERS;
  readonly cardLabels = RISK_CARDS;
  readonly gridCols = computed(() => `repeat(${Math.max(1, this.packs().length)}, minmax(0, 1fr))`);

  private readonly res = httpResource<RiskPack[]>(() => `${API_BASE}/risk?count=${RISK_COUNT}`);
  readonly loading = this.res.isLoading;

  constructor() {
    this.lifecycle = new RiskLifecycle(this.api, this.scoreA, this.scoreB, this.audit);
    this.packs = this.lifecycle.packs;
    this.seen = this.lifecycle.seen;
    this.open = this.lifecycle.open;
    this.double = this.lifecycle.double;
    this.assignments = this.lifecycle.assignments;
    this.cards = this.lifecycle.cards;
    this.rerolling = this.lifecycle.rerolling;

    effect(
      () => {
        const rows = this.res.value();
        const err = this.res.error();
        untracked(() => {
          if (rows) {
            this.loadBoard(rows);
            this.msg.set(rows.length ? '' : 'لا توجد مجموعات بعد — أضف من صفحة إدارة الأسئلة.');
          }
          if (err) this.msg.set('تعذر التحميل — تأكد أن السيرفر يعمل.');
        });
      },
      { allowSignalWrites: true },
    );
  }

  keyOf(packId: number, tier: number): string { return cellKey(packId, tier); }
  pts(tier: number): number { return tierPoints(tier); }
  googleUrl(text: string): string { return `https://www.google.com/search?q=${encodeURIComponent(text)}`; }

  loadBoard(rows: RiskPack[]): void { this.lifecycle.loadBoard(rows); }
  reload(): void { this.res.reload(); }
  cellAt(key: string | null): RiskQuestion | null { return this.lifecycle.cellAt(key); }
  genreOf(key: string): string { return this.lifecycle.genreOf(key); }
  tierOf(key: string): number { return this.lifecycle.tierOf(key); }
  isSeen(key: string): boolean { return this.lifecycle.isSeen(key); }
  isOpen(key: string): boolean { return this.lifecycle.isOpen(key); }
  isDouble(key: string): boolean { return this.lifecycle.isDouble(key); }
  doubleFound(): boolean { return this.lifecycle.doubleFound(); }
  toggleCell(key: string): void { this.lifecycle.toggleCell(key); }
  assigned(key: string): AssignedTeam { return this.lifecycle.assigned(key); }
  pointsOf(key: string): number { return this.lifecycle.pointsOf(key); }
  onAssign(key: string, label: string, change: AttributionChange): void {
    this.lifecycle.assign(key, label, change);
  }

  async rerollColumn(col: number): Promise<void> {
    if (this.rerolling() !== null) return;
    try {
      await this.lifecycle.rerollColumn(col);
      this.msg.set('');
    } catch {
      this.msg.set('تعذر تبديل هذا الجانب — حاول مجددًا.');
    }
  }

  cardUsed(team: 'A' | 'B', index: number): boolean { return this.lifecycle.cardUsed(team, index); }
  toggleCard(team: 'A' | 'B', index: number): void { this.lifecycle.toggleCard(team, index); }
}
