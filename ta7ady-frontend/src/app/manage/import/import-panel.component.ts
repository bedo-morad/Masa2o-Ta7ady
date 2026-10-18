import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { HotToastService } from '@ngxpert/hot-toast';
import { ApiService, BulkRowResult, Pool } from '../../api.service';
import { POOL_METADATA } from './import-metadata';

@Component({
  selector: 'app-import-panel',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './import-panel.component.html',
  styleUrl: './import-panel.component.scss',
})
export class ImportPanelComponent {
  private api = inject(ApiService);
  private toast = inject(HotToastService);

  readonly pool = input.required<Pool>();
  readonly imported = output<void>();

  readonly raw = signal('');
  readonly parseError = signal('');
  readonly rows = signal<unknown[]>([]);
  readonly hasParsed = signal(false);
  readonly parsing = signal(false);
  readonly preview = signal<BulkRowResult[] | null>(null);
  readonly previewError = signal('');
  readonly dryRunning = signal(false);
  readonly result = signal<BulkRowResult[] | null>(null);
  readonly confirmError = signal('');
  readonly confirming = signal(false);

  readonly poolLabel = computed(() => POOL_METADATA[this.pool()].label);
  readonly schemaExample = computed(() => POOL_METADATA[this.pool()].schemaExample);
  readonly schemaNote = computed(() => POOL_METADATA[this.pool()].schemaNote);
  readonly busy = computed(() => this.parsing() || this.dryRunning() || this.confirming());
  readonly rowCount = computed(() => this.rows().length);
  readonly validCount = computed(() => (this.preview() ?? []).filter((r) => r.ok).length);
  readonly invalidCount = computed(() => (this.preview() ?? []).filter((r) => !r.ok).length);
  readonly savedCount = computed(() => (this.result() ?? []).filter((r) => r.ok).length);
  readonly failedRows = computed(() => (this.result() ?? []).filter((r) => !r.ok));
  readonly savedIds = computed(() =>
    (this.result() ?? []).filter((r) => r.ok && r.id !== undefined).map((r) => r.id as number),
  );

  constructor() {
    effect(
      () => {
        this.pool();
        this.reset();
      },
      { allowSignalWrites: true },
    );
  }

  private reset(): void {
    this.raw.set('');
    this.parseError.set('');
    this.rows.set([]);
    this.hasParsed.set(false);
    this.parsing.set(false);
    this.preview.set(null);
    this.previewError.set('');
    this.dryRunning.set(false);
    this.result.set(null);
    this.confirmError.set('');
    this.confirming.set(false);
  }

  async onFile(ev: Event): Promise<void> {
    const el = ev.target as HTMLInputElement | null;
    const file = el?.files?.[0];
    if (!file) return;
    this.parsing.set(true);
    try {
      const text = await file.text();
      this.raw.set(text);
      await this.parse();
    } finally {
      if (el) el.value = '';
      if (!this.hasParsed()) this.parsing.set(false);
    }
  }

  async parse(): Promise<void> {
    this.parsing.set(true);
    this.parseError.set('');
    this.preview.set(null);
    this.previewError.set('');
    this.result.set(null);
    this.confirmError.set('');
    this.hasParsed.set(false);
    // Let the spinner paint before a large JSON.parse blocks the thread.
    await new Promise((r) => setTimeout(r, 0));
    try {
      const text = this.raw().trim();
      if (!text) {
        this.parseError.set('الصق محتوى JSON أولًا أو اختر ملفًا.');
        this.rows.set([]);
        return;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        this.parseError.set('الملف ليس JSON صالحًا — راجع الأقواس والفواصل وعلامات التنصيص.');
        this.rows.set([]);
        return;
      }
      if (!Array.isArray(parsed)) {
        this.parseError.set('المحتوى يجب أن يكون مصفوفة JSON: [ {...}, {...} ].');
        this.rows.set([]);
        return;
      }
      if (parsed.length === 0) {
        this.parseError.set('المصفوفة فارغة — لا توجد صفوف للاستيراد.');
        this.rows.set([]);
        return;
      }
      if (parsed.length > 1000) {
        this.parseError.set('عدد الصفوف يتجاوز الحد الأقصى (1000). قسّم الملف ثم أعد المحاولة.');
        this.rows.set([]);
        return;
      }
      this.rows.set(parsed);
      this.hasParsed.set(true);
    } finally {
      this.parsing.set(false);
    }
  }

  async dryRun(): Promise<void> {
    if (!this.hasParsed() || this.dryRunning()) return;
    this.dryRunning.set(true);
    this.previewError.set('');
    this.preview.set(null);
    this.result.set(null);
    this.confirmError.set('');
    try {
      const res = await firstValueFrom(this.api.bulk(this.pool(), this.rows(), true));
      this.preview.set(res ?? []);
    } catch {
      this.previewError.set('تعذّر تنفيذ المعاينة — تحقق من الاتصال ثم أعد المحاولة.');
    } finally {
      this.dryRunning.set(false);
    }
  }

  async confirm(): Promise<void> {
    if (!this.preview() || this.confirming()) return;
    this.confirming.set(true);
    this.confirmError.set('');
    try {
      const res = await firstValueFrom(this.api.bulk(this.pool(), this.rows(), false));
      this.result.set(res ?? []);
      this.preview.set(null);
      const saved = (res ?? []).filter((r) => r.ok).length;
      this.toast.success(`تم حفظ ${saved} من الصفوف.`);
      this.imported.emit();
    } catch (e: unknown) {
      const reason = this.bulkMsg(e) ?? 'تعذّر الحفظ — تحقق من الاتصال ثم أعد المحاولة.';
      this.confirmError.set(reason);
      this.toast.error(reason);
    } finally {
      this.confirming.set(false);
    }
  }

  dropInvalid(): void {
    const pv = this.preview();
    if (!pv) return;
    const okIdx = new Set(pv.filter((r) => r.ok).map((r) => r.index));
    const kept = this.rows().filter((_, i) => okIdx.has(i));
    this.raw.set(JSON.stringify(kept, null, 2));
    void this.parse();
  }

  startOver(): void {
    this.reset();
  }

  labelFor(i: number): string {
    const r = this.rows()[i] as Record<string, unknown> | null;
    return POOL_METADATA[this.pool()].previewLabel(r && typeof r === 'object' ? r : null, i);
  }

  private bulkMsg(e: unknown): string | null {
    if (typeof e === 'object' && e !== null && 'error' in e) {
      const err = (e as { error?: { message?: unknown } }).error;
      if (err && typeof err.message === 'string' && err.message) return err.message;
    }
    return null;
  }
}
