import { Type, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AnameenComponent } from './anameen/anameen.component';
import { BankComponent } from './bank/bank.component';
import { RiskComponent } from './risk/risk.component';
import { ScoresheetComponent } from './scoresheet/scoresheet.component';
import { Top10Component } from './top10/top10.component';
import { WhopictureComponent } from './whopicture/whopicture.component';
import { AuditEntry } from './shared/attribution/attribution.component';

interface AuditedGame {
  audit: WritableSignal<AuditEntry[]>;
  scoreA: WritableSignal<number>;
}

/** Exercise populated game pages: an empty draw must not hide a missing assertion. */
async function expectHistoryHidden<T extends AuditedGame>(
  component: Type<T>,
  prepare: (game: T) => void,
  contentSelector: string,
): Promise<void> {
  await TestBed.configureTestingModule({
    imports: [component],
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
  }).compileComponents();
  const fixture = TestBed.createComponent(component);
  fixture.detectChanges();
  const game = fixture.componentInstance;
  prepare(game);
  const entries: AuditEntry[] = [{ seq: 1, team: 'A', label: 'احتساب سابق', delta: 1 }];
  game.audit.set(entries);
  game.scoreA.set(-3);
  fixture.detectChanges();
  const root: HTMLElement = fixture.nativeElement;
  expect(root.querySelector(contentSelector)).not.toBeNull();
  expect(root.querySelector('app-audit-strip, .audit, .history, .dot-bank')).toBeNull();
  expect(game.audit()).toBe(entries);
  expect(game.scoreA()).toBe(-3);
}

const players = Array.from({ length: 11 }, (_, i) => `لاعب ${i + 1}`);

describe('Game history visibility', () => {
  beforeEach(() => localStorage.clear());

  it('keeps Ana Meen history data without rendering the score log', async () => {
    await expectHistoryHidden(
      AnameenComponent,
      (game) => {
        game.subjects.set([{ id: 1, player: 'لاعب', clues: ['أ', 'ب', 'ج', 'د', 'هـ'] }]);
      },
      '.dossier',
    );
  });

  it('keeps Bank rounds and banked totals without history summaries', async () => {
    await expectHistoryHidden(
      BankComponent,
      (game) => {
        game.pickStart('A');
        game.correct();
        game.bank();
        expect(game.bankedOf(0)).toBe(1);
      },
      '.chain',
    );
  });

  it('keeps Risk history data without rendering the score log', async () => {
    await expectHistoryHidden(
      RiskComponent,
      (game) => {
        game.loadBoard([
          {
            id: 1,
            genre: 'مجموعة',
            questions: [5, 10, 20, 40].map((points) => ({
              points,
              question: 'سؤال',
              answer: 'جواب',
            })),
          },
        ]);
      },
      '.board',
    );
  });

  it('keeps Score Sheet history data without rendering the score log', async () => {
    await expectHistoryHidden(
      ScoresheetComponent,
      (game) => {
        game.matches.set([
          {
            id: 1,
            matchLabel: 'نهائي',
            teamA: 'أ',
            teamB: 'ب',
            lineupA: players,
            lineupB: players,
          },
        ]);
        game.slotsOf(game.matches()[0]);
      },
      '.board',
    );
  });

  it('keeps Top 10 history data without rendering the score log', async () => {
    await expectHistoryHidden(
      Top10Component,
      (game) => {
        game.lists.set([{ id: 1, prompt: 'الترتيب', answers: players }]);
      },
      '.board',
    );
  });

  it('keeps Who-in-Picture history data without rendering the score log', async () => {
    await expectHistoryHidden(
      WhopictureComponent,
      (game) => {
        game.photos.set([{ id: 1, title: 'التشكيلة', photoUrl: '/photo.jpg', players }]);
      },
      '.photo-card',
    );
  });
});
