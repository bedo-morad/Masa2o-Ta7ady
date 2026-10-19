import { Component, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { httpResource } from '@angular/common/http';
import { API_BASE, ApiService, OffsideRule } from '../services/api.service';
import { ScoreboardComponent } from '../shared/scoreboard/scoreboard.component';
import { TimerComponent } from '../shared/timer/timer.component';
import { AskedMarkerComponent } from '../shared/asked-marker/asked-marker.component';
import { CountSelectorComponent } from '../shared/draw-controls/count-selector.component';
import { GameHeaderComponent } from '../shared/game-header/game-header.component';

@Component({
  selector: 'app-offside',
  standalone: true,
  imports: [ScoreboardComponent, TimerComponent, AskedMarkerComponent, CountSelectorComponent, GameHeaderComponent],
  templateUrl: './offside.component.html',
  styleUrl: './offside.component.scss',
})
export class OffsideComponent {
  private api = inject(ApiService);

  readonly teamA = signal('');
  readonly teamB = signal('');
  readonly scoreA = signal(0);
  readonly scoreB = signal(0);
  readonly count = signal(10);
  readonly rows = signal<OffsideRule[]>([]);
  readonly asked = signal<Set<number>>(new Set());
  readonly msg = signal('');
  readonly rerolling = signal<number | null>(null);

  private readonly res = httpResource<OffsideRule[]>(
    () => `${API_BASE}/offside?count=${this.count()}`,
  );
  readonly loading = this.res.isLoading;

  constructor() {
    effect(() => {
      const rows = this.res.value();
      if (rows) {
        this.rows.set(rows);
        this.asked.set(new Set());
        this.msg.set(rows.length ? '' : 'لا توجد قواعد بعد — أضف من صفحة إدارة الأسئلة.');
      }
      if (this.res.error()) this.msg.set('تعذر التحميل — تأكد أن السيرفر يعمل.');
    });
  }

  reload(): void {
    this.asked.set(new Set());
    this.res.reload();
  }

  countChanged(value: number | string): void {
    const next = Number(value);
    if (!Number.isFinite(next)) return;
    this.count.set(next);
    this.asked.set(new Set());
  }

  toggleAsked(number: number): void {
    const index = number - 1;
    this.asked.update((marks) => {
      const next = new Set(marks);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  async rerollOne(i: number): Promise<void> {
    if (this.rerolling() !== null) return;
    this.rerolling.set(i);
    try {
      const fresh = await firstValueFrom(this.api.offsideRandom10(6));
      const ids = new Set(this.rows().map((r) => r.id));
      const pick = fresh.find((r) => !ids.has(r.id)) ?? fresh[0];
      if (pick) {
        this.rows.update((rows) => rows.map((r, idx) => (idx === i ? pick : r)));
        this.asked.update((marks) => {
          const next = new Set(marks);
          next.delete(i);
          return next;
        });
      }
    } catch {
      this.msg.set('تعذر تبديل القاعدة — حاول مجددًا.');
    } finally {
      this.rerolling.set(null);
    }
  }
}
