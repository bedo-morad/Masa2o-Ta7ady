import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { HotToastService } from '@ngxpert/hot-toast';
import { ApiService, BulkRowResult, Pool } from '../../api.service';

const POOL_LABEL: Record<Pool, string> = {
  players: 'أسماء اللاعبين',
  ihbid: 'اهبد صح',
  offside: 'أوفسايد',
  top10: 'توب 10',
  scoresheet: 'سكور شيت',
  bank: 'بنك',
  risk: 'ريسك',
  anameen: 'من أنا؟',
  whopicture: 'مين في الصورة',
};

const SCHEMA_EXAMPLE: Record<Pool, string> = {
  players: '[\n  { "playerName": "أشرف حكيمي" },\n  { "playerName": "محمد الشناوي" }\n]',
  ihbid:
    '[\n  { "questionText": "كم عدد كؤوس العالم التي فازت بها البرازيل؟", "answerText": "5" }\n]',
  offside: '[\n  { "ruleText": "لاعب إيطالي" },\n  { "ruleText": "حارس مرمى فاز بكأس العالم" }\n]',
  top10:
    '[\n  {\n    "prompt": "أعلى 13 هدافًا في تاريخ الدوري الإنجليزي",\n    "answers": ["الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس",\n      "السابع", "الثامن", "التاسع", "العاشر", "الحادي عشر", "الثاني عشر", "الثالث عشر"]\n  }\n]',
  scoresheet:
    '[\n  {\n    "match": "نهائي كأس العالم 2022",\n    "teamA": "الأرجنتين",\n    "teamB": "فرنسا",\n'
    + '    "lineupA": ["أ1", "أ2", "أ3", "أ4", "أ5", "أ6", "أ7", "أ8", "أ9", "أ10", "أ11"],\n'
    + '    "lineupB": ["ب1", "ب2", "ب3", "ب4", "ب5", "ب6", "ب7", "ب8", "ب9", "ب10", "ب11"]\n  }\n]',
  bank: '[\n  { "question": "من فاز بكأس العالم 2022؟", "answer": "الأرجنتين" }\n]',
  risk:
    '[\n  {\n    "genre": "ريال مدريد",\n    "questions": [\n'
    + '      { "points": 5, "question": "...", "answer": "..." },\n'
    + '      { "points": 10, "question": "...", "answer": "..." },\n'
    + '      { "points": 20, "question": "...", "answer": "..." },\n'
    + '      { "points": 40, "question": "...", "answer": "..." }\n    ]\n  }\n]',
  anameen:
    '[\n  {\n    "player": "محمد صلاح",\n'
    + '    "clues": ["تلميح صعب 1", "تلميح صعب 2", "تلميح متوسط", "تلميح واضح", "أسهل تلميح"]\n  }\n]',
  whopicture:
    '[\n  {\n    "title": "الأهلي 2021 نهائي دوري أبطال أفريقيا",\n'
    + '    "photoUrl": "https://example.com/photo.jpg",\n'
    + '    "players": ["أ1", "أ2", "أ3", "أ4", "أ5", "أ6", "أ7", "أ8", "أ9", "أ10", "أ11"]\n  }\n]',
};

const SCHEMA_NOTE: Record<Pool, string> = {
  players: 'كل صف: {"playerName"} — 3 أحرف على الأقل.',
  ihbid: 'كل صف: {"questionText", "answerText"} — 3 أحرف على الأقل لكل حقل.',
  offside: 'كل صف: {"ruleText"} — 3 أحرف على الأقل.',
  top10: 'كل صف: {"prompt", "answers"} — الإجابات 13 بالترتيب تمامًا (الأولى = المركز الأول).',
  scoresheet:
    'كل صف: {"match", "teamA", "teamB", "lineupA", "lineupB"} — كل تشكيلة 11 اسمًا تمامًا.',
  bank: 'كل صف: {"question", "answer"} — سؤال سريع بإجابة قصيرة.',
  risk: 'كل صف: {"genre", "questions"} — 4 أسئلة بترتيب الدرجات 5/10/20/40.',
  anameen:
    'كل صف: {"player", "clues"} — 5 تلميحات بالترتيب تمامًا (الأصعب أولًا)، كل واحد 3 أحرف على الأقل.',
  whopicture:
    'كل صف: {"title", "photoUrl", "players"} — عنوان واضح (3 أحرف على الأقل) + رابط http(s) صحيح + 11 اسمًا للصورة تمامًا.',
};

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

  readonly poolLabel = computed(() => POOL_LABEL[this.pool()]);
  readonly schemaExample = computed(() => SCHEMA_EXAMPLE[this.pool()]);
  readonly schemaNote = computed(() => SCHEMA_NOTE[this.pool()]);
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
    if (!r || typeof r !== 'object') return `صف ${i + 1}`;
    const s = (v: unknown): string => (typeof v === 'string' && v.trim() ? v.trim() : '');
    const p = this.pool();
    if (p === 'players') return s(r['playerName']) || `صف ${i + 1}`;
    if (p === 'ihbid') return s(r['questionText']) || `صف ${i + 1}`;
    if (p === 'offside') return s(r['ruleText']) || `صف ${i + 1}`;
    if (p === 'top10') return s(r['prompt']) || `صف ${i + 1}`;
    if (p === 'anameen') return s(r['player']) || `صف ${i + 1}`;
    if (p === 'whopicture') return s(r['title']) || s(r['photoUrl']) || firstPlayer(r) || `صف ${i + 1}`;
    const m = r['match'] ?? r['matchLabel'] ?? r['match_label'];
    return s(m) || `صف ${i + 1}`;
  }

  private bulkMsg(e: unknown): string | null {
    if (typeof e === 'object' && e !== null && 'error' in e) {
      const err = (e as { error?: { message?: unknown } }).error;
      if (err && typeof err.message === 'string' && err.message) return err.message;
    }
    return null;
  }
}

// Fallback label for a whopicture row whose URL is missing: the first pictured name.
function firstPlayer(r: Record<string, unknown>): string {
  const list = r['players'];
  if (Array.isArray(list) && typeof list[0] === 'string') return list[0].trim();
  return '';
}
