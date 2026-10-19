import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { NgbConfig, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { HotToastService } from '@ngxpert/hot-toast';
import { vi } from 'vitest';
import { ApiService } from '../../services/api.service';
import { ManageComponent } from '../manage.component';

// Access owns this modal, but its public seam remains the rendered Manage page.
describe('Manage access modal', () => {
  let fixture: ComponentFixture<ManageComponent>;
  const adminPassword = signal<string | null>(null);
  const api = {
    adminPassword,
    unlock: vi.fn((password: string) => adminPassword.set(password)),
    lock: vi.fn(() => adminPassword.set(null)),
  };

  beforeEach(async () => {
    adminPassword.set(null);
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [ManageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ApiService, useValue: api },
        { provide: HotToastService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    }).compileComponents();
    TestBed.inject(NgbConfig).animation = false;
    fixture = TestBed.createComponent(ManageComponent);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController)
      .expectOne((request) => request.url.includes('/players/all'))
      .flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 });
    await fixture.whenStable();
  });

  afterEach(() => {
    TestBed.inject(NgbModal).dismissAll();
    TestBed.inject(HttpTestingController).verify();
  });

  async function open(): Promise<void> {
    (fixture.nativeElement.querySelector('.lock-btn') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function submit(password: string): Promise<void> {
    const input = document.querySelector<HTMLInputElement>('#adminPw')!;
    input.value = password;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    document
      .querySelector('form.admin-form')!
      .dispatchEvent(new Event('submit', { bubbles: true }));
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('rejects a blank password, trims a submitted password, and clears it after unlocking', async () => {
    await open();
    await submit('   ');
    expect(document.querySelector('.admin-error')?.textContent).toContain('أدخل كلمة المرور.');
    expect(api.unlock).not.toHaveBeenCalled();
    await submit('  secret  ');
    expect(api.unlock).toHaveBeenCalledWith('secret');
    expect(document.querySelector('.admin-popup')).toBeNull();
    expect(fixture.nativeElement.querySelector('.notice')?.textContent).toBe(
      'ظهرت أزرار التعديل والحذف — يتحقّق الخادم من كلمة المرور عند تنفيذ العملية.',
    );
    await open();
    document.querySelector<HTMLButtonElement>('.admin-actions .lock')!.click();
    await fixture.whenStable();
    await open();
    expect(document.querySelector<HTMLInputElement>('#adminPw')!.value).toBe('');
  });

  it('locks the session and dismisses the modal from its manual lock action', async () => {
    adminPassword.set('secret');
    await open();
    document.querySelector<HTMLButtonElement>('.admin-actions .lock')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(api.lock).toHaveBeenCalledOnce();
    expect(document.querySelector('.admin-popup')).toBeNull();
    expect(fixture.nativeElement.querySelector('.lock-btn')?.classList.contains('on')).toBe(false);
    expect(fixture.nativeElement.querySelector('.notice')?.textContent).toBe(
      'تم قفل وضع الإدارة — أُخفيت أزرار التعديل والحذف.',
    );
  });

  it('clears a previous validation error on reopening without unlocking on close', async () => {
    await open();
    await submit('');
    document.querySelector<HTMLButtonElement>('.admin-popup-head .x')!.click();
    await fixture.whenStable();
    await open();
    expect(document.querySelector('.admin-error')).toBeNull();
    expect(api.unlock).not.toHaveBeenCalled();
  });
});
