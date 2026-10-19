import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE, ApiService } from './api.service';

describe('ApiService same-origin routing', () => {
  let api: ApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    sessionStorage.removeItem('ta7ady-admin');
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    api.lock();
    TestBed.resetTestingModule();
    http.verify();
  });

  it('exports a host-independent base for resource consumers', () => {
    expect(API_BASE).toBe('/api');
  });

  it('loads Manage pages through the same origin with pagination intact', () => {
    api.page('players', 2, 10).subscribe();
    const request = http.expectOne('/api/players/all?page=2&size=10&sort=id,desc');
    expect(request.request.method).toBe('GET');
    request.flush({ content: [], totalElements: 0, totalPages: 0, number: 2, size: 10 });
  });

  it('loads game draws through the same origin', () => {
    api.playersRandom10().subscribe();
    http.expectOne('/api/players?count=10').flush([]);
  });

  it('keeps the admin header on same-origin edits', () => {
    api.unlock('test-password');
    api.update('players', 7, { playerName: 'Updated player' }).subscribe();
    const request = http.expectOne('/api/players/7');
    expect(request.request.method).toBe('PUT');
    expect(request.request.headers.get('X-Admin-Password')).toBe('test-password');
    expect(request.request.body).toEqual({ playerName: 'Updated player' });
    request.flush({ id: 7, playerName: 'Updated player' });
  });

  it('sends the admin header on deletes and retains access after an empty 200 response', () => {
    api.unlock('test-password');
    let completed = false;
    api.del('ihbid', 7).subscribe({ complete: () => (completed = true) });
    const request = http.expectOne('/api/ihbid/7');
    expect(request.request.method).toBe('DELETE');
    expect(request.request.headers.get('X-Admin-Password')).toBe('test-password');
    request.flush(null, { status: 200, statusText: 'OK' });
    expect(completed).toBe(true);
    expect(api.unlocked).toBe(true);
    expect(sessionStorage.getItem('ta7ady-admin')).toBe('test-password');
  });

  it('does not invent an admin credential for locked deletes', () => {
    api.del('players', 7).subscribe();
    const request = http.expectOne('/api/players/7');
    expect(request.request.method).toBe('DELETE');
    expect(request.request.headers.has('X-Admin-Password')).toBe(false);
    request.flush(null);
  });
});
