import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { GameWheelComponent } from './game-wheel.component';

describe('GameWheelComponent', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [GameWheelComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  afterEach(() => localStorage.clear());

  it('shows the Arabic page title and a route back to the main menu', () => {
    const fixture = TestBed.createComponent(GameWheelComponent);
    fixture.detectChanges();
    const page: HTMLElement = fixture.nativeElement;

    expect(page.querySelector('h2')?.textContent).toContain('عجلة الألعاب');
    expect(page.querySelector('a.back')?.getAttribute('href')).toBe('/');
  });

  it('starts with all available games on the wheel', () => {
    const fixture = TestBed.createComponent(GameWheelComponent);
    fixture.detectChanges();
    const page: HTMLElement = fixture.nativeElement;
    const gamesOnWheel = page.querySelector('[aria-label="الألعاب على العجلة"]');

    expect(gamesOnWheel).toBeTruthy();
    expect(gamesOnWheel?.querySelectorAll('li')).toHaveLength(10);
    for (const gameName of [
      'الباسورد',
      'التمثيل',
      'اهبد صح',
      'أوفسايد',
      'توب 10',
      'سكور شيت',
      'ريسك',
      'بنك',
      'أنا مين؟',
      'مين في الصورة',
    ]) {
      expect(gamesOnWheel?.textContent).toContain(gameName);
    }
  });

  it('removes a game from the wheel without adding it to picked games', () => {
    const fixture = TestBed.createComponent(GameWheelComponent);
    fixture.detectChanges();
    const page: HTMLElement = fixture.nativeElement;
    const availableGames = page.querySelector('[aria-label="الألعاب على العجلة"]');
    const removePassword = page.querySelector(
      'button[aria-label="إزالة الباسورد من العجلة"]',
    ) as HTMLButtonElement | null;

    expect(removePassword).toBeTruthy();
    removePassword?.click();
    fixture.detectChanges();

    expect(availableGames?.querySelectorAll('li')).toHaveLength(9);
    expect(availableGames?.textContent).not.toContain('الباسورد');
    expect(page.querySelector('[aria-label="الألعاب المختارة"]')?.textContent).not.toContain(
      'الباسورد',
    );
  });

  it('keeps spin winners in order and never picks a game twice', () => {
    const fixture = TestBed.createComponent(GameWheelComponent);
    fixture.detectChanges();
    const page: HTMLElement = fixture.nativeElement;
    const availableGames = page.querySelector('[aria-label="الألعاب على العجلة"]');
    const spinButton = page.querySelector(
      'button[aria-label="لف العجلة"]',
    ) as HTMLButtonElement | null;
    const namesBeforeSpin = Array.from(availableGames?.querySelectorAll('li > span') ?? []).map(
      (name) => name.textContent?.trim(),
    );

    expect(spinButton).toBeTruthy();
    spinButton?.click();
    fixture.detectChanges();
    const firstPick = page.querySelector('.picked-list li:not(.empty-picked)')?.textContent?.trim();
    expect(firstPick).toBeTruthy();
    expect(namesBeforeSpin).toContain(firstPick);
    expect(availableGames?.textContent).not.toContain(firstPick);

    spinButton?.click();
    fixture.detectChanges();
    const picks = Array.from(page.querySelectorAll('.picked-list li:not(.empty-picked)')).map(
      (game) => game.textContent?.trim(),
    );
    const secondPick = picks[1];

    expect(picks).toHaveLength(2);
    expect(picks[0]).toBe(firstPick);
    expect(secondPick).toBeTruthy();
    expect(secondPick).not.toBe(firstPick);
    expect(namesBeforeSpin).toContain(secondPick);
    expect(availableGames?.textContent).not.toContain(secondPick);
    expect(page.querySelector('[aria-live="polite"]')?.textContent).toContain(secondPick);
  });

  it('disables spinning when empty and Reset starts a fresh round', () => {
    const fixture = TestBed.createComponent(GameWheelComponent);
    fixture.detectChanges();
    const page: HTMLElement = fixture.nativeElement;
    const spinButton = page.querySelector('button[aria-label="لف العجلة"]') as HTMLButtonElement;
    spinButton.click();
    fixture.detectChanges();

    const removeButtons = Array.from(page.querySelectorAll('.remove-game')) as HTMLButtonElement[];
    for (const removeButton of removeButtons) removeButton.click();
    fixture.detectChanges();
    expect(spinButton.disabled).toBe(true);

    const resetButton = page.querySelector(
      'button[aria-label="بدء جولة جديدة"]',
    ) as HTMLButtonElement | null;
    expect(resetButton).toBeTruthy();
    resetButton?.click();
    fixture.detectChanges();

    expect(
      page.querySelector('[aria-label="الألعاب على العجلة"]')?.querySelectorAll('li'),
    ).toHaveLength(10);
    expect(page.querySelector('.empty-picked')).toBeTruthy();
    expect(spinButton.disabled).toBe(false);
  });
});
