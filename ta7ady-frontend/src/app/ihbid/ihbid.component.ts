import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { httpResource } from '@angular/common/http';
import { API_BASE, ApiService, IhbidQuestion } from '../api.service';
import { ScoreboardComponent } from '../shared/scoreboard/scoreboard.component';
import { TimerComponent } from '../shared/timer/timer.component';

@Component({
  selector: 'app-ihbid',
  standalone: true,
  imports: [FormsModule, RouterLink, ScoreboardComponent, TimerComponent],
  templateUrl: './ihbid.component.html',
  styleUrl: './ihbid.component.scss',
})
export class IhbidComponent {
  private api = inject(ApiService);

  readonly teamA = signal('');
  readonly teamB = signal('');
  readonly scoreA = signal(0);
  readonly scoreB = signal(0);
  readonly count = signal(10);
  readonly rows = signal<IhbidQuestion[]>([]);
  readonly revealed = signal<Set<number>>(new Set());
  readonly asked = signal<Set<number>>(new Set());
  readonly msg = signal('');
  readonly rerolling = signal<number | null>(null);

  private readonly res = httpResource<IhbidQuestion[]>(
    () => `${API_BASE}/ihbid?count=${this.count()}`,
  );
  readonly loading = this.res.isLoading;

  constructor() {
    effect(() => {
      const rows = this.res.value();
      if (rows) {
        this.rows.set(rows);
        this.revealed.set(new Set());
        this.asked.set(new Set());
        this.msg.set(rows.length ? '' : 'لا توجد أسئلة بعد — أضف من صفحة إدارة الأسئلة.');
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

  toggleAsked(index: number): void {
    this.asked.update((marks) => {
      const next = new Set(marks);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  googleUrl(text: string): string {
    return `https://www.google.com/search?q=${encodeURIComponent(text)}`;
  }

  toggle(id: number): void {
    this.revealed.update((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async rerollOne(i: number): Promise<void> {
    if (this.rerolling() !== null) return;
    this.rerolling.set(i);
    try {
      const fresh = await firstValueFrom(this.api.ihbidRandom10(6));
      const ids = new Set(this.rows().map((q) => q.id));
      const pick = fresh.find((r) => !ids.has(r.id)) ?? fresh[0];
      if (pick) {
        const oldId = this.rows()[i]?.id;
        this.rows.update((rows) => rows.map((q, idx) => (idx === i ? pick : q)));
        this.asked.update((marks) => {
          const next = new Set(marks);
          next.delete(i);
          return next;
        });
        this.revealed.update((s) => {
          const next = new Set(s);
          if (oldId !== undefined) next.delete(oldId);
          return next;
        });
      }
    } catch {
      this.msg.set('تعذر تبديل السؤال — حاول مجددًا.');
    } finally {
      this.rerolling.set(null);
    }
  }
}
