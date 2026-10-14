import { Injectable, effect, signal } from '@angular/core';

export type Theme = 'night' | 'sand' | 'lapis';

const KEY = 'ta7ady-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>(this.read());

  constructor() {
    effect(() => {
      const t = this.theme();
      document.documentElement.dataset['theme'] = t;
      try {
        localStorage.setItem(KEY, t);
      } catch {
        /* private mode: ignore */
      }
    });
  }

  setTheme(t: Theme): void {
    this.theme.set(t);
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
