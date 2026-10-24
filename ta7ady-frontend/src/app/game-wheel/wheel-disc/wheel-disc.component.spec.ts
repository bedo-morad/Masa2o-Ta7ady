import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { ThemeService } from '../../services/theme.service';
import { GAME_CATALOG } from '../../shared/game-catalog';
import type { GameOption } from '../../shared/game-catalog';
import { WheelDiscComponent } from './wheel-disc.component';

describe('WheelDiscComponent', () => {
  afterEach(() => localStorage.clear());

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WheelDiscComponent],
    }).compileComponents();
  });

  function renderWheel(
    games: readonly GameOption[],
    rotation = 0,
    spinning = false,
  ): ComponentFixture<WheelDiscComponent> {
    const fixture = TestBed.createComponent(WheelDiscComponent);
    fixture.componentRef.setInput('games', games);
    fixture.componentRef.setInput('rotation', rotation);
    fixture.componentRef.setInput('spinning', spinning);
    fixture.detectChanges();
    return fixture;
  }

  it('renders labeled sectors and counter-rotates labels when the wheel stops', () => {
    const fixture = renderWheel(GAME_CATALOG.slice(0, 2), 270);
    const root: HTMLElement = fixture.nativeElement;
    const labels = Array.from(root.querySelectorAll('text.segment-label'));

    expect(root.querySelectorAll('path.sector-0, path.sector-1')).toHaveLength(2);
    expect(labels.map((label) => label.textContent?.trim())).toEqual(['الباسورد', 'التمثيل']);
    expect(labels[0]?.getAttribute('transform')).toBe('rotate(-270)');
    expect(root.querySelector('svg')?.getAttribute('aria-label')).toBe('عجلة الحظ، 2 ألعاب متاحة');

    fixture.componentRef.setInput('spinning', true);
    fixture.detectChanges();
    expect(labels[0]?.getAttribute('transform')).toBe('rotate(0)');
  });

  it('renders the empty wheel when no games are available', () => {
    const root: HTMLElement = renderWheel([]).nativeElement;

    expect(root.querySelectorAll('path.sector-0, path.sector-1')).toHaveLength(0);
    expect(root.querySelector('circle.empty-disc')).toBeTruthy();
    expect(root.querySelector('svg')?.getAttribute('aria-label')).toBe('عجلة الحظ، 0 ألعاب متاحة');
  });

  it('follows the active theme and emits when the rotor transition completes', () => {
    const fixture = renderWheel(GAME_CATALOG.slice(0, 2));
    const root: HTMLElement = fixture.nativeElement;
    const icon = root.querySelector('.wheel-center-icon');
    const theme = TestBed.inject(ThemeService);
    const spinFinished = vi.fn();
    fixture.componentInstance.spinFinished.subscribe(spinFinished);

    theme.setTheme('sand');
    fixture.detectChanges();
    expect(icon?.classList.contains('dark-theme-icon')).toBe(false);

    theme.setTheme('lapis');
    fixture.detectChanges();
    expect(icon?.classList.contains('dark-theme-icon')).toBe(true);

    root.querySelector('.wheel-rotor')?.dispatchEvent(new Event('transitionend'));
    expect(spinFinished).toHaveBeenCalledOnce();
  });
});
