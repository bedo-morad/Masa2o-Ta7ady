import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { HotToastService } from '@ngxpert/hot-toast';
import {
  AnameenSubject,
  ApiService,
  BankQuestion,
  IhbidQuestion,
  OffsideRule,
  PlayerName,
  RiskPack,
  ScoresheetMatch,
  Top10List,
  WhoPicturePhoto,
} from '../../api.service';
import { ManageComponent } from '../manage.component';

export const managePools = [
  'players',
  'ihbid',
  'offside',
  'top10',
  'scoresheet',
  'bank',
  'risk',
  'anameen',
  'whopicture',
] as const;
export type ManagePool = (typeof managePools)[number];

export const catalogRows: Record<
  ManagePool,
  | PlayerName
  | IhbidQuestion
  | OffsideRule
  | Top10List
  | ScoresheetMatch
  | BankQuestion
  | RiskPack
  | AnameenSubject
  | WhoPicturePhoto
> = {
  players: { id: 1, playerName: 'players fixture' },
  ihbid: { id: 2, questionText: 'ihbid fixture', answerText: 'answer' },
  offside: { id: 3, ruleText: 'offside fixture' },
  top10: { id: 4, prompt: 'top10 fixture', answers: ['one', 'two'] },
  scoresheet: {
    id: 5,
    matchLabel: 'scoresheet fixture',
    teamA: 'A',
    teamB: 'B',
    lineupA: ['A1'],
    lineupB: ['B1'],
  },
  bank: { id: 6, question: 'bank fixture', answer: 'answer' },
  risk: {
    id: 7,
    genre: 'risk fixture',
    questions: [
      { points: 5, question: 'risk one', answer: 'answer one' },
      { points: 10, question: 'risk two', answer: 'answer two' },
      { points: 20, question: 'risk three', answer: 'answer three' },
      { points: 40, question: 'risk four', answer: 'answer four' },
    ],
  },
  anameen: {
    id: 8,
    player: 'anameen fixture',
    clues: ['clue one', 'clue two', 'clue three', 'clue four', 'clue five'],
  },
  whopicture: {
    id: 9,
    title: 'whopicture fixture',
    photoUrl: 'https://fixture',
    players: [
      'one',
      'two',
      'three',
      'four',
      'five',
      'six',
      'seven',
      'eight',
      'nine',
      'ten',
      'eleven',
    ],
  },
};

const toastStub = () => ({ success: vi.fn(), error: vi.fn() });
const modalStub = () => ({ open: vi.fn(), dismissAll: vi.fn() });

export async function setupCatalog() {
  const adminPassword = signal<string | null>('pw');
  const apiStub = {
    adminPassword,
    unlock: vi.fn(),
    lock: vi.fn(),
    del: vi.fn(() => of(undefined)),
    bulk: vi.fn(() => of([])),
  };
  await TestBed.configureTestingModule({
    imports: [ManageComponent],
    providers: [
      provideHttpClientTesting(),
      provideRouter([]),
      { provide: ApiService, useValue: apiStub },
      { provide: NgbModal, useValue: modalStub() },
      { provide: HotToastService, useValue: toastStub() },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(ManageComponent);
  fixture.detectChanges();
  const httpMock = TestBed.inject(HttpTestingController);
  httpMock
    .expectOne((r) => r.url.includes('/players/all'))
    .flush({
      content: [catalogRows.players],
      totalElements: 21,
      totalPages: 2,
      number: 0,
      size: 20,
    });
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, apiStub, httpMock };
}

export function page(
  httpMock: HttpTestingController,
  pool: ManagePool,
  content: unknown[] = [],
): void {
  httpMock
    .expectOne((r) => r.url.includes(`/${pool}/all`))
    .flush({
      content,
      totalElements: content.length,
      totalPages: content.length ? 1 : 0,
      number: 0,
      size: 20,
    });
}
