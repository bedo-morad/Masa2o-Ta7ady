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
    const firstWinner = currentRound.chooseWinner();
    if (firstWinner) currentRound.pickWinner(firstWinner.id);
    const secondWinner = currentRound.chooseWinner();
    if (secondWinner) currentRound.pickWinner(secondWinner.id);
    expect(firstWinner).toBeTruthy();
    expect(secondWinner).toBeTruthy();

    const expectedRemaining = currentRound.remainingGames().map((game) => game.id);
    const expectedRemoved = currentRound.removedGames().map((game) => game.id);
    const expectedPicked = currentRound.pickedGames().map((game) => game.id);
    const afterReload = new GameWheelStateService();

    expect(afterReload.remainingGames().map((game) => game.id)).toEqual(expectedRemaining);
    expect(afterReload.removedGames().map((game) => game.id)).toEqual(expectedRemoved);
    expect(afterReload.pickedGames().map((game) => game.id)).toEqual(expectedPicked);
  });

  it('keeps a selected winner available until it is committed', () => {
    const round = TestBed.inject(GameWheelStateService);
    const winner = round.chooseWinner();

    expect(winner).toBeTruthy();
    expect(round.remainingGames().map((game) => game.id)).toContain(winner?.id);
    expect(round.pickedGames()).toHaveLength(0);

    if (!winner) throw new Error('A fresh wheel should have a winner to choose.');
    round.pickWinner(winner.id);

    expect(round.remainingGames().map((game) => game.id)).not.toContain(winner.id);
    expect(round.pickedGames().map((game) => game.id)).toContain(winner.id);
  });

  it('does not restore a winner through the manually removed-games action', () => {
    const round = TestBed.inject(GameWheelStateService);
    const winner = round.chooseWinner();
    if (!winner) throw new Error('A fresh wheel should have a winner to choose.');
    round.pickWinner(winner.id);

    round.restoreRemovedGame(winner.id);

    expect(round.remainingGames().map((game) => game.id)).not.toContain(winner.id);
    expect(round.removedGames().map((game) => game.id)).not.toContain(winner.id);
    expect(round.pickedGames().map((game) => game.id)).toContain(winner.id);
  });
});
