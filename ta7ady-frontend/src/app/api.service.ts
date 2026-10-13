import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PlayerName { id: number; playerName: string; }
export interface IhbidQuestion { id: number; questionText: string; answerText: string; }
export interface OffsideRule { id: number; ruleText: string; }

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
    return this.http.delete<void>(`${BASE}/players/${id}`);
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
    return this.http.delete<void>(`${BASE}/ihbid/${id}`);
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
    return this.http.delete<void>(`${BASE}/offside/${id}`);
  }
}
