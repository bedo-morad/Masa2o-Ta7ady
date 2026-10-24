import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { GAME_CATALOG } from '../../shared/game-catalog';
import type { GameId, GameOption } from '../../shared/game-catalog';
import { GameStatePanelComponent } from './game-state-panel.component';

describe('GameStatePanelComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GameStatePanelComponent],
    }).compileComponents();
  });

  function renderPanel(
    remainingGames: readonly GameOption[],
    removedGames: readonly GameOption[],
    pickedGames: readonly GameOption[],
  ): ComponentFixture<GameStatePanelComponent> {
    const fixture = TestBed.createComponent(GameStatePanelComponent);
    fixture.componentRef.setInput('remainingGames', remainingGames);
    fixture.componentRef.setInput('removedGames', removedGames);
    fixture.componentRef.setInput('pickedGames', pickedGames);
    fixture.detectChanges();
    return fixture;
  }

  it('renders the three round categories and preserves picked order', () => {
    const remaining = GAME_CATALOG.slice(0, 2);
    const removed = GAME_CATALOG.slice(2, 3);
    const picked = GAME_CATALOG.slice(3, 5);
    const page: HTMLElement = renderPanel(remaining, removed, picked).nativeElement;

    expect(page.querySelector('.game-count')?.textContent?.trim()).toBe('2');
    expect(
      Array.from(page.querySelectorAll('.remaining-list li:not(.empty-available)')).map((item) =>
        item.textContent?.trim(),
      ),
    ).toEqual(remaining.map((game) => game.name));
    expect(
      Array.from(page.querySelectorAll('.removed-list li:not(.empty-removed)')).map((item) =>
        item.querySelector('span')?.textContent?.trim(),
      ),
    ).toEqual(removed.map((game) => game.name));
    expect(
      Array.from(page.querySelectorAll('.picked-list li:not(.empty-picked)')).map((item) =>
        item.textContent?.trim(),
      ),
    ).toEqual(picked.map((game) => game.name));
  });

  it('shows the empty state for each round category', () => {
    const page: HTMLElement = renderPanel([], [], []).nativeElement;

    expect(page.querySelector('.empty-available')?.textContent?.trim()).toBe(
      'مفيش ألعاب على العجلة',
    );
    expect(page.querySelector('.empty-removed')?.textContent?.trim()).toBe('مفيش ألعاب مستبعدة');
    expect(page.querySelector('.empty-picked')?.textContent?.trim()).toBe('لسه ما اختارتش لعبة');
  });

  it('emits remove, restore, and reset intents through its interface', () => {
    const remaining = GAME_CATALOG.slice(0, 1);
    const removed = GAME_CATALOG.slice(1, 2);
    const fixture = renderPanel(remaining, removed, []);
    const page: HTMLElement = fixture.nativeElement;
    const removedIds: GameId[] = [];
    const restoredIds: GameId[] = [];
    let resetCount = 0;
    fixture.componentInstance.removeGame.subscribe((gameId) => removedIds.push(gameId));
    fixture.componentInstance.restoreGame.subscribe((gameId) => restoredIds.push(gameId));
    fixture.componentInstance.resetRound.subscribe(() => resetCount++);

    page.querySelector<HTMLButtonElement>('.remove-game')?.click();
    page.querySelector<HTMLButtonElement>('.restore-game')?.click();
    page.querySelector<HTMLButtonElement>('.reset-button')?.click();

    expect(removedIds).toEqual(remaining.map((game) => game.id));
    expect(restoredIds).toEqual(removed.map((game) => game.id));
    expect(resetCount).toBe(1);
  });
});
