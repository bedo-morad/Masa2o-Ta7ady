import { signal } from '@angular/core';

const LINEUP_SIZE = 11;

/** Persistent Score Sheet draft state; mutation policy remains at the Manage seam. */
export class ScoreSheetEditor {
  readonly newMatch = signal('');
  readonly newTeamA = signal('');
  readonly newTeamB = signal('');
  readonly lineupA = signal<string[]>(Array(LINEUP_SIZE).fill(''));
  readonly lineupB = signal<string[]>(Array(LINEUP_SIZE).fill(''));
  readonly editMatch = signal('');
  readonly editTeamA = signal('');
  readonly editTeamB = signal('');
  readonly editLineupA = signal<string[]>(Array(LINEUP_SIZE).fill(''));
  readonly editLineupB = signal<string[]>(Array(LINEUP_SIZE).fill(''));

  setLineupA(index: number, value: string): void {
    this.lineupA.update((items) => items.map((item, i) => i === index ? value : item));
  }
  setLineupB(index: number, value: string): void {
    this.lineupB.update((items) => items.map((item, i) => i === index ? value : item));
  }
  setEditLineupA(index: number, value: string): void {
    this.editLineupA.update((items) => items.map((item, i) => i === index ? value : item));
  }
  setEditLineupB(index: number, value: string): void {
    this.editLineupB.update((items) => items.map((item, i) => i === index ? value : item));
  }
  prefill(row: { matchLabel: string; teamA: string; teamB: string; lineupA: string[]; lineupB: string[] }): void {
    this.editMatch.set(row.matchLabel);
    this.editTeamA.set(row.teamA);
    this.editTeamB.set(row.teamB);
    this.editLineupA.set([...row.lineupA]);
    this.editLineupB.set([...row.lineupB]);
  }
}

/** Persistent Who-in-Picture draft state; ordered names are never re-keyed. */
export class WhoPictureEditor {
  readonly newPhotoTitle = signal('');
  readonly newPhotoUrl = signal('');
  readonly newPhotoPlayers = signal<string[]>(Array(LINEUP_SIZE).fill(''));
  readonly editPhotoTitle = signal('');
  readonly editPhotoUrl = signal('');
  readonly editPhotoPlayers = signal<string[]>(Array(LINEUP_SIZE).fill(''));

  setNewPlayer(index: number, value: string): void {
    this.newPhotoPlayers.update((items) => items.map((item, i) => i === index ? value : item));
  }
  setEditPlayer(index: number, value: string): void {
    this.editPhotoPlayers.update((items) => items.map((item, i) => i === index ? value : item));
  }
  prefill(row: { title: string; photoUrl: string; players: string[] }): void {
    this.editPhotoTitle.set(row.title);
    this.editPhotoUrl.set(row.photoUrl);
    this.editPhotoPlayers.set([...row.players]);
  }
}

/** Explicit construction seam kept local to Manage; no generic form/transport adapter. */
export function createPoolEditors(): { scoresheet: ScoreSheetEditor; whopicture: WhoPictureEditor } {
  return { scoresheet: new ScoreSheetEditor(), whopicture: new WhoPictureEditor() };
}
