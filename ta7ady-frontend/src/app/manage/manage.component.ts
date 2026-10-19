import { Component, inject, signal } from '@angular/core';
import { HotToastService } from '@ngxpert/hot-toast';
import { ApiService, Pool } from '../services/api.service';
import { ManageAccessComponent } from './access/manage-access.component';
import { ManageAdminAccess } from './access/manage-admin-access';
import { ManagePoolNavigationComponent } from './navigation/manage-pool-navigation.component';
import { ImportPanelComponent } from './import/import-panel.component';
import { ManageCatalog } from './catalog/manage-catalog';
import { ManageRowSelection } from './catalog/manage-row-selection';
import { PlayersCatalogComponent } from './catalog/players/players-catalog.component';
import { IhbidCatalogComponent } from './catalog/ihbid/ihbid-catalog.component';
import { OffsideCatalogComponent } from './catalog/offside/offside-catalog.component';
import { Top10CatalogComponent } from './catalog/top10/top10-catalog.component';
import { ScoresheetCatalogComponent } from './catalog/scoresheet/scoresheet-catalog.component';
import { BankCatalogComponent } from './catalog/bank/bank-catalog.component';
import { RiskCatalogComponent } from './catalog/risk/risk-catalog.component';
import { AnameenCatalogComponent } from './catalog/anameen/anameen-catalog.component';
import { WhopictureCatalogComponent } from './catalog/whopicture/whopicture-catalog.component';
import { PlayersEditorComponent } from './editors/players/players-editor.component';
import { IhbidEditorComponent } from './editors/ihbid/ihbid-editor.component';
import { OffsideEditorComponent } from './editors/offside/offside-editor.component';
import { BankEditorComponent } from './editors/bank/bank-editor.component';
import { Top10EditorComponent } from './editors/top10/top10-editor.component';
import { AnameenEditorComponent } from './editors/anameen/anameen-editor.component';
import { ScoreSheetEditorComponent } from './editors/scoresheet/scoresheet-editor.component';
import { WhoPictureEditorComponent } from './editors/whopicture/whopicture-editor.component';
import { RiskPackEditorComponent } from './editors/risk/risk-pack-editor.component';
import { ManageEditorHost } from './editors/shared/editor-host';
import { makeSharedBasicDrafts } from './editors/shared/basic-drafts';
import { PlayersEditor } from './editors/players/players-editor';
import { IhbidEditor } from './editors/ihbid/ihbid-editor';
import { OffsideEditor } from './editors/offside/offside-editor';
import { BankEditor } from './editors/bank/bank-editor';
import { Top10Editor } from './editors/top10/top10-editor';
import { AnameenEditor } from './editors/anameen/anameen-editor';
import { ScoreSheetEditor } from './editors/scoresheet/scoresheet-editor';
import { WhoPictureEditor } from './editors/whopicture/whopicture-editor';
import { RiskPackEditorModel } from './editors/risk/risk-pack-editor';

@Component({
  selector: 'app-manage',
  standalone: true,
  imports: [
    ManageAccessComponent,
    ManagePoolNavigationComponent,
    ImportPanelComponent,
    PlayersCatalogComponent,
    IhbidCatalogComponent,
    OffsideCatalogComponent,
    Top10CatalogComponent,
    ScoresheetCatalogComponent,
    BankCatalogComponent,
    RiskCatalogComponent,
    AnameenCatalogComponent,
    WhopictureCatalogComponent,
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
  private readonly toast = inject(HotToastService);
  readonly catalog = new ManageCatalog(this.api);
  readonly selection = new ManageRowSelection();
  readonly msg = signal('');
  readonly admin = new ManageAdminAccess(this.api, (message, intent) => {
    this.msg.set(message);
    if (intent === 'error') this.toast.error(message);
  });
  readonly pool = this.catalog.pool;
  readonly page = this.catalog.page;
  readonly basicDrafts = makeSharedBasicDrafts();

  readonly editorHost: ManageEditorHost = {
    authorization: () => this.admin.adminOn(),
    requestEdit: (id) => this.selection.requestEdit(id),
    cancelEdit: () => this.selection.cancelEdit(),
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
      this.editorHost.reportFeedback(this.apiMsg(error) ?? fallback, 'error');
    },
    reportEditFailure: (error, fallback) => {
      if (this.denyIf401(error)) return;
      this.editorHost.reportFeedback(this.apiMsg(error) ?? fallback, 'error');
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

  select(pool: Pool): void {
    this.catalog.select(pool);
    this.msg.set('');
    this.selection.reset();
  }

  prev(): void {
    this.catalog.prev();
    this.selection.reset();
  }

  next(): void {
    this.catalog.next();
    this.selection.reset();
  }

  onImported(): void {
    this.catalog.reloadActive();
    this.msg.set('تم الاستيراد — القائمة محدثة.');
  }

  removeFromCatalog(pool: Pool, id: number): Promise<void> {
    this.editorHost.clearFeedback();
    return this.catalog.delete(
      pool,
      id,
      () => this.admin.rejectUnauthorized(),
      () => this.editorHost.reportFeedback('تعذّر الحذف — أعد المحاولة.', 'error'),
    );
  }

  private denyIf401(error: unknown): boolean {
    if (typeof error !== 'object' || error === null || !('status' in error)) return false;
    if (error.status !== 401) return false;
    this.admin.rejectUnauthorized();
    return true;
  }

  private apiMsg(error: unknown): string | null {
    if (typeof error !== 'object' || error === null || !('error' in error)) return null;
    const body = error.error as { message?: unknown } | undefined;
    return body && typeof body.message === 'string' && body.message ? body.message : null;
  }
}
