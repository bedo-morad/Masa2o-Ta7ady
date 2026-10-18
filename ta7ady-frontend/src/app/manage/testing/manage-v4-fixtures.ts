import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { HotToastService } from '@ngxpert/hot-toast';
import { ApiService } from '../../api.service';
import { ManageComponent } from '../manage.component';

const toastStub = () => ({ success: vi.fn(), error: vi.fn() });
const modalStub = () => ({ open: vi.fn(), dismissAll: vi.fn() });

export const clues5 = Array.from({ length: 5 }, (_, i) => `تلميح ${i + 1}`);
export const names11 = Array.from({ length: 11 }, (_, i) => `لاعب ${i + 1}`);
export const TITLE = 'الأهلي 2021 نهائي دوري أبطال أفريقيا';
export async function setupV4() {
  const adminPassword = signal<string | null>('pw');
  const toast = toastStub();
  const apiStub = {
    adminPassword,
    get unlocked(): boolean {
      return adminPassword() !== null;
    },
    unlock: vi.fn((pw: string) => adminPassword.set(pw)),
    lock: vi.fn(() => adminPassword.set(null)),
    bulk: vi.fn(() => of([])),
    update: vi.fn(() => of({})),
    del: vi.fn(() => of(undefined)),
    addAnameen: vi.fn(() => of({ id: 7, player: 'x', clues: [] })),
    addWhopicture: vi.fn(() =>
      of({ id: 9, title: 'أهلي 2021', photoUrl: 'https://x', players: [] }),
    ),
  };
  await TestBed.configureTestingModule({
    imports: [ManageComponent],
    providers: [
      provideHttpClientTesting(),
      provideRouter([]),
      { provide: ApiService, useValue: apiStub },
      { provide: NgbModal, useValue: modalStub() },
      { provide: HotToastService, useValue: toast },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(ManageComponent);
  fixture.detectChanges();
  const httpMock = TestBed.inject(HttpTestingController);
  httpMock
    .expectOne((r) => r.url.includes('/players/all'))
    .flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 });
  fixture.detectChanges();
  return { fixture, apiStub, toast, httpMock };
}
export async function showV4(
  fixture: ComponentFixture<ManageComponent>,
  httpMock: HttpTestingController,
  pool: 'anameen' | 'whopicture',
  content: unknown[],
): Promise<void> {
  fixture.componentInstance.select(pool);
  fixture.detectChanges();
  httpMock
    .expectOne((r) => r.url.includes(`/${pool}/all`))
    .flush({ content, totalElements: content.length, totalPages: 1, number: 0, size: 20 });
  await fixture.whenStable();
  fixture.detectChanges();
}
export async function drainList(httpMock: HttpTestingController, pool = 'players'): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
  for (const req of httpMock.match((r) => r.url.includes(`/${pool}/all`)))
    req.flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 });
}
