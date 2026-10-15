import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PlayerName { id: number; playerName: string; }
export interface IhbidQuestion { id: number; questionText: string; answerText: string; }
export interface OffsideRule { id: number; ruleText: string; }
export interface Top10List { id: number; prompt: string; answers: string[]; }
export interface ScoresheetMatch {
  id: number; matchLabel: string; teamA: string; teamB: string;
  lineupA: string[]; lineupB: string[];
}
// Bank pool (SPECV3 §3.2): generic rapid-fire Q&A, fully random draws.
export interface BankQuestion { id: number; question: string; answer: string; }
// Risk (SPECV3 §3.4/§3.5): one genre + exactly 4 tiered questions, in tier
// order (5/10/20/40). `points` mirrors the authoring schema; the page reads the
// tier from the row position, not the field.
export interface RiskQuestion { points?: number; question: string; answer: string; }
export interface RiskPack { id: number; genre: string; questions: RiskQuestion[]; }
export interface BulkRowResult { index: number; ok: boolean; errors: string[]; id?: number; }

// v3 adds 'bank' + 'risk' to the pool list; their /all pagination is served by
// the same generic page() below, but neither has a page/route yet.
export type Pool = 'players' | 'ihbid' | 'offside' | 'top10' | 'scoresheet' | 'bank' | 'risk';

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

const BASE = 'http://localhost:8080/api';
export const API_BASE = BASE;

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  // Admin session flag (tab lifetime). Wrong passwords surface as 401 on use.
  readonly adminPassword = signal<string | null>(sessionStorage.getItem('ta7ady-admin'));

  unlock(password: string): void {
    this.adminPassword.set(password);
    sessionStorage.setItem('ta7ady-admin', password);
  }

  lock(): void {
    this.adminPassword.set(null);
    sessionStorage.removeItem('ta7ady-admin');
  }

  get unlocked(): boolean {
    return this.adminPassword() !== null;
  }

  private adminHeaders(): { headers?: HttpHeaders } {
    const pw = this.adminPassword();
    return pw ? { headers: new HttpHeaders({ 'X-Admin-Password': pw }) } : {};
  }

  bulk(pool: Pool, rows: unknown[], dryRun: boolean): Observable<BulkRowResult[]> {
    const params = new HttpParams().set('dryRun', dryRun);
    return this.http.post<BulkRowResult[]>(`${BASE}/${pool}/bulk`, rows, { params });
  }

  // Generic paged listing for any pool (the /manage list view).
  page<T>(pool: Pool, page = 0, size = 20): Observable<Page<T>> {
    const params = new HttpParams().set('page', page).set('size', size).set('sort', 'id,desc');
    return this.http.get<Page<T>>(`${BASE}/${pool}/all`, { params });
  }

  // Generic admin-gated delete for any pool.
  del(pool: Pool, id: number): Observable<void> {
    return this.http.delete<void>(`${BASE}/${pool}/${id}`, this.adminHeaders());
  }

  // Merged player pool: password + acting share the same backend table.
  // Canonical endpoint is /players; /password and /acting are aliases.
  playersRandom10(count = 10): Observable<PlayerName[]> {
    return this.http.get<PlayerName[]>(`${BASE}/players?count=${count}`);
  }
  addPlayer(playerName: string): Observable<PlayerName> {
    return this.http.post<PlayerName>(`${BASE}/players`, { playerName });
  }

  ihbidRandom10(count = 10): Observable<IhbidQuestion[]> {
    return this.http.get<IhbidQuestion[]>(`${BASE}/ihbid?count=${count}`);
  }
  addIhbid(questionText: string, answerText: string): Observable<IhbidQuestion> {
    return this.http.post<IhbidQuestion>(`${BASE}/ihbid`, { questionText, answerText });
  }

  offsideRandom10(count = 10): Observable<OffsideRule[]> {
    return this.http.get<OffsideRule[]>(`${BASE}/offside?count=${count}`);
  }
  addOffside(ruleText: string): Observable<OffsideRule> {
    return this.http.post<OffsideRule>(`${BASE}/offside`, { ruleText });
  }

  top10Random(count = 1): Observable<Top10List[]> {
    return this.http.get<Top10List[]>(`${BASE}/top10?count=${count}`);
  }
  addTop10(prompt: string, answers: string[]): Observable<Top10List> {
    return this.http.post<Top10List>(`${BASE}/top10`, { prompt, answers });
  }

  scoresheetRandom(count = 1): Observable<ScoresheetMatch[]> {
    return this.http.get<ScoresheetMatch[]>(`${BASE}/scoresheet?count=${count}`);
  }
  addScoresheet(
    matchLabel: string, teamA: string, teamB: string, lineupA: string[], lineupB: string[],
  ): Observable<ScoresheetMatch> {
    return this.http.post<ScoresheetMatch>(`${BASE}/scoresheet`, {
      matchLabel, teamA, teamB, lineupA, lineupB,
    });
  }

  // Risk packs: a draw of `count` packs (4 = one board; reroll fetches 1).
  riskRandom(count = 4): Observable<RiskPack[]> {
    return this.http.get<RiskPack[]>(`${BASE}/risk?count=${count}`);
  }

  // Bank pool (SPECV3 §3.2): rapid-fire Q&A; the game draws ?count=72 once.
  bankRandom(count = 12): Observable<BankQuestion[]> {
    return this.http.get<BankQuestion[]>(`${BASE}/bank?count=${count}`);
  }
  addBank(question: string, answer: string): Observable<BankQuestion> {
    return this.http.post<BankQuestion>(`${BASE}/bank`, { question, answer });
  }

  addRisk(genre: string, questions: RiskQuestion[]): Observable<RiskPack> {
    return this.http.post<RiskPack>(`${BASE}/risk`, { genre, questions });
  }

  // Admin-gated edit (SPECV3 §3.1): instant apply via PUT, same body shape as
  // create per pool (bank/risk included once their backend exists).
  update(pool: Pool, id: number, body: unknown): Observable<unknown> {
    return this.http.put<unknown>(`${BASE}/${pool}/${id}`, body, this.adminHeaders());
  }
}
