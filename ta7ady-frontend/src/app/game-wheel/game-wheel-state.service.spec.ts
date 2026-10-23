import { TestBed } from '@angular/core/testing';
import { GameWheelStateService } from './game-wheel-state.service';

describe('GameWheelStateService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  afterEach(() => localStorage.clear());

  it('restores remaining games and pick order in a fresh instance', () => {
    const currentRound = TestBed.inject(GameWheelStateService);
    currentRound.removeGame('password');
    const firstWinner = currentRound.spin();
    const secondWinner = currentRound.spin();
    expect(firstWinner).toBeTruthy();
    expect(secondWinner).toBeTruthy();

    const expectedRemaining = currentRound.remainingGames().map((game) => game.id);
    const expectedPicked = currentRound.pickedGames().map((game) => game.id);
    const afterReload = new GameWheelStateService();

    expect(afterReload.remainingGames().map((game) => game.id)).toEqual(expectedRemaining);
    expect(afterReload.pickedGames().map((game) => game.id)).toEqual(expectedPicked);
  });
});
