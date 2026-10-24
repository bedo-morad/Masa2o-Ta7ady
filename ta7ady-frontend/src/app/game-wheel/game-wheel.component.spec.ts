import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ThemeService } from '../services/theme.service';
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

  it('shows the approved title with spacing and no helper copy', () => {
    const fixture = TestBed.createComponent(GameWheelComponent);
    fixture.detectChanges();
    const page: HTMLElement = fixture.nativeElement;
    const title = page.querySelector('app-game-header h2');

    expect(title?.textContent).toContain('عجلة الحظ');
    expect(title?.classList.contains('title-gap')).toBe(true);
    expect(page.querySelector('.intro')).toBeNull();
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

  it('uses exactly two alternating colors for the wheel sectors', () => {
    const fixture = TestBed.createComponent(GameWheelComponent);
    fixture.detectChanges();
    const page: HTMLElement = fixture.nativeElement;
    const sectorColors = new Set(
      Array.from(page.querySelectorAll('.wheel-disc path')).map((path) =>
        Array.from(path.classList).find((className) => className.startsWith('sector-')),
      ),
    );

    expect(sectorColors).toEqual(new Set(['sector-0', 'sector-1']));
  });

  it('uses a light or dark app-icon treatment for the active theme', () => {
    const fixture = TestBed.createComponent(GameWheelComponent);
    fixture.detectChanges();
    const page: HTMLElement = fixture.nativeElement;
    const icon = page.querySelector('.wheel-center-icon');
    const theme = TestBed.inject(ThemeService);

    expect(icon?.getAttribute('src')).toBe('/icon.png');
    expect(icon?.classList.contains('dark-theme-icon')).toBe(true);

    theme.setTheme('sand');
    fixture.detectChanges();
    expect(icon?.classList.contains('dark-theme-icon')).toBe(false);

    theme.setTheme('night');
    fixture.detectChanges();
    expect(icon?.classList.contains('dark-theme-icon')).toBe(true);
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

  it('lets the referee restore a manually removed game to the wheel', () => {
    const fixture = TestBed.createComponent(GameWheelComponent);
    fixture.detectChanges();
    const page: HTMLElement = fixture.nativeElement;
    const removePassword = page.querySelector(
      'button[aria-label="إزالة الباسورد من العجلة"]',
    ) as HTMLButtonElement | null;
    removePassword?.click();
    fixture.detectChanges();

    const removedGames = page.querySelector('[aria-label="الألعاب المستبعدة"]');
    expect(removedGames?.textContent).toContain('الباسورد');
    const restorePassword = page.querySelector(
      'button[aria-label="إعادة الباسورد إلى العجلة"]',
    ) as HTMLButtonElement | null;
    expect(restorePassword).toBeTruthy();
    restorePassword?.click();
    fixture.detectChanges();

    expect(page.querySelector('[aria-label="الألعاب على العجلة"]')?.textContent).toContain(
      'الباسورد',
    );
    expect(page.querySelector('[aria-label="الألعاب المستبعدة"]')?.textContent).not.toContain(
      'الباسورد',
    );
    expect(page.querySelector('[aria-label="الألعاب المختارة"]')?.textContent).not.toContain(
      'الباسورد',
    );
  });

  it('keeps each winner on the wheel until its popup closes', () => {
    const fixture = TestBed.createComponent(GameWheelComponent);
    fixture.detectChanges();
    const page: HTMLElement = fixture.nativeElement;
    const availableGames = page.querySelector('[aria-label="الألعاب على العجلة"]');
    const spinButton = page.querySelector(
      'button[aria-label="لف العجلة"]',
    ) as HTMLButtonElement | null;

    expect(spinButton).toBeTruthy();
    spinButton?.click();
    fixture.detectChanges();
    expect(page.querySelector('[role="dialog"]')).toBeNull();
    page.querySelector('.wheel-rotor')?.dispatchEvent(new Event('transitionend'));
    fixture.detectChanges();

    const firstPopup = page.querySelector('[role="dialog"]');
    expect(firstPopup).toBeTruthy();
    expect(firstPopup?.querySelectorAll('button')).toHaveLength(1);
    const firstPick = firstPopup?.querySelector('.winner-name')?.textContent?.trim();
    expect(firstPick).toBeTruthy();
    expect(availableGames?.textContent).toContain(firstPick);
    expect(page.querySelector('.picked-list')?.textContent).not.toContain(firstPick);
    expect(spinButton?.disabled).toBe(true);
    expect(page.querySelector('.spin-result')).toBeNull();

    const firstCloseButton = firstPopup?.querySelector(
      'button[aria-label="إغلاق نافذة الاختيار"]',
    ) as HTMLButtonElement | null;
    expect(firstCloseButton).toBeTruthy();
    firstCloseButton?.click();
    fixture.detectChanges();

    const picksAfterFirstClose = Array.from(
      page.querySelectorAll('.picked-list li:not(.empty-picked)'),
    ).map((game) => game.textContent?.trim());
    expect(picksAfterFirstClose).toEqual([firstPick]);
    expect(availableGames?.textContent).not.toContain(firstPick);
    expect(page.querySelector('[aria-label="الألعاب المستبعدة"]')?.textContent).not.toContain(
      firstPick,
    );

    spinButton?.click();
    fixture.detectChanges();
    expect(page.querySelector('[role="dialog"]')).toBeNull();
    page.querySelector('.wheel-rotor')?.dispatchEvent(new Event('transitionend'));
    fixture.detectChanges();
    const secondPopup = page.querySelector('[role="dialog"]');
    const secondPick = secondPopup?.querySelector('.winner-name')?.textContent?.trim();

    expect(secondPick).toBeTruthy();
    expect(secondPick).not.toBe(firstPick);
    expect(availableGames?.textContent).toContain(secondPick);
    const secondCloseButton = secondPopup?.querySelector(
      'button[aria-label="إغلاق نافذة الاختيار"]',
    ) as HTMLButtonElement | null;
    secondCloseButton?.click();
    fixture.detectChanges();

    const picks = Array.from(page.querySelectorAll('.picked-list li:not(.empty-picked)')).map(
      (game) => game.textContent?.trim(),
    );
    expect(picks).toEqual([firstPick, secondPick]);
    expect(availableGames?.textContent).not.toContain(secondPick);
  });

  it('commits the winner when the dialog backdrop is clicked', () => {
    const fixture = TestBed.createComponent(GameWheelComponent);
    fixture.detectChanges();
    const page: HTMLElement = fixture.nativeElement;
    const availableGames = page.querySelector('[aria-label="الألعاب على العجلة"]');
    const spinButton = page.querySelector(
      'button[aria-label="لف العجلة"]',
    ) as HTMLButtonElement | null;
    spinButton?.click();
    fixture.detectChanges();
    page.querySelector('.wheel-rotor')?.dispatchEvent(new Event('transitionend'));
    fixture.detectChanges();

    const dialog = page.querySelector('dialog') as HTMLDialogElement | null;
    const winner = dialog?.querySelector('.winner-name')?.textContent?.trim();
    expect(winner).toBeTruthy();
    expect(availableGames?.textContent).toContain(winner);

    dialog
      ?.querySelector('.winner-card')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    expect(page.querySelector('dialog')).toBe(dialog);

    dialog?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(page.querySelector('dialog')).toBeNull();
    expect(availableGames?.textContent).not.toContain(winner);
    expect(page.querySelector('.picked-list')?.textContent).toContain(winner);
  });

  it('commits the winner when Escape cancels the popup', () => {
    const fixture = TestBed.createComponent(GameWheelComponent);
    fixture.detectChanges();
    const page: HTMLElement = fixture.nativeElement;
    const availableGames = page.querySelector('[aria-label="الألعاب على العجلة"]');
    const spinButton = page.querySelector(
      'button[aria-label="لف العجلة"]',
    ) as HTMLButtonElement | null;
    spinButton?.click();
    fixture.detectChanges();
    page.querySelector('.wheel-rotor')?.dispatchEvent(new Event('transitionend'));
    fixture.detectChanges();

    const dialog = page.querySelector('dialog') as HTMLDialogElement | null;
    const winner = dialog?.querySelector('.winner-name')?.textContent?.trim();
    expect(winner).toBeTruthy();
    expect(availableGames?.textContent).toContain(winner);

    dialog?.dispatchEvent(new Event('cancel', { cancelable: true }));
    fixture.detectChanges();

    expect(page.querySelector('dialog')).toBeNull();
    expect(availableGames?.textContent).not.toContain(winner);
    expect(page.querySelector('.picked-list')?.textContent).toContain(winner);
  });

  it('disables spinning when empty and Reset starts a fresh round', () => {
    const fixture = TestBed.createComponent(GameWheelComponent);
    fixture.detectChanges();
    const page: HTMLElement = fixture.nativeElement;
    const spinButton = page.querySelector('button[aria-label="لف العجلة"]') as HTMLButtonElement;

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
    expect(page.querySelector('.empty-removed')).toBeTruthy();
    expect(page.querySelector('.empty-picked')).toBeTruthy();
    expect(spinButton.disabled).toBe(false);
  });
});
