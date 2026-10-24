import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { routes } from './app.routes';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  afterEach(() => localStorage.clear());

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render a router outlet', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).not.toBeNull();
  });

  it('applies a persisted non-night theme during direct app startup', () => {
    localStorage.setItem('ta7ady-theme', 'sand');
    const fixture = TestBed.createComponent(App);

    expect(fixture.componentInstance).toBeTruthy();
    expect(document.documentElement.dataset['theme']).toBe('sand');
  });

  it('opens the game wheel from the main menu', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl('/');
    fixture.detectChanges();

    const wheelLink = fixture.nativeElement.querySelector(
      'a[aria-label="عجلة اختيار لعبة"]',
    ) as HTMLAnchorElement | null;
    expect(wheelLink).toBeTruthy();
    wheelLink?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(TestBed.inject(Router).url).toBe('/game-wheel');
    expect(fixture.nativeElement.querySelector('app-game-wheel')).toBeTruthy();
  });

  it('keeps the wheel selection after navigating away and back', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/game-wheel');
    fixture.detectChanges();

    const removePassword = fixture.nativeElement.querySelector(
      'button[aria-label="إزالة الباسورد من العجلة"]',
    ) as HTMLButtonElement | null;
    expect(removePassword).toBeTruthy();
    removePassword?.click();
    fixture.detectChanges();

    await router.navigateByUrl('/');
    await router.navigateByUrl('/game-wheel');
    fixture.detectChanges();
    const gamesOnWheel = fixture.nativeElement.querySelector('[aria-label="الألعاب على العجلة"]');

    expect(gamesOnWheel?.querySelectorAll('li')).toHaveLength(9);
    expect(gamesOnWheel?.textContent).not.toContain('الباسورد');
    expect(
      fixture.nativeElement.querySelector('[aria-label="الألعاب المستبعدة"]')?.textContent,
    ).toContain('الباسورد');
    expect(
      fixture.nativeElement.querySelector('button[aria-label="إعادة الباسورد إلى العجلة"]'),
    ).toBeTruthy();
  });
});
