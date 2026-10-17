import { Component, computed, inject, signal, TemplateRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { httpResource } from '@angular/common/http';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { HotToastService } from '@ngxpert/hot-toast';
import { API_BASE, ApiService, AnameenSubject, Page, Pool, RiskQuestion, WhoPicturePhoto } from '../api.service';
import { ImportPanelComponent } from './import/import-panel.component';

const SIZE = 20;
export const TOP10_SIZE = 13;
export const LINEUP_SIZE = 11;
export const ANAMEEN_CLUES = 5;
export const RISK_TIERS = [5, 10, 20, 40];
export const RISK_SIZE = RISK_TIERS.length;

// A fresh Risk pack buffer: exactly one question per tier, in tier order.
function blankRisk(): RiskQuestion[] {
  return RISK_TIERS.map((points) => ({ points, question: '', answer: '' }));
}

@Component({
  selector: 'app-manage',
  standalone: true,
  imports: [FormsModule, RouterLink, ImportPanelComponent],
  templateUrl: './manage.component.html',
  styleUrl: './manage.component.scss',
})
export class ManageComponent {
  readonly api = inject(ApiService);
  private readonly modal = inject(NgbModal);
  private readonly toast = inject(HotToastService);

  readonly pool = signal<Pool>('players');
  readonly page = signal(0);
  readonly msg = signal('');

  readonly adminPw = signal('');
  readonly adminError = signal('');
  readonly adminOn = computed(() => this.api.adminPassword() !== null);

  readonly newPlayer = signal('');
  readonly newQuestion = signal('');
  readonly newAnswer = signal('');
  readonly newRule = signal('');
  readonly newTop10Prompt = signal('');
  readonly top10Answers = signal<string[]>(Array(TOP10_SIZE).fill(''));
  readonly newMatch = signal('');
  readonly newTeamA = signal('');
  readonly newTeamB = signal('');
  readonly lineupA = signal<string[]>(Array(LINEUP_SIZE).fill(''));
  readonly lineupB = signal<string[]>(Array(LINEUP_SIZE).fill(''));
  readonly newGenre = signal('');
  readonly newRisk = signal<RiskQuestion[]>(blankRisk());
  // Ana Meen (SPECV4 §4.1): subject name + 5 clues, hard -> easy.
  readonly newSubject = signal('');
  readonly newClues = signal<string[]>(Array(ANAMEEN_CLUES).fill(''));
  // Who-in-Picture (SPECV4 §4.3): one hotlinked photo + 11 pictured names.
  readonly newPhotoUrl = signal('');
  readonly newPhotoPlayers = signal<string[]>(Array(LINEUP_SIZE).fill(''));

  readonly top10Ranks = Array.from({ length: TOP10_SIZE }, (_, i) => i + 1);
  readonly lineupSlots = Array.from({ length: LINEUP_SIZE }, (_, i) => i + 1);
  readonly clueSlots = Array.from({ length: ANAMEEN_CLUES }, (_, i) => i + 1);
  readonly riskTiers = RISK_TIERS;

  // Accordion for managed top-10 / scoresheet / risk rows: one open at a time.
  readonly expandedId = signal<number | null>(null);

  // Inline edit (SPECV3 §3.1): one row open at a time, admin-unlocked only.
  readonly editingId = signal<number | null>(null);
  readonly editText = signal('');
  readonly editQ = signal('');
  readonly editA = signal('');
  readonly editPrompt = signal('');
  readonly editAnswers = signal<string[]>(Array(TOP10_SIZE).fill(''));
  readonly editMatch = signal('');
  readonly editTeamA = signal('');
  readonly editTeamB = signal('');
  readonly editLineupA = signal<string[]>(Array(LINEUP_SIZE).fill(''));
  readonly editLineupB = signal<string[]>(Array(LINEUP_SIZE).fill(''));
  readonly editGenre = signal('');
  readonly editRisk = signal<RiskQuestion[]>(blankRisk());
  readonly editSubject = signal('');
  readonly editClues = signal<string[]>(Array(ANAMEEN_CLUES).fill(''));
  readonly editPhotoUrl = signal('');
  readonly editPhotoPlayers = signal<string[]>(Array(LINEUP_SIZE).fill(''));

  toggle(id: number): void {
    this.expandedId.update((open) => (open === id ? null : id));
  }

  isOpen(id: number): boolean {
    return this.expandedId() === id;
  }

  private readonly playersRes = httpResource<Page<{ id: number; playerName: string }>>(() =>
    this.pool() === 'players'
      ? `${API_BASE}/players/all?page=${this.page()}&size=${SIZE}&sort=id,desc`
      : undefined,
  );
  private readonly ihbidRes = httpResource<
    Page<{ id: number; questionText: string; answerText: string }>
  >(() =>
    this.pool() === 'ihbid'
      ? `${API_BASE}/ihbid/all?page=${this.page()}&size=${SIZE}&sort=id,desc`
      : undefined,
  );
  private readonly offsideRes = httpResource<Page<{ id: number; ruleText: string }>>(() =>
    this.pool() === 'offside'
      ? `${API_BASE}/offside/all?page=${this.page()}&size=${SIZE}&sort=id,desc`
      : undefined,
  );
  private readonly top10Res = httpResource<Page<{ id: number; prompt: string; answers: string[] }>>(
    () =>
      this.pool() === 'top10'
        ? `${API_BASE}/top10/all?page=${this.page()}&size=${SIZE}&sort=id,desc`
        : undefined,
  );
  private readonly scoresheetRes = httpResource<
    Page<{
      id: number;
      matchLabel: string;
      teamA: string;
      teamB: string;
      lineupA: string[];
      lineupB: string[];
    }>
  >(() =>
    this.pool() === 'scoresheet'
      ? `${API_BASE}/scoresheet/all?page=${this.page()}&size=${SIZE}&sort=id,desc`
      : undefined,
  );
  private readonly bankRes = httpResource<
    Page<{ id: number; question: string; answer: string }>
  >(() =>
    this.pool() === 'bank'
      ? `${API_BASE}/bank/all?page=${this.page()}&size=${SIZE}&sort=id,desc`
      : undefined,
  );
  private readonly riskRes = httpResource<Page<{ id: number; genre: string; questions: RiskQuestion[] }>>(
    () =>
      this.pool() === 'risk'
        ? `${API_BASE}/risk/all?page=${this.page()}&size=${SIZE}&sort=id,desc`
        : undefined,
  );
  private readonly anameenRes = httpResource<Page<AnameenSubject>>(
    () =>
      this.pool() === 'anameen'
        ? `${API_BASE}/anameen/all?page=${this.page()}&size=${SIZE}&sort=id,desc`
        : undefined,
  );
  private readonly whopictureRes = httpResource<Page<WhoPicturePhoto>>(
    () =>
      this.pool() === 'whopicture'
        ? `${API_BASE}/whopicture/all?page=${this.page()}&size=${SIZE}&sort=id,desc`
        : undefined,
  );

  readonly playerRows = computed(() => this.playersRes.value()?.content ?? []);
  readonly ihbidRows = computed(() => this.ihbidRes.value()?.content ?? []);
  readonly offsideRows = computed(() => this.offsideRes.value()?.content ?? []);
  readonly top10Rows = computed(() => this.top10Res.value()?.content ?? []);
  readonly scoresheetRows = computed(() => this.scoresheetRes.value()?.content ?? []);
  readonly bankRows = computed(() => this.bankRes.value()?.content ?? []);
  readonly riskRows = computed(() => this.riskRes.value()?.content ?? []);
  readonly anameenRows = computed(() => this.anameenRes.value()?.content ?? []);
  readonly whopictureRows = computed(() => this.whopictureRes.value()?.content ?? []);

  readonly totalElements = computed(() => this.activePage()?.totalElements ?? 0);
  readonly totalPages = computed(() => this.activePage()?.totalPages ?? 0);
  readonly loading = computed(
    () =>
      this.playersRes.isLoading() ||
      this.ihbidRes.isLoading() ||
      this.offsideRes.isLoading() ||
      this.top10Res.isLoading() ||
      this.scoresheetRes.isLoading() ||
      this.bankRes.isLoading() ||
      this.riskRes.isLoading() ||
      this.anameenRes.isLoading() ||
      this.whopictureRes.isLoading(),
  );

  private activePage() {
    if (this.pool() === 'players') return this.playersRes.value();
    if (this.pool() === 'ihbid') return this.ihbidRes.value();
    if (this.pool() === 'top10') return this.top10Res.value();
    if (this.pool() === 'scoresheet') return this.scoresheetRes.value();
    if (this.pool() === 'bank') return this.bankRes.value();
    if (this.pool() === 'risk') return this.riskRes.value();
    if (this.pool() === 'anameen') return this.anameenRes.value();
    if (this.pool() === 'whopicture') return this.whopictureRes.value();
    return this.offsideRes.value();
  }

  select(p: Pool): void {
    this.pool.set(p);
    this.page.set(0);
    this.msg.set('');
    this.expandedId.set(null);
    this.editingId.set(null);
  }

  prev(): void {
    if (this.page() > 0) this.page.update((p) => p - 1);
    this.expandedId.set(null);
    this.editingId.set(null);
  }

  next(): void {
    if (this.page() + 1 < this.totalPages()) this.page.update((p) => p + 1);
    this.expandedId.set(null);
    this.editingId.set(null);
  }

  openAdminModal(content: TemplateRef<unknown>): void {
    this.adminError.set('');
    this.modal.open(content, { centered: true });
  }

  unlockAdmin(dismiss?: { dismiss: () => void }): void {
    const pw = this.adminPw().trim();
    if (!pw) {
      this.adminError.set('أدخل كلمة المرور.');
      return;
    }
    this.api.unlock(pw);
    this.adminPw.set('');
    this.adminError.set('');
    this.msg.set('تم تفعيل وضع الإدارة لهذه الجلسة — ظهرت أزرار التعديل والحذف.');
    dismiss?.dismiss();
  }

  lockAdmin(dismiss?: { dismiss: () => void }): void {
    this.api.lock();
    this.adminError.set('');
    this.msg.set('تم قفل وضع الإدارة — أُخفيت أزرار التعديل والحذف.');
    dismiss?.dismiss();
  }

  onImported(): void {
    this.reloadActive();
    this.msg.set('تم الاستيراد — القائمة محدثة.');
  }

  setTop10Answer(i: number, v: string): void {
    this.top10Answers.update((arr) => arr.map((old, j) => (j === i ? v : old)));
  }

  setLineupA(i: number, v: string): void {
    this.lineupA.update((arr) => arr.map((old, j) => (j === i ? v : old)));
  }

  setLineupB(i: number, v: string): void {
    this.lineupB.update((arr) => arr.map((old, j) => (j === i ? v : old)));
  }

  setEditTop10Answer(i: number, v: string): void {
    this.editAnswers.update((arr) => arr.map((old, j) => (j === i ? v : old)));
  }

  setEditLineupA(i: number, v: string): void {
    this.editLineupA.update((arr) => arr.map((old, j) => (j === i ? v : old)));
  }

  setEditLineupB(i: number, v: string): void {
    this.editLineupB.update((arr) => arr.map((old, j) => (j === i ? v : old)));
  }

  setNewRisk(i: number, field: 'question' | 'answer', v: string): void {
    this.newRisk.update((arr) => arr.map((q, j) => (j === i ? { ...q, [field]: v } : q)));
  }

  setEditRisk(i: number, field: 'question' | 'answer', v: string): void {
    this.editRisk.update((arr) => arr.map((q, j) => (j === i ? { ...q, [field]: v } : q)));
  }

  setNewClue(i: number, v: string): void {
    this.newClues.update((arr) => arr.map((old, j) => (j === i ? v : old)));
  }

  setEditClue(i: number, v: string): void {
    this.editClues.update((arr) => arr.map((old, j) => (j === i ? v : old)));
  }

  setNewPhotoPlayer(i: number, v: string): void {
    this.newPhotoPlayers.update((arr) => arr.map((old, j) => (j === i ? v : old)));
  }

  setEditPhotoPlayer(i: number, v: string): void {
    this.editPhotoPlayers.update((arr) => arr.map((old, j) => (j === i ? v : old)));
  }

  // ---- inline edit (admin-unlocked, SPECV3 §3.1) ----

  startEditPlayer(p: { id: number; playerName: string }): void {
    this.editText.set(p.playerName);
    this.expandedId.set(null);
    this.editingId.set(p.id);
  }

  startEditIhbid(q: { id: number; questionText: string; answerText: string }): void {
    this.editQ.set(q.questionText);
    this.editA.set(q.answerText);
    this.expandedId.set(null);
    this.editingId.set(q.id);
  }

  startEditOffside(r: { id: number; ruleText: string }): void {
    this.editText.set(r.ruleText);
    this.expandedId.set(null);
    this.editingId.set(r.id);
  }

  startEditTop10(t: { id: number; prompt: string; answers: string[] }): void {
    this.editPrompt.set(t.prompt);
    this.editAnswers.set([...t.answers]);
    this.expandedId.set(null);
    this.editingId.set(t.id);
  }

  startEditScoresheet(m: {
    id: number;
    matchLabel: string;
    teamA: string;
    teamB: string;
    lineupA: string[];
    lineupB: string[];
  }): void {
    this.editMatch.set(m.matchLabel);
    this.editTeamA.set(m.teamA);
    this.editTeamB.set(m.teamB);
    this.editLineupA.set([...m.lineupA]);
    this.editLineupB.set([...m.lineupB]);
    this.expandedId.set(null);
    this.editingId.set(m.id);
  }

  startEditBank(b: { id: number; question: string; answer: string }): void {
    this.editQ.set(b.question);
    this.editA.set(b.answer);
    this.expandedId.set(null);
    this.editingId.set(b.id);
  }

  startEditRisk(p: { id: number; genre: string; questions: RiskQuestion[] }): void {
    this.editGenre.set(p.genre);
    this.editRisk.set(p.questions.map((q, i) => ({ ...q, points: RISK_TIERS[i] })));
    this.expandedId.set(null);
    this.editingId.set(p.id);
  }

  startEditAnameen(a: AnameenSubject): void {
    this.editSubject.set(a.player);
    this.editClues.set([...a.clues]);
    this.expandedId.set(null);
    this.editingId.set(a.id);
  }

  startEditWhopicture(w: WhoPicturePhoto): void {
    this.editPhotoUrl.set(w.photoUrl);
    this.editPhotoPlayers.set([...w.players]);
    this.expandedId.set(null);
    this.editingId.set(w.id);
  }

  cancelEdit(): void {
    this.editingId.set(null);
  }

  // Shared edit apply: admin-gated PUT, then reload + toast. A duplicate of
  // another row (or any validation failure) surfaces the backend message.
  private async applyEdit(
    pool: Pool, id: number, body: unknown, okMsg: string, failMsg: string,
  ): Promise<void> {
    this.msg.set('');
    try {
      await firstValueFrom(this.api.update(pool, id, body));
    } catch (e: unknown) {
      if (this.denyIf401(e)) return;
      const reason = this.apiMsg(e) ?? failMsg;
      this.msg.set(reason);
      this.toast.error(reason);
      return;
    }
    this.editingId.set(null);
    this.reloadActive();
    this.msg.set(okMsg);
    this.toast.success(okMsg);
  }

  async saveEditPlayer(id: number): Promise<void> {
    await this.applyEdit('players', id, { playerName: this.editText() },
      'تم حفظ تعديل اسم اللاعب.', 'خطأ — الاسم قصير أو مكرر.');
  }

  async saveEditIhbid(id: number): Promise<void> {
    await this.applyEdit('ihbid', id, { questionText: this.editQ(), answerText: this.editA() },
      'تم حفظ تعديل السؤال.', 'خطأ — تأكد من طول السؤال والجواب.');
  }

  async saveEditOffside(id: number): Promise<void> {
    await this.applyEdit('offside', id, { ruleText: this.editText() },
      'تم حفظ تعديل القاعدة.', 'خطأ — القاعدة قصيرة.');
  }

  async saveEditTop10(id: number): Promise<void> {
    this.msg.set('');
    const answers = this.editAnswers().map((a) => a.trim());
    if (!this.editPrompt().trim() || answers.some((a) => !a)) {
      const reason = 'أكمل العنوان والإجابات الـ13 كلها قبل الحفظ.';
      this.msg.set(reason);
      this.toast.error(reason);
      return;
    }
    await this.applyEdit('top10', id, { prompt: this.editPrompt(), answers },
      'تم حفظ تعديل القائمة.', 'خطأ — يلزم عنوان و13 إجابة مميزة.');
  }

  async saveEditScoresheet(id: number): Promise<void> {
    this.msg.set('');
    const a = this.editLineupA().map((p) => p.trim());
    const b = this.editLineupB().map((p) => p.trim());
    if (!this.editMatch().trim() || !this.editTeamA().trim() || !this.editTeamB().trim()
      || a.some((p) => !p) || b.some((p) => !p)) {
      const reason = 'أكمل اسم المباراة والفريقين و22 لاعبًا قبل الحفظ.';
      this.msg.set(reason);
      this.toast.error(reason);
      return;
    }
    await this.applyEdit('scoresheet', id, {
      match: this.editMatch(), teamA: this.editTeamA(), teamB: this.editTeamB(),
      lineupA: a, lineupB: b,
    }, 'تم حفظ تعديل المباراة.', 'خطأ — يلزم اسم مباراة وفريقان و11 لاعبًا لكل تشكيلة.');
  }

  async saveEditBank(id: number): Promise<void> {
    await this.applyEdit('bank', id, { question: this.editQ(), answer: this.editA() },
      'تم حفظ تعديل السؤال.', 'خطأ — تأكد من طول السؤال والجواب.');
  }

  async saveEditRisk(id: number): Promise<void> {
    this.msg.set('');
    const genre = this.editGenre().trim();
    const questions = this.editRisk().map((q, i) => ({
      points: RISK_TIERS[i], question: q.question.trim(), answer: q.answer.trim(),
    }));
    if (!genre || questions.some((q) => !q.question || !q.answer)) {
      const reason = 'أكمل النوع والأسئلة الأربعة (سؤال وجواب) قبل الحفظ.';
      this.msg.set(reason);
      this.toast.error(reason);
      return;
    }
    await this.applyEdit('risk', id, { genre, questions },
      'تم حفظ تعديل الحزمة.', 'خطأ — يلزم نوع وأربعة أسئلة بفئاتها.');
  }

  async saveEditAnameen(id: number): Promise<void> {
    this.msg.set('');
    const player = this.editSubject().trim();
    const clues = this.editClues().map((c) => c.trim());
    if (!player || clues.some((c) => !c)) {
      const reason = 'أكمل اسم الشخصية والتلميحات الخمس قبل الحفظ.';
      this.msg.set(reason);
      this.toast.error(reason);
      return;
    }
    await this.applyEdit('anameen', id, { player, clues },
      `تم حفظ تعديل الشخصية (#${id}).`, 'خطأ — يلزم اسم وخمسة تلميحات مميزة.');
  }

  async saveEditWhopicture(id: number): Promise<void> {
    this.msg.set('');
    const photoUrl = this.editPhotoUrl().trim();
    const players = this.editPhotoPlayers().map((p) => p.trim());
    if (!photoUrl || players.some((p) => !p)) {
      const reason = 'أكمل رابط الصورة وأسماء اللاعبين الـ11 قبل الحفظ.';
      this.msg.set(reason);
      this.toast.error(reason);
      return;
    }
    await this.applyEdit('whopicture', id, { photoUrl, players },
      `تم حفظ تعديل الصورة (#${id}).`, 'خطأ — يلزم رابط صالح و11 اسمًا مميزًا.');
  }

  private reloadActive(): void {
    if (this.pool() === 'players') this.playersRes.reload();
    else if (this.pool() === 'ihbid') this.ihbidRes.reload();
    else if (this.pool() === 'top10') this.top10Res.reload();
    else if (this.pool() === 'scoresheet') this.scoresheetRes.reload();
    else if (this.pool() === 'bank') this.bankRes.reload();
    else if (this.pool() === 'risk') this.riskRes.reload();
    else if (this.pool() === 'anameen') this.anameenRes.reload();
    else if (this.pool() === 'whopicture') this.whopictureRes.reload();
    else this.offsideRes.reload();
  }

  async addPlayer(): Promise<void> {
    this.msg.set('');
    try {
      await firstValueFrom(this.api.addPlayer(this.newPlayer()));
      this.newPlayer.set('');
      if (this.page() === 0) this.reloadActive();
      else this.page.set(0);
      this.msg.set('تمت الإضافة إلى أسماء اللاعبين.');
      this.toast.success('تمت الإضافة إلى أسماء اللاعبين.');
    } catch (e: unknown) {
      const reason = this.apiMsg(e) ?? 'خطأ — الاسم قصير أو مكرر.';
      this.msg.set(reason);
      this.toast.error(reason);
    }
  }

  async addIhbid(): Promise<void> {
    this.msg.set('');
    try {
      await firstValueFrom(this.api.addIhbid(this.newQuestion(), this.newAnswer()));
      this.newQuestion.set('');
      this.newAnswer.set('');
      if (this.page() === 0) this.reloadActive();
      else this.page.set(0);
      this.msg.set('تمت إضافة السؤال.');
      this.toast.success('تمت إضافة السؤال.');
    } catch (e: unknown) {
      const reason = this.apiMsg(e) ?? 'خطأ — تأكد من طول السؤال والجواب.';
      this.msg.set(reason);
      this.toast.error(reason);
    }
  }

  async addOffside(): Promise<void> {
    this.msg.set('');
    try {
      await firstValueFrom(this.api.addOffside(this.newRule()));
      this.newRule.set('');
      if (this.page() === 0) this.reloadActive();
      else this.page.set(0);
      this.msg.set('تمت إضافة القاعدة.');
      this.toast.success('تمت إضافة القاعدة.');
    } catch (e: unknown) {
      const reason = this.apiMsg(e) ?? 'خطأ — القاعدة قصيرة.';
      this.msg.set(reason);
      this.toast.error(reason);
    }
  }

  async addTop10(): Promise<void> {
    this.msg.set('');
    const answers = this.top10Answers().map((a) => a.trim());
    if (answers.some((a) => !a)) {
      const reason = 'أكمل الإجابات الـ13 كلها قبل الإضافة.';
      this.msg.set(reason);
      this.toast.error(reason);
      return;
    }
    try {
      await firstValueFrom(this.api.addTop10(this.newTop10Prompt(), answers));
      this.newTop10Prompt.set('');
      this.top10Answers.set(Array(TOP10_SIZE).fill(''));
      if (this.page() === 0) this.reloadActive();
      else this.page.set(0);
      this.msg.set('تمت إضافة قائمة توب 10.');
      this.toast.success('تمت إضافة قائمة توب 10.');
    } catch (e: unknown) {
      const reason = this.apiMsg(e) ?? 'خطأ — يلزم عنوان و13 إجابة مميزة.';
      this.msg.set(reason);
      this.toast.error(reason);
    }
  }

  async addScoresheet(): Promise<void> {
    this.msg.set('');
    const a = this.lineupA().map((p) => p.trim());
    const b = this.lineupB().map((p) => p.trim());
    if (!this.newMatch().trim() || !this.newTeamA().trim() || !this.newTeamB().trim()
      || a.some((p) => !p) || b.some((p) => !p)) {
      const reason = 'أكمل اسم المباراة والفريقين و22 لاعبًا قبل الإضافة.';
      this.msg.set(reason);
      this.toast.error(reason);
      return;
    }
    try {
      await firstValueFrom(
        this.api.addScoresheet(this.newMatch(), this.newTeamA(), this.newTeamB(), a, b),
      );
      this.newMatch.set('');
      this.newTeamA.set('');
      this.newTeamB.set('');
      this.lineupA.set(Array(LINEUP_SIZE).fill(''));
      this.lineupB.set(Array(LINEUP_SIZE).fill(''));
      if (this.page() === 0) this.reloadActive();
      else this.page.set(0);
      this.msg.set('تمت إضافة المباراة.');
      this.toast.success('تمت إضافة المباراة.');
    } catch (e: unknown) {
      const reason = this.apiMsg(e) ?? 'خطأ — يلزم اسم مباراة وفريقان و11 لاعبًا لكل تشكيلة.';
      this.msg.set(reason);
      this.toast.error(reason);
    }
  }

  async addBank(): Promise<void> {
    this.msg.set('');
    try {
      await firstValueFrom(this.api.addBank(this.newQuestion(), this.newAnswer()));
      this.newQuestion.set('');
      this.newAnswer.set('');
      if (this.page() === 0) this.reloadActive();
      else this.page.set(0);
      this.msg.set('تمت إضافة سؤال البنك.');
      this.toast.success('تمت إضافة سؤال البنك.');
    } catch (e: unknown) {
      const reason = this.apiMsg(e) ?? 'خطأ — تأكد من طول السؤال والجواب.';
      this.msg.set(reason);
      this.toast.error(reason);
    }
  }

  async addRisk(): Promise<void> {
    this.msg.set('');
    const genre = this.newGenre().trim();
    const questions = this.newRisk().map((q, i) => ({
      points: RISK_TIERS[i], question: q.question.trim(), answer: q.answer.trim(),
    }));
    if (!genre || questions.some((q) => !q.question || !q.answer)) {
      const reason = 'أكمل النوع والأسئلة الأربعة (سؤال وجواب) قبل الإضافة.';
      this.msg.set(reason);
      this.toast.error(reason);
      return;
    }
    try {
      await firstValueFrom(this.api.addRisk(genre, questions));
      this.newGenre.set('');
      this.newRisk.set(blankRisk());
      if (this.page() === 0) this.reloadActive();
      else this.page.set(0);
      this.msg.set('تمت إضافة حزمة الريسك.');
      this.toast.success('تمت إضافة حزمة الريسك.');
    } catch (e: unknown) {
      const reason = this.apiMsg(e) ?? 'خطأ — يلزم نوع وأربعة أسئلة بفئات 5/10/20/40.';
      this.msg.set(reason);
      this.toast.error(reason);
    }
  }

  async addAnameen(): Promise<void> {
    this.msg.set('');
    const player = this.newSubject().trim();
    const clues = this.newClues().map((c) => c.trim());
    if (!player || clues.some((c) => !c)) {
      const reason = 'أكمل اسم الشخصية والتلميحات الخمس قبل الإضافة.';
      this.msg.set(reason);
      this.toast.error(reason);
      return;
    }
    try {
      const saved = await firstValueFrom(this.api.addAnameen(player, clues));
      this.newSubject.set('');
      this.newClues.set(Array(ANAMEEN_CLUES).fill(''));
      if (this.page() === 0) this.reloadActive();
      else this.page.set(0);
      const ok = `تمت إضافة الشخصية (#${saved.id}).`;
      this.msg.set(ok);
      this.toast.success(ok);
    } catch (e: unknown) {
      const reason = this.apiMsg(e) ?? 'خطأ — يلزم اسم وخمسة تلميحات مميزة.';
      this.msg.set(reason);
      this.toast.error(reason);
    }
  }

  async addWhopicture(): Promise<void> {
    this.msg.set('');
    const photoUrl = this.newPhotoUrl().trim();
    const players = this.newPhotoPlayers().map((p) => p.trim());
    if (!photoUrl || players.some((p) => !p)) {
      const reason = 'أكمل رابط الصورة وأسماء اللاعبين الـ11 قبل الإضافة.';
      this.msg.set(reason);
      this.toast.error(reason);
      return;
    }
    try {
      const saved = await firstValueFrom(this.api.addWhopicture(photoUrl, players));
      this.newPhotoUrl.set('');
      this.newPhotoPlayers.set(Array(LINEUP_SIZE).fill(''));
      if (this.page() === 0) this.reloadActive();
      else this.page.set(0);
      const ok = `تمت إضافة الصورة (#${saved.id}).`;
      this.msg.set(ok);
      this.toast.success(ok);
    } catch (e: unknown) {
      const reason = this.apiMsg(e) ?? 'خطأ — يلزم رابط صالح و11 اسمًا مميزًا.';
      this.msg.set(reason);
      this.toast.error(reason);
    }
  }

  async removePlayer(id: number): Promise<void> {
    try {
      await firstValueFrom(this.api.del('players', id));
    } catch (e: unknown) {
      if (this.denyIf401(e)) return;
      this.msg.set('تعذّر الحذف — أعد المحاولة.');
      return;
    }
    this.afterDelete(this.playersRes.value()?.content.length ?? 0);
  }

  async removeIhbid(id: number): Promise<void> {
    try {
      await firstValueFrom(this.api.del('ihbid', id));
    } catch (e: unknown) {
      if (this.denyIf401(e)) return;
      this.msg.set('تعذّر الحذف — أعد المحاولة.');
      return;
    }
    this.afterDelete(this.ihbidRes.value()?.content.length ?? 0);
  }

  async removeOffside(id: number): Promise<void> {
    try {
      await firstValueFrom(this.api.del('offside', id));
    } catch (e: unknown) {
      if (this.denyIf401(e)) return;
      this.msg.set('تعذّر الحذف — أعد المحاولة.');
      return;
    }
    this.afterDelete(this.offsideRes.value()?.content.length ?? 0);
  }

  async removeTop10(id: number): Promise<void> {
    try {
      await firstValueFrom(this.api.del('top10', id));
    } catch (e: unknown) {
      if (this.denyIf401(e)) return;
      this.msg.set('تعذّر الحذف — أعد المحاولة.');
      return;
    }
    this.afterDelete(this.top10Res.value()?.content.length ?? 0);
  }

  async removeScoresheet(id: number): Promise<void> {
    try {
      await firstValueFrom(this.api.del('scoresheet', id));
    } catch (e: unknown) {
      if (this.denyIf401(e)) return;
      this.msg.set('تعذّر الحذف — أعد المحاولة.');
      return;
    }
    this.afterDelete(this.scoresheetRes.value()?.content.length ?? 0);
  }

  async removeBank(id: number): Promise<void> {
    try {
      await firstValueFrom(this.api.del('bank', id));
    } catch (e: unknown) {
      if (this.denyIf401(e)) return;
      this.msg.set('تعذّر الحذف — أعد المحاولة.');
      return;
    }
    this.afterDelete(this.bankRes.value()?.content.length ?? 0);
  }

  async removeRisk(id: number): Promise<void> {
    try {
      await firstValueFrom(this.api.del('risk', id));
    } catch (e: unknown) {
      if (this.denyIf401(e)) return;
      this.msg.set('تعذّر الحذف — أعد المحاولة.');
      return;
    }
    this.afterDelete(this.riskRes.value()?.content.length ?? 0);
  }

  async removeAnameen(id: number): Promise<void> {
    try {
      await firstValueFrom(this.api.del('anameen', id));
    } catch (e: unknown) {
      if (this.denyIf401(e)) return;
      this.msg.set('تعذّر الحذف — أعد المحاولة.');
      return;
    }
    this.afterDelete(this.anameenRes.value()?.content.length ?? 0);
  }

  async removeWhopicture(id: number): Promise<void> {
    try {
      await firstValueFrom(this.api.del('whopicture', id));
    } catch (e: unknown) {
      if (this.denyIf401(e)) return;
      this.msg.set('تعذّر الحذف — أعد المحاولة.');
      return;
    }
    this.afterDelete(this.whopictureRes.value()?.content.length ?? 0);
  }

  private afterDelete(leftOnPage: number): void {
    if (leftOnPage <= 1 && this.page() > 0) this.page.update((p) => p - 1);
    else this.reloadActive();
  }

  private denyIf401(e: unknown): boolean {
    if (typeof e === 'object' && e !== null && 'status' in e) {
      if ((e as { status: unknown }).status === 401) {
        this.api.lock();
        this.adminError.set('كلمة المرور غير صحيحة.');
        return true;
      }
    }
    return false;
  }

  private apiMsg(e: unknown): string | null {
    if (typeof e === 'object' && e !== null && 'error' in e) {
      const err = (e as { error?: { message?: unknown } }).error;
      if (err && typeof err.message === 'string' && err.message) return err.message;
    }
    return null;
  }
}
