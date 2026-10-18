import { Injectable, effect, signal } from '@angular/core';

export type Theme = 'night' | 'sand' | 'lapis';

const KEY = 'ta7ady-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>(this.read());

  constructor() {
    // Apply the persisted value synchronously. CSS defaults to night until the
    // signal effect runs, which caused a brief night-theme flash on hard loads.
    this.apply(this.theme());
    effect(() => {
      const t = this.theme();
      this.apply(t);
      this.persist(t);
    });
  }

  setTheme(t: Theme): void {
    this.theme.set(t);
    this.apply(t);
    this.persist(t);
  }

  private apply(theme: Theme): void {
    document.documentElement.dataset['theme'] = theme;
  }

  private persist(theme: Theme): void {
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* private mode: ignore */
    }
  }

  private read(): Theme {
    try {
      const v = localStorage.getItem(KEY);
      if (v === 'sand' || v === 'lapis' || v === 'night') return v;
    } catch {
      /* ignore */
    }
    return 'lapis';
  }
}
