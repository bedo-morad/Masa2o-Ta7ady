import { Component, computed, inject, signal, TemplateRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { HotToastService } from '@ngxpert/hot-toast';
import { ApiService, Pool } from '../api.service';
import { ImportPanelComponent } from './import/import-panel.component';
import { PlayersEditorComponent } from './editors/players/players-editor.component';
import { IhbidEditorComponent } from './editors/ihbid/ihbid-editor.component';
import { OffsideEditorComponent } from './editors/offside/offside-editor.component';
import { BankEditorComponent } from './editors/bank/bank-editor.component';
import { ManageCatalog } from './catalog/manage-catalog';
import { ManageEditorHost } from './editors/shared/editor-host';
import { Top10Editor } from './editors/top10/top10-editor';
import { AnameenEditor } from './editors/anameen/anameen-editor';
import { Top10EditorComponent } from './editors/top10/top10-editor.component';
import { AnameenEditorComponent } from './editors/anameen/anameen-editor.component';
import { ScoreSheetEditor } from './editors/scoresheet/scoresheet-editor';
import { ScoreSheetEditorComponent } from './editors/scoresheet/scoresheet-editor.component';
import { WhoPictureEditor } from './editors/whopicture/whopicture-editor';
import { WhoPictureEditorComponent } from './editors/whopicture/whopicture-editor.component';
import { RiskPackEditorModel } from './editors/risk/risk-pack-editor';
import { RiskPackEditorComponent } from './editors/risk/risk-pack-editor.component';
import { makeSharedBasicDrafts } from './editors/shared/basic-drafts';
import { PlayersEditor } from './editors/players/players-editor';
import { IhbidEditor } from './editors/ihbid/ihbid-editor';
import { OffsideEditor } from './editors/offside/offside-editor';
import { BankEditor } from './editors/bank/bank-editor';

export const TOP10_SIZE = 13;
export const LINEUP_SIZE = 11;
export const ANAMEEN_CLUES = 5;
export const RISK_TIERS = [5, 10, 20, 40];
export const RISK_SIZE = RISK_TIERS.length;

@Component({
  selector: 'app-manage',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    ImportPanelComponent,
    PlayersEditorComponent,
    IhbidEditorComponent,
    OffsideEditorComponent,
    BankEditorComponent,
    Top10EditorComponent,
    AnameenEditorComponent,
    ScoreSheetEditorComponent,
    WhoPictureEditorComponent,
    RiskPackEditorComponent,
  ],
  templateUrl: './manage.component.html',
  styleUrl: './manage.component.scss',
})
export class ManageComponent {
  readonly api = inject(ApiService);
  readonly catalog = new ManageCatalog(this.api);
  readonly basicDrafts = makeSharedBasicDrafts();
  private readonly modal = inject(NgbModal);
  private readonly toast = inject(HotToastService);

  readonly pool = this.catalog.pool;
  readonly page = this.catalog.page;
  readonly msg = signal('');

  readonly adminPw = signal('');
  readonly adminError = signal('');
  readonly adminOn = computed(() => this.api.adminPassword() !== null);

  readonly riskTiers = RISK_TIERS;

  // Accordion for managed top-10 / scoresheet / risk rows: one open at a time.
  readonly expandedId = signal<number | null>(null);

  // Inline edit (SPECV3 §3.1): one row open at a time, admin-unlocked only.
  readonly editingId = signal<number | null>(null);

  toggle(id: number): void {
    this.expandedId.update((open) => (open === id ? null : id));
  }

  isOpen(id: number): boolean {
    return this.expandedId() === id;
  }

  cancelEdit(): void {
    this.editingId.set(null);
  }

  readonly playersRes = this.catalog.playersRes;
  readonly ihbidRes = this.catalog.ihbidRes;
  readonly offsideRes = this.catalog.offsideRes;
  readonly top10Res = this.catalog.top10Res;
  readonly scoresheetRes = this.catalog.scoresheetRes;
  readonly bankRes = this.catalog.bankRes;
  readonly riskRes = this.catalog.riskRes;
  readonly anameenRes = this.catalog.anameenRes;
  readonly whopictureRes = this.catalog.whopictureRes;
  readonly playerRows = this.catalog.playerRows;
  readonly ihbidRows = this.catalog.ihbidRows;
  readonly offsideRows = this.catalog.offsideRows;
  readonly top10Rows = this.catalog.top10Rows;
  readonly scoresheetRows = this.catalog.scoresheetRows;
  readonly bankRows = this.catalog.bankRows;
  readonly riskRows = this.catalog.riskRows;
  readonly anameenRows = this.catalog.anameenRows;
  readonly whopictureRows = this.catalog.whopictureRows;
  readonly totalElements = this.catalog.totalElements;
  readonly totalPages = this.catalog.totalPages;
  readonly loading = this.catalog.loading;
  readonly editorHost: ManageEditorHost = {
    authorization: () => this.adminOn(),
    requestEdit: (id) => {
      this.expandedId.set(null);
      this.editingId.set(id);
    },
    cancelEdit: () => this.editingId.set(null),
    refreshAfterMutation: () => this.catalog.reloadActive(),
    reportFeedback: (message, intent) => {
      this.msg.set(message);
      if (intent === 'success') this.toast.success(message);
      else this.toast.error(message);
    },
    clearFeedback: () => this.msg.set(''),
    refreshAfterAdd: () => {
      if (this.page() === 0) this.catalog.reloadActive();
      else this.page.set(0);
    },
    reportMutationFailure: (error, fallback) => {
      const reason = this.apiMsg(error) ?? fallback;
      this.editorHost.reportFeedback(reason, 'error');
    },
    reportEditFailure: (error, fallback) => {
      if (this.denyIf401(error)) return;
      const reason = this.apiMsg(error) ?? fallback;
      this.editorHost.reportFeedback(reason, 'error');
    },
    completeEdit: (message) => {
      this.editorHost.cancelEdit();
      this.editorHost.refreshAfterMutation();
      this.editorHost.reportFeedback(message, 'success');
    },
  };
  readonly playersEditor = new PlayersEditor(this.api, this.editorHost, this.basicDrafts);
  readonly ihbidEditor = new IhbidEditor(this.api, this.editorHost, this.basicDrafts);
  readonly offsideEditor = new OffsideEditor(this.api, this.editorHost, this.basicDrafts);
  readonly bankEditor = new BankEditor(this.api, this.editorHost, this.basicDrafts);
  readonly top10Editor = new Top10Editor(this.api, this.editorHost);
  readonly anameenEditor = new AnameenEditor(this.api, this.editorHost);
  readonly scoresheetEditor = new ScoreSheetEditor(this.api, this.editorHost);
  readonly whopictureEditor = new WhoPictureEditor(this.api, this.editorHost);
  readonly riskEditor = new RiskPackEditorModel(this.api, this.editorHost);
  select(p: Pool): void {
    this.catalog.select(p);
    this.msg.set('');
    this.expandedId.set(null);
    this.editingId.set(null);
  }
  prev(): void {
    this.catalog.prev();
    this.expandedId.set(null);
    this.editingId.set(null);
  }
  next(): void {
    this.catalog.next();
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
    this.catalog.reloadActive();
    this.msg.set('تم الاستيراد — القائمة محدثة.');
  }

  async removePlayer(id: number): Promise<void> {
    return this.removeFromCatalog('players', id);
  }
  async removeIhbid(id: number): Promise<void> {
    return this.removeFromCatalog('ihbid', id);
  }
  async removeOffside(id: number): Promise<void> {
    return this.removeFromCatalog('offside', id);
  }
  async removeTop10(id: number): Promise<void> {
    return this.removeFromCatalog('top10', id);
  }
  async removeScoresheet(id: number): Promise<void> {
    return this.removeFromCatalog('scoresheet', id);
  }
  async removeBank(id: number): Promise<void> {
    return this.removeFromCatalog('bank', id);
  }
  async removeRisk(id: number): Promise<void> {
    return this.removeFromCatalog('risk', id);
  }
  async removeAnameen(id: number): Promise<void> {
    return this.removeFromCatalog('anameen', id);
  }
  async removeWhopicture(id: number): Promise<void> {
    return this.removeFromCatalog('whopicture', id);
  }
  private removeFromCatalog(pool: Pool, id: number): Promise<void> {
    return this.catalog.delete(
      pool,
      id,
      () => {
        this.api.lock();
        this.adminError.set('كلمة المرور غير صحيحة.');
      },
      () => this.msg.set('تعذّر الحذف — أعد المحاولة.'),
    );
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
