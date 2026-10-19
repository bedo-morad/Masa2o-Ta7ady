import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset['theme'];
  });

  afterEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset['theme'];
  });

  it.each([
    ['night', 'night'],
    ['sand', 'sand'],
    ['lapis', 'lapis'],
  ])('restores persisted %s on construction', (stored, expected) => {
    localStorage.setItem('ta7ady-theme', stored);

    const service = TestBed.runInInjectionContext(() => new ThemeService());

    expect(service.theme()).toBe(expected);
    expect(document.documentElement.dataset['theme']).toBe(expected);
  });

  it.each(['', 'invalid', 'NIGHT'])(
    'falls back to lapis for invalid persisted value %s',
    (stored) => {
      localStorage.setItem('ta7ady-theme', stored);

      const service = TestBed.runInInjectionContext(() => new ThemeService());

      expect(service.theme()).toBe('lapis');
      expect(document.documentElement.dataset['theme']).toBe('lapis');
    },
  );

  it('applies and persists a theme selected after startup', () => {
    const service = TestBed.runInInjectionContext(() => new ThemeService());

    service.setTheme('sand');

    expect(service.theme()).toBe('sand');
    expect(document.documentElement.dataset['theme']).toBe('sand');
    expect(localStorage.getItem('ta7ady-theme')).toBe('sand');
  });
});
