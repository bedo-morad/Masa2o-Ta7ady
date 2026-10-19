import { GoogleSearchComponent } from '../shared/google-search/google-search.component';
import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { httpResource } from '@angular/common/http';
import { API_BASE, ApiService, PlayerName } from '../api.service';
import { ScoreboardComponent } from '../shared/scoreboard/scoreboard.component';
import { TimerComponent } from '../shared/timer/timer.component';

interface Card {
  row: PlayerName;
  flipped: boolean;
}

@Component({
  selector: 'app-acting',
  standalone: true,
  imports: [GoogleSearchComponent, FormsModule, RouterLink, ScoreboardComponent, TimerComponent],
  templateUrl: './acting.component.html',
  styleUrl: './acting.component.scss',
})
export class ActingComponent {
  private api = inject(ApiService);

  readonly teamA = signal('');
  readonly teamB = signal('');
  readonly scoreA = signal(0);
  readonly scoreB = signal(0);
  readonly count = signal(10);
  readonly cards = signal<Card[]>([]);
  readonly msg = signal('');
  readonly rerolling = signal<number | null>(null);

  private readonly res = httpResource<PlayerName[]>(
    () => `${API_BASE}/players?count=${this.count()}`,
  );
  readonly loading = this.res.isLoading;

  constructor() {
    effect(() => {
      const rows = this.res.value();
      if (rows) {
        this.cards.set(rows.map((row) => ({ row, flipped: false })));
        this.msg.set(rows.length ? '' : 'لا توجد أسماء بعد — أضف من صفحة إدارة الأسئلة.');
      }
      if (this.res.error()) this.msg.set('تعذر تحميل الأسماء — تأكد أن السيرفر يعمل.');
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
