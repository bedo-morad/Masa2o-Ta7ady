import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { HotToastService } from '@ngxpert/hot-toast';
import { vi } from 'vitest';
import { ManageComponent } from './manage.component';

const toast = { success: vi.fn(), error: vi.fn() };
const modal = { open: vi.fn(), dismissAll: vi.fn() };
const page = (content: unknown[]) => ({
  content,
  totalElements: content.length,
  totalPages: content.length ? 1 : 0,
  number: 0,
  size: 20,
});
const answers = () => Array.from({ length: 13 }, (_, i) => `إجابة ${i + 1}`);
const lineup = () => Array.from({ length: 11 }, (_, i) => `لاعب ${i + 1}`);

async function setup(pool: 'top10' | 'scoresheet' = 'top10', content: unknown[] = []) {
  await TestBed.configureTestingModule({
    imports: [ManageComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      { provide: NgbModal, useValue: modal },
      { provide: HotToastService, useValue: toast },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(ManageComponent);
  fixture.detectChanges();
  const http = TestBed.inject(HttpTestingController);
  http.expectOne((request) => request.url.includes('/players/all')).flush(page([]));
  fixture.componentInstance.select(pool);
  fixture.detectChanges();
  http.expectOne((request) => request.url.includes(`/${pool}/all`)).flush(page(content));
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, http };
}

afterEach(() => {
  TestBed.inject(HttpTestingController).verify();
  TestBed.resetTestingModule();
  vi.clearAllMocks();
});

describe('Manage editor preservation seam', () => {
  it('posts raw Top10 prompt while trimming answers, and accepts a blank prompt when answers are filled', async () => {
    const { fixture, http } = await setup();
    const editor = fixture.componentInstance.top10Editor;
    editor.prompt.set('   ');
    editor.answers.set(answers());
    (
      fixture.nativeElement.querySelector('form.add button[type="submit"]') as HTMLButtonElement
    ).click();
    await fixture.whenStable();
    const request = http.expectOne((candidate) => candidate.url.endsWith('/top10'));
    expect(request.request.body).toEqual({ prompt: '   ', answers: answers() });
    request.flush({ id: 7, prompt: '   ', answers: answers() });
    await Promise.resolve();
    expect(fixture.componentInstance.msg()).toContain('تمت إضافة قائمة توب 10');
  });

  it('posts raw Scoresheet labels while trimming lineup entries', async () => {
    const { fixture, http } = await setup('scoresheet');
    const editor = fixture.componentInstance.scoresheetEditor;
    editor.newMatch.set(' مباراة ');
    editor.newTeamA.set(' فريق أ ');
    editor.newTeamB.set(' فريق ب ');
    editor.lineupA.set(lineup().map((name) => ` ${name} `));
    editor.lineupB.set(lineup().map((name) => ` ${name} `));
    (
      fixture.nativeElement.querySelector('form.add button[type="submit"]') as HTMLButtonElement
    ).click();
    await fixture.whenStable();
    const request = http.expectOne((candidate) => candidate.url.endsWith('/scoresheet'));
    expect(request.request.body).toEqual({
      matchLabel: ' مباراة ',
      teamA: ' فريق أ ',
      teamB: ' فريق ب ',
      lineupA: lineup(),
      lineupB: lineup(),
    });
    request.flush({
      id: 8,
      matchLabel: ' مباراة ',
      teamA: ' فريق أ ',
      teamB: ' فريق ب ',
      lineupA: lineup(),
      lineupB: lineup(),
    });
    await Promise.resolve();
    expect(fixture.componentInstance.msg()).toContain('تمت إضافة المباراة');
  });

  it('routes edit 401 through the rendered Manage host: locks admin and emits no toast', async () => {
    const row = { id: 4, prompt: 'قائمة', answers: answers() };
    const { fixture, http } = await setup('top10', [row]);
    const component = fixture.componentInstance;
    component.api.unlock('pw');
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.edit-btn') as HTMLButtonElement).click();
    fixture.detectChanges();
    component.top10Editor.editPrompt.set('قائمة معدلة');
    (fixture.nativeElement.querySelector('form.edit .save') as HTMLButtonElement).click();
    const request = http.expectOne((candidate) => candidate.url.endsWith('/top10/4'));
    request.flush({ message: 'unauthorized' }, { status: 401, statusText: 'Unauthorized' });
    await fixture.whenStable();
    expect(component.admin.adminOn()).toBe(false);
    expect(component.admin.error()).toContain('كلمة المرور غير صحيحة');
    expect(component.msg()).toBe('');
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('clears stale feedback before a rendered editor validation result', async () => {
    const { fixture } = await setup();
    const component = fixture.componentInstance;
    component.msg.set('رسالة قديمة');
    component.top10Editor.answers.set(Array(13).fill(''));
    (
      fixture.nativeElement.querySelector('form.add button[type="submit"]') as HTMLButtonElement
    ).click();
    expect(component.msg()).toBe('أكمل العنوان والإجابات الـ13 كلها قبل الإضافة.');
  });
});
