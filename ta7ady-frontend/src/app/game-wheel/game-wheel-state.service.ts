import { Injectable, computed, signal } from '@angular/core';
import { GAME_CATALOG, type GameId, type GameOption } from '../shared/game-catalog';

interface GameWheelRound {
  readonly remaining: readonly GameOption[];
  readonly removed: readonly GameOption[];
  readonly picked: readonly GameOption[];
}

interface StoredGameWheelRound {
  readonly remainingIds: readonly string[];
  readonly removedIds?: readonly string[];
  readonly pickedIds: readonly string[];
}

const STORAGE_KEY = 'ta7ady-game-wheel';
const GAMES_BY_ID = new Map<string, GameOption>(GAME_CATALOG.map((game) => [game.id, game]));

function isStoredRound(value: unknown): value is StoredGameWheelRound {
  if (typeof value !== 'object' || value === null) return false;

  const candidate = value as Record<string, unknown>;
  const remainingIds = candidate['remainingIds'];
  const removedIds = candidate['removedIds'] ?? [];
  const pickedIds = candidate['pickedIds'];
  return (
    Array.isArray(remainingIds) &&
    remainingIds.every((id) => typeof id === 'string') &&
    Array.isArray(removedIds) &&
    removedIds.every((id) => typeof id === 'string') &&
    Array.isArray(pickedIds) &&
    pickedIds.every((id) => typeof id === 'string')
  );
}

function gamesFromIds(ids: readonly string[]): readonly GameOption[] {
  const seen = new Set<string>();
  const games: GameOption[] = [];
  for (const id of ids) {
    const game = GAMES_BY_ID.get(id);
    if (!game || seen.has(id)) continue;
    seen.add(id);
    games.push(game);
  }
  return games;
}

function freshRound(): GameWheelRound {
  return { remaining: GAME_CATALOG, removed: [], picked: [] };
}

@Injectable({ providedIn: 'root' })
export class GameWheelStateService {
  private readonly round = signal<GameWheelRound>(this.restoreRound());

  readonly remainingGames = computed(() => this.round().remaining);
  readonly removedGames = computed(() => this.round().removed);
  readonly pickedGames = computed(() => this.round().picked);

  removeGame(gameId: GameId): void {
    const current = this.round();
    const game = current.remaining.find((item) => item.id === gameId);
    if (!game) return;

    this.saveRound({
      ...current,
      remaining: current.remaining.filter((item) => item.id !== gameId),
      removed: [...current.removed, game],
    });
  }

  restoreRemovedGame(gameId: GameId): void {
    const current = this.round();
    const game = current.removed.find((item) => item.id === gameId);
    if (!game) return;

    this.saveRound({
      ...current,
      remaining: [...current.remaining, game],
      removed: current.removed.filter((item) => item.id !== gameId),
    });
  }

  chooseWinner(): GameOption | null {
    const current = this.round();
    if (current.remaining.length === 0) return null;

    const winnerIndex = Math.floor(Math.random() * current.remaining.length);
    const winner = current.remaining[winnerIndex];
    return winner ?? null;
  }

  pickWinner(gameId: GameId): void {
    const current = this.round();
    const winner = current.remaining.find((game) => game.id === gameId);
    if (!winner) return;

    this.saveRound({
      ...current,
      remaining: current.remaining.filter((game) => game.id !== winner.id),
      picked: [...current.picked, winner],
    });
  }

  resetRound(): void {
    this.saveRound(freshRound());
  }

  private restoreRound(): GameWheelRound {
    try {
      const storedValue = localStorage.getItem(STORAGE_KEY);
      if (!storedValue) return freshRound();

      const parsed: unknown = JSON.parse(storedValue);
      if (!isStoredRound(parsed)) return freshRound();

      const picked = gamesFromIds(parsed.pickedIds);
      const pickedIds = new Set(picked.map((game) => game.id));
      const removed = gamesFromIds(parsed.removedIds ?? []).filter(
        (game) => !pickedIds.has(game.id),
      );
      const unavailableIds = new Set([...pickedIds, ...removed.map((game) => game.id)]);
      const remaining = gamesFromIds(parsed.remainingIds).filter(
        (game) => !unavailableIds.has(game.id),
      );
      return { remaining, removed, picked };
    } catch {
      return freshRound();
    }
  }

  private saveRound(round: GameWheelRound): void {
    this.round.set(round);
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          remainingIds: round.remaining.map((game) => game.id),
          removedIds: round.removed.map((game) => game.id),
          pickedIds: round.picked.map((game) => game.id),
        }),
      );
    } catch {
      // Continue in memory when browser storage is unavailable.
    }
  }
}
