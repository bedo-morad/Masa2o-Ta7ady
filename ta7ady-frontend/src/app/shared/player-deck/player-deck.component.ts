import { Component, effect, inject, input, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE, ApiService, PlayerName } from '../../services/api.service';
import { GoogleSearchComponent } from '../google-search/google-search.component';

interface Card {
  row: PlayerName;
  flipped: boolean;
}

@Component({
  selector: 'app-player-deck',
  standalone: true,
  imports: [GoogleSearchComponent],
  templateUrl: './player-deck.component.html',
  styleUrl: './player-deck.component.scss',
})
export class PlayerDeckComponent {
  private readonly api = inject(ApiService);
  readonly count = input(10);
  private readonly cards = signal<Card[]>([]);
  private readonly msg = signal('');
  private readonly rerolling = signal<number | null>(null);
  private readonly res = httpResource<PlayerName[]>(
    () => `${API_BASE}/players?count=${this.count()}`,
  );
  readonly loading = this.res.isLoading;

  constructor() {
    effect(() => {
      if (this.res.error()) {
        this.msg.set('تعذر تحميل الأسماء — تأكد أن السيرفر يعمل.');
        return;
      }
      const rows = this.res.value();
      if (rows) {
        this.cards.set(rows.map((row) => ({ row, flipped: false })));
        this.msg.set(rows.length ? '' : 'لا توجد أسماء بعد — أضف من صفحة إدارة الأسئلة.');
      }
    });
  }

  reload(): void {
    this.res.reload();
  }

  flip(i: number): void {
    this.cards.update((cs) => cs.map((c, idx) => (idx === i ? { ...c, flipped: !c.flipped } : c)));
  }

  async rerollOne(i: number): Promise<void> {
    if (this.rerolling() !== null) return;
    this.rerolling.set(i);
    try {
      const fresh = await firstValueFrom(this.api.playersRandom10(6));
      const ids = new Set(this.cards().map((c) => c.row.id));
      const pick = fresh.find((r) => !ids.has(r.id)) ?? fresh[0];
      if (pick) {
        this.cards.update((cs) =>
          cs.map((c, idx) => (idx === i ? { row: pick, flipped: false } : c)),
        );
      }
    } catch {
      this.msg.set('تعذر تبديل البطاقة — حاول مجددًا.');
    } finally {
      this.rerolling.set(null);
    }
  }
}
