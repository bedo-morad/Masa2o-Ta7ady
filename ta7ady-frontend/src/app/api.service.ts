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
export interface BulkRowResult { index: number; ok: boolean; errors: string[]; id?: number; }

export type Pool = 'players' | 'ihbid' | 'offside' | 'top10' | 'scoresheet';

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

  // Merged player pool: password + acting share the same backend table.
  // Canonical endpoint is /players; /password and /acting are aliases.
  playersRandom10(count = 10): Observable<PlayerName[]> {
    return this.http.get<PlayerName[]>(`${BASE}/players?count=${count}`);
  }
  playersPage(page = 0, size = 20): Observable<Page<PlayerName>> {
    const params = new HttpParams().set('page', page).set('size', size).set('sort', 'id,desc');
    return this.http.get<Page<PlayerName>>(`${BASE}/players/all`, { params });
  }
  addPlayer(playerName: string): Observable<PlayerName> {
    return this.http.post<PlayerName>(`${BASE}/players`, { playerName });
  }
  deletePlayer(id: number): Observable<void> {
    return this.http.delete<void>(`${BASE}/players/${id}`, this.adminHeaders());
  }

  ihbidRandom10(count = 10): Observable<IhbidQuestion[]> {
    return this.http.get<IhbidQuestion[]>(`${BASE}/ihbid?count=${count}`);
  }
  ihbidPage(page = 0, size = 20): Observable<Page<IhbidQuestion>> {
    const params = new HttpParams().set('page', page).set('size', size).set('sort', 'id,desc');
    return this.http.get<Page<IhbidQuestion>>(`${BASE}/ihbid/all`, { params });
  }
  addIhbid(questionText: string, answerText: string): Observable<IhbidQuestion> {
    return this.http.post<IhbidQuestion>(`${BASE}/ihbid`, { questionText, answerText });
  }
  deleteIhbid(id: number): Observable<void> {
    return this.http.delete<void>(`${BASE}/ihbid/${id}`, this.adminHeaders());
  }

  offsideRandom10(count = 10): Observable<OffsideRule[]> {
    return this.http.get<OffsideRule[]>(`${BASE}/offside?count=${count}`);
  }
  offsidePage(page = 0, size = 20): Observable<Page<OffsideRule>> {
    const params = new HttpParams().set('page', page).set('size', size).set('sort', 'id,desc');
    return this.http.get<Page<OffsideRule>>(`${BASE}/offside/all`, { params });
  }
  addOffside(ruleText: string): Observable<OffsideRule> {
    return this.http.post<OffsideRule>(`${BASE}/offside`, { ruleText });
  }
  deleteOffside(id: number): Observable<void> {
    return this.http.delete<void>(`${BASE}/offside/${id}`, this.adminHeaders());
  }

  top10Random(count = 1): Observable<Top10List[]> {
    return this.http.get<Top10List[]>(`${BASE}/top10?count=${count}`);
  }
  top10Page(page = 0, size = 20): Observable<Page<Top10List>> {
    const params = new HttpParams().set('page', page).set('size', size).set('sort', 'id,desc');
    return this.http.get<Page<Top10List>>(`${BASE}/top10/all`, { params });
  }
  addTop10(prompt: string, answers: string[]): Observable<Top10List> {
    return this.http.post<Top10List>(`${BASE}/top10`, { prompt, answers });
  }
  deleteTop10(id: number): Observable<void> {
    return this.http.delete<void>(`${BASE}/top10/${id}`, this.adminHeaders());
  }

  scoresheetRandom(count = 1): Observable<ScoresheetMatch[]> {
    return this.http.get<ScoresheetMatch[]>(`${BASE}/scoresheet?count=${count}`);
  }
  scoresheetPage(page = 0, size = 20): Observable<Page<ScoresheetMatch>> {
    const params = new HttpParams().set('page', page).set('size', size).set('sort', 'id,desc');
    return this.http.get<Page<ScoresheetMatch>>(`${BASE}/scoresheet/all`, { params });
  }
  addScoresheet(
    matchLabel: string, teamA: string, teamB: string, lineupA: string[], lineupB: string[],
  ): Observable<ScoresheetMatch> {
    return this.http.post<ScoresheetMatch>(`${BASE}/scoresheet`, {
      matchLabel, teamA, teamB, lineupA, lineupB,
    });
  }
  deleteScoresheet(id: number): Observable<void> {
    return this.http.delete<void>(`${BASE}/scoresheet/${id}`, this.adminHeaders());
  }
}
