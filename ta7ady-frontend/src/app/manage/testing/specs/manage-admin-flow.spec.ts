import { TestBed } from '@angular/core/testing';

import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { HotToastService } from '@ngxpert/hot-toast';
import { ApiService } from '../../../api.service';
import { ManageComponent } from '../../manage.component';

const toastStub = () => ({ success: vi.fn(), error: vi.fn() });
const modalStub = () => ({ open: vi.fn(), dismissAll: vi.fn() });

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
      del: vi.fn(() => of(undefined)),
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
    const req = httpMock.expectOne((r) => r.url.includes('/players/all'));
    req.flush({
      content: [{ id: 1, playerName: 'لاعب للاختبار' }],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 20,
    });
    fixture.detectChanges();
    return { fixture, apiStub, httpMock };
  }

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('hides delete buttons while locked and shows no inline unlock card', async () => {
    const { fixture } = await setupAdmin();
    const c = fixture.componentInstance;
    expect(c.admin.adminOn()).toBe(false);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.del')).toBeNull();
    // Unlock form lives inside the modal popup now, not inline on the page.
    expect(el.querySelector('.admin-locked')).toBeNull();
    expect(el.querySelector('.lock-btn')).not.toBeNull();
  });

  it('shows deletes after unlock and re-hides them on a 401 delete', async () => {
    const { fixture, apiStub } = await setupAdmin();
    const c = fixture.componentInstance;
    const el = fixture.nativeElement as HTMLElement;

    c.admin.password.set('secret');
    c.admin.unlock();
    fixture.detectChanges();
    expect(c.admin.adminOn()).toBe(true);
    expect(apiStub.unlock).toHaveBeenCalledWith('secret');
    expect(el.querySelector('.del')).not.toBeNull();

    apiStub.del.mockReturnValueOnce(throwError(() => ({ status: 401 })));
    await c.removeFromCatalog('players', 1);
    fixture.detectChanges();
    expect(apiStub.lock).toHaveBeenCalled();
    expect(c.admin.adminOn()).toBe(false);
    expect(el.querySelector('.del')).toBeNull();
    expect(c.admin.error()).toContain('كلمة المرور غير صحيحة');
  });
});
