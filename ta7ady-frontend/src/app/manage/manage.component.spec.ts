import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ApiService } from '../api.service';
import { ManageComponent } from './manage.component';

describe('ManageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageComponent],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();
  });

  it('creates on the shared player pool', () => {
    const fixture = TestBed.createComponent(ManageComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.componentInstance.pool()).toBe('players');
  });

  it('switches pools and resets paging', () => {
    const c = TestBed.createComponent(ManageComponent).componentInstance;
    c.page.set(3);
    c.select('ihbid');
    expect(c.pool()).toBe('ihbid');
    expect(c.page()).toBe(0);
  });

  it('supports all five v2 pools', () => {
    const c = TestBed.createComponent(ManageComponent).componentInstance;
    for (const p of ['players', 'ihbid', 'offside', 'top10', 'scoresheet'] as const) {
      c.select(p);
      expect(c.pool()).toBe(p);
      expect(c.page()).toBe(0);
    }
  });
});

describe('ManageComponent admin unlock', () => {
  async function setupAdmin() {
    const adminPassword = signal<string | null>(null);
    const apiStub = {
      adminPassword,
      get unlocked(): boolean {
        return adminPassword() !== null;
      },
      unlock: vi.fn((pw: string) => adminPassword.set(pw)),
      lock: vi.fn(() => adminPassword.set(null)),
      bulk: vi.fn(() => of([])),
      deletePlayer: vi.fn(() => of(undefined)),
      deleteIhbid: vi.fn(() => of(undefined)),
      deleteOffside: vi.fn(() => of(undefined)),
      deleteTop10: vi.fn(() => of(undefined)),
      deleteScoresheet: vi.fn(() => of(undefined)),
    };
    await TestBed.configureTestingModule({
      imports: [ManageComponent],
      providers: [
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ApiService, useValue: apiStub },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ManageComponent);
    fixture.detectChanges();
    const httpMock = TestBed.inject(HttpTestingController);
    const req = httpMock.expectOne((r) => r.url.includes('/players/all'));
    req.flush({ content: [{ id: 1, playerName: 'لاعب للاختبار' }], totalElements: 1, totalPages: 1, number: 0, size: 20 });
    fixture.detectChanges();
    return { fixture, apiStub, httpMock };
  }

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('hides delete buttons while locked', async () => {
    const { fixture } = await setupAdmin();
    const c = fixture.componentInstance;
    expect(c.adminOn()).toBe(false);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.del')).toBeNull();
    expect(el.textContent).toContain('وضع الإدارة');
  });

  it('shows deletes after unlock and re-hides them on a 401 delete', async () => {
    const { fixture, apiStub } = await setupAdmin();
    const c = fixture.componentInstance;
    const el = fixture.nativeElement as HTMLElement;

    c.adminPw.set('secret');
    c.unlockAdmin();
    fixture.detectChanges();
    expect(c.adminOn()).toBe(true);
    expect(apiStub.unlock).toHaveBeenCalledWith('secret');
    expect(el.querySelector('.del')).not.toBeNull();

    apiStub.deletePlayer.mockReturnValueOnce(throwError(() => ({ status: 401 })));
    await c.removePlayer(1);
    fixture.detectChanges();
    expect(apiStub.lock).toHaveBeenCalled();
    expect(c.adminOn()).toBe(false);
    expect(el.querySelector('.del')).toBeNull();
    expect(el.textContent).toContain('كلمة المرور غير صحيحة');
  });
});
