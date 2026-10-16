import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import {
  BANK_CHAIN_MAX,
  BANK_CHAIN_STEPS,
  BANK_PER_ROUND,
  BANK_ROUNDS,
  BANK_TOTAL,
  BankComponent,
} from './bank.component';
import { BankQuestion } from '../api.service';

describe('bank constants', () => {
  it('fixes the game shape: 6 rounds × 12 questions = one 72 draw', () => {
    expect(BANK_ROUNDS).toBe(6);
    expect(BANK_PER_ROUND).toBe(12);
    expect(BANK_TOTAL).toBe(72);
  });

  it('ladders the chain 1 → 2 → 4 … 2048', () => {
    expect(BANK_CHAIN_STEPS.length).toBe(12);
    expect(BANK_CHAIN_STEPS[0]).toBe(1);
    expect(BANK_CHAIN_STEPS[1]).toBe(2);
    expect(BANK_CHAIN_STEPS[2]).toBe(4);
    expect(BANK_CHAIN_STEPS.at(-1)).toBe(BANK_CHAIN_MAX);
  });
});

describe('BankComponent', () => {
  const draw = (n: number): BankQuestion[] =>
    Array.from({ length: n }, (_, i) => ({
      id: i + 1,
      question: `سؤال ${i + 1}`,
      answer: `جواب ${i + 1}`,
    }));

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [BankComponent],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();
  });

  function setup(): BankComponent {
    const fixture = TestBed.createComponent(BankComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('creates with no start team and an empty chain', () => {
    const c = setup();
    expect(c).toBeTruthy();
    expect(c.startTeam()).toBeNull();
    expect(c.teamOfRound(0)).toBeNull();
    expect(c.chainOf(0)).toBe(0);
    expect(c.bankedOf(0)).toBe(0);
    expect(c.audit().length).toBe(0);
  });

  it('chunks the single 72-draw 12 per round with no repeats', () => {
    const c = setup();
    c.questions.set(draw(72));
    const all = c.rounds.flatMap((r) => c.roundQuestions(r));
    expect(c.roundQuestions(0).length).toBe(12);
    expect(c.roundQuestions(5).length).toBe(12);
    expect(all.length).toBe(72);
    expect(new Set(all.map((q) => q.id)).size).toBe(72);
    expect(c.roundQuestions(1)[0].id).toBe(13);
  });

  it('auto-alternates the picked start team across the six rounds', () => {
    const c = setup();
    c.pickStart('B');
    expect(c.teamOfRound(0)).toBe('B');
    expect(c.teamOfRound(1)).toBe('A');
    expect(c.teamOfRound(2)).toBe('B');
    expect(c.teamOfRound(5)).toBe('A');
  });

  it('Correct sets 1 on a zeroed chain, then doubles (0 → 1 → 2 → 4 → 8)', () => {
    const c = setup();
    expect(c.chainOf(0)).toBe(0);
    c.correct();
    expect(c.chainOf(0)).toBe(1);
    c.correct();
    expect(c.chainOf(0)).toBe(2);
    c.correct();
    expect(c.chainOf(0)).toBe(4);
    c.correct();
    expect(c.chainOf(0)).toBe(8);
  });

  it('caps the chain at 2048', () => {
    const c = setup();
    for (let i = 0; i < 20; i++) c.correct();
    expect(c.chainOf(0)).toBe(BANK_CHAIN_MAX);
  });

  it('Miss zeroes the unbanked chain; the next Correct sets 1 again', () => {
    const c = setup();
    c.correct();
    c.correct();
    expect(c.chainOf(0)).toBe(2);
    c.miss();
    expect(c.chainOf(0)).toBe(0);
    c.correct();
    expect(c.chainOf(0)).toBe(1);
  });

  it('Correct and Miss never write scores or the audit by themselves', () => {
    const c = setup();
    c.pickStart('A');
    c.correct();
    c.correct();
    c.miss();
    c.correct();
    expect(c.scoreA()).toBe(0);
    expect(c.scoreB()).toBe(0);
    expect(c.audit().length).toBe(0);
  });

  it('BANK is the only writer: scoreboard delta + audit, then chain resets to 0', () => {
    const c = setup();
    c.pickStart('A');
    c.correct();
    c.correct(); // chain 2
    c.correct(); // chain 4
    c.bank();
    expect(c.scoreA()).toBe(4);
    expect(c.scoreB()).toBe(0);
    expect(c.audit().at(-1)).toEqual(
      expect.objectContaining({ team: 'A', delta: 4, label: 'بنك الدور 1' }),
    );
    expect(c.bankedOf(0)).toBe(4);
    expect(c.chainOf(0)).toBe(0);
  });

  it('BANK credits the round owner, not always team A', () => {
    const c = setup();
    c.pickStart('A');
    c.go(1); // round 2 belongs to team B
    c.correct();
    c.correct(); // chain 2
    c.bank();
    expect(c.scoreA()).toBe(0);
    expect(c.scoreB()).toBe(2);
    expect(c.bankedOf(1)).toBe(2);
    expect(c.chainOf(1)).toBe(0);
  });

  it('BANK accumulates across the same round', () => {
    const c = setup();
    c.pickStart('A');
    c.correct(); // 1
    c.bank();
    c.correct(); // 1
    c.correct(); // 2
    c.bank();
    expect(c.scoreA()).toBe(3);
    expect(c.bankedOf(0)).toBe(3);
  });

  it('BANK on a zeroed chain writes nothing', () => {
    const c = setup();
    c.pickStart('A');
    c.bank(); // chain still 0
    expect(c.scoreA()).toBe(0);
    expect(c.audit().length).toBe(0);
    expect(c.bankedOf(0)).toBe(0);
  });

  it('BANK before the start team is picked writes nothing', () => {
    const c = setup();
    c.correct(); // chain 1, but no round owner yet
    c.bank();
    expect(c.scoreA()).toBe(0);
    expect(c.scoreB()).toBe(0);
    expect(c.audit().length).toBe(0);
  });

  it('keeps a separate chain per round', () => {
    const c = setup();
    c.pickStart('A');
    c.correct(); // round 1 → 1
    c.go(2);
    expect(c.chainOf(2)).toBe(0);
    c.correct(); // round 3 → 1
    c.go(0);
    expect(c.chainOf(0)).toBe(1);
    expect(c.chainOf(2)).toBe(1);
  });

  it('navigation stays in bounds', () => {
    const c = setup();
    c.prev();
    expect(c.idx()).toBe(0);
    c.next();
    expect(c.idx()).toBe(1);
    c.go(BANK_ROUNDS - 1);
    c.next();
    expect(c.idx()).toBe(BANK_ROUNDS - 1);
    c.prev();
    expect(c.idx()).toBe(BANK_ROUNDS - 2);
  });

  it('shows one card at a time with the answer open', () => {
    const c = setup();
    c.questions.set(draw(72));
    const q = c.currentQuestion();
    expect(q?.question).toBe('سؤال 1');
    expect(q?.answer).toBe('جواب 1');
  });

  it('pages the round cards and stops at both ends', () => {
    const c = setup();
    c.questions.set(draw(72));
    expect(c.qCount()).toBe(12);
    c.qPrev();
    expect(c.qIdx()).toBe(0); // greyed at the first card
    c.qNext();
    expect(c.currentQuestion()?.id).toBe(2);
    c.qIdx.set(11);
    c.qNext();
    expect(c.qIdx()).toBe(11); // greyed at the last card
    c.qPrev();
    expect(c.currentQuestion()?.id).toBe(11);
  });

  it('a round change resets the question cursor to the first card', () => {
    const c = setup();
    c.questions.set(draw(72));
    c.pickStart('A');
    c.qNext();
    c.qNext();
    expect(c.qIdx()).toBe(2);
    c.next();
    expect(c.qIdx()).toBe(0);
    c.qNext();
    expect(c.qIdx()).toBe(1);
    c.prev();
    expect(c.qIdx()).toBe(0);
    c.go(3);
    expect(c.qIdx()).toBe(0);
  });

  it('builds an encoded google search url per question', () => {
    const c = setup();
    expect(c.googleUrl('من فاز 1990؟')).toBe(
      `https://www.google.com/search?q=${encodeURIComponent('من فاز 1990؟')}`,
    );
  });

  it('newGame re-gates the start team and clears every tally', () => {
    const c = setup();
    c.questions.set(draw(72));
    c.pickStart('A');
    c.correct();
    c.bank();
    c.go(3);
    c.qNext();
    c.newGame();
    expect(c.startTeam()).toBeNull();
    expect(c.idx()).toBe(0);
    expect(c.qIdx()).toBe(0);
    expect(c.chainOf(0)).toBe(0);
    expect(c.bankedOf(0)).toBe(0);
    expect(c.scoreA()).toBe(0);
    expect(c.scoreB()).toBe(0);
    expect(c.audit().length).toBe(0);
  });
});
