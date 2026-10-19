import { Component, computed, input, output } from '@angular/core';
import { GoogleSearchComponent } from '../../shared/google-search/google-search.component';
import {
  AssignedTeam,
  AttributionChange,
  AttributionComponent,
} from '../../shared/attribution/attribution.component';
import { RiskPack, RiskQuestion } from '../../api.service';
import { RISK_TIERS, cellKey, pointValue, splitCell, tierPoints } from '../risk-lifecycle';

export interface RiskAssignmentRequest {
  key: string;
  question: string;
  change: AttributionChange;
}

@Component({
  selector: 'app-risk-board',
  standalone: true,
  imports: [GoogleSearchComponent, AttributionComponent],
  templateUrl: './risk-board.component.html',
  styleUrl: './risk-board.component.scss',
})
export class RiskBoardComponent {
  readonly packs = input<RiskPack[]>([]);
  readonly seen = input<ReadonlySet<string>>(new Set());
  readonly open = input<string | null>(null);
  readonly double = input<string | null>(null);
  readonly assignments = input<Record<string, AssignedTeam>>({});
  readonly teamA = input('');
  readonly teamB = input('');
  readonly rerolling = input<number | null>(null);

  readonly cellToggle = output<string>();
  readonly columnReroll = output<number>();
  readonly assignment = output<RiskAssignmentRequest>();

  readonly tiers = RISK_TIERS;
  readonly gridCols = computed(() => `repeat(${Math.max(1, this.packs().length)}, minmax(0, 1fr))`);

  keyOf(packId: number, tier: number): string {
    return cellKey(packId, tier);
  }

  pts(tier: number): number {
    return tierPoints(tier);
  }

  cellAt(key: string | null): RiskQuestion | null {
    if (!key) return null;
    const { packId, tier } = splitCell(key);
    return this.packs().find((pack) => pack.id === packId)?.questions[tier] ?? null;
  }

  genreOf(key: string): string {
    const { packId } = splitCell(key);
    return this.packs().find((pack) => pack.id === packId)?.genre ?? '';
  }

  tierOf(key: string): number {
    return splitCell(key).tier;
  }

  isSeen(key: string): boolean {
    return this.seen().has(key);
  }

  isOpen(key: string): boolean {
    return this.open() === key;
  }

  isDouble(key: string): boolean {
    return this.double() === key && this.seen().has(key);
  }

  assigned(key: string): AssignedTeam {
    return this.assignments()[key] ?? null;
  }

  pointsOf(key: string): number {
    return pointValue(this.tierOf(key), this.double() === key);
  }

  requestAssignment(key: string, question: string, change: AttributionChange): void {
    this.assignment.emit({ key, question, change });
  }
}
