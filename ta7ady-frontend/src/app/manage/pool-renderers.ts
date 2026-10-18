import { Component, Input, Signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BankQuestion, IhbidQuestion, OffsideRule, PlayerName } from '../api.service';
import { BankEditor, IhbidEditor, OffsideEditor, PlayersEditor } from './pool-editors';

interface RendererContext {
  adminOn: Signal<boolean>;
  editingId: Signal<number | null>;
  cancelEdit(): void;
}

type RenderMode = 'add' | 'rows';

@Component({
  selector: 'app-players-renderer', standalone: true, imports: [FormsModule],
  template: `
    @if (mode === 'add') {
      <form class="add" (ngSubmit)="editor.add()">
        <input [(ngModel)]="editor.drafts.addPlayer" name="np" placeholder="اسم لاعب جديد (3 أحرف على الأقل)" />
        <button type="submit"><i class="fa-solid fa-plus"></i> إضافة</button>
      </form>
    } @else {
      @for (p of rows; track p.id) {
        <li>
          @if (ctx.adminOn() && ctx.editingId() === p.id) {
            <form class="edit" (ngSubmit)="editor.save(p.id)">
              <input [(ngModel)]="editor.drafts.editText" name="editPlayer" placeholder="اسم اللاعب" aria-label="تعديل اسم اللاعب" />
              <div class="edit-actions">
                <button type="submit" class="save"><i class="fa-solid fa-check"></i> حفظ</button>
                <button type="button" class="cancel" (click)="ctx.cancelEdit()">إلغاء</button>
              </div>
            </form>
          } @else {
            <span>{{ p.playerName }}</span>
            @if (ctx.adminOn()) {
              <div class="row-actions">
                <button type="button" class="edit-btn" (click)="editor.start(p)" aria-label="تعديل" title="تعديل"><i class="fa-solid fa-pen"></i></button>
                <button type="button" class="del" (click)="remove(p.id)" aria-label="حذف"><i class="fa-solid fa-trash"></i> حذف</button>
              </div>
            }
          }
        </li>
      }
    }
  `,
})
export class PlayersRenderer {
  @Input({ required: true }) editor!: PlayersEditor;
  @Input() rows!: PlayerName[];
  @Input() ctx!: RendererContext;
  @Input() remove!: (id: number) => void;
  @Input() mode: RenderMode = 'rows';
}

@Component({
  selector: 'app-ihbid-renderer', standalone: true, imports: [FormsModule],
  template: `
    @if (mode === 'add') {
      <form class="add column" (ngSubmit)="editor.add()">
        <input [(ngModel)]="editor.drafts.addQuestion" name="nq" placeholder="السؤال" />
        <input [(ngModel)]="editor.drafts.addAnswer" name="na" placeholder="الجواب (رقم أو تاريخ)" />
        <button type="submit"><i class="fa-solid fa-plus"></i> إضافة سؤال</button>
      </form>
    } @else {
      @for (q of rows; track q.id) {
        <li class="wide ihbid-row">
          @if (ctx.adminOn() && ctx.editingId() === q.id) {
            <form class="edit column" (ngSubmit)="editor.save(q.id)">
              <input [(ngModel)]="editor.drafts.editQuestion" name="editIhbidQ" placeholder="السؤال" aria-label="تعديل السؤال" />
              <input [(ngModel)]="editor.drafts.editAnswer" name="editIhbidA" placeholder="الجواب (رقم أو تاريخ)" aria-label="تعديل الجواب" />
              <div class="edit-actions"><button type="submit" class="save"><i class="fa-solid fa-check"></i> حفظ</button><button type="button" class="cancel" (click)="ctx.cancelEdit()">إلغاء</button></div>
            </form>
          } @else {
            <span class="qa"><span class="q">{{ q.questionText }}</span><span class="answer-chip">{{ q.answerText }}</span></span>
            @if (ctx.adminOn()) {
              <div class="row-actions"><button type="button" class="edit-btn" (click)="editor.start(q)" aria-label="تعديل" title="تعديل"><i class="fa-solid fa-pen"></i></button><button type="button" class="del" (click)="remove(q.id)" aria-label="حذف"><i class="fa-solid fa-trash"></i> حذف</button></div>
            }
          }
        </li>
      }
    }
  `,
})
export class IhbidRenderer {
  @Input({ required: true }) editor!: IhbidEditor;
  @Input() rows!: IhbidQuestion[];
  @Input() ctx!: RendererContext;
  @Input() remove!: (id: number) => void;
  @Input() mode: RenderMode = 'rows';
}

@Component({
  selector: 'app-offside-renderer', standalone: true, imports: [FormsModule],
  template: `
    @if (mode === 'add') {
      <form class="add" (ngSubmit)="editor.add()"><input [(ngModel)]="editor.drafts.addRule" name="nr" placeholder="قاعدة جديدة — مثال: لاعب إيطالي" /><button type="submit"><i class="fa-solid fa-plus"></i> إضافة</button></form>
    } @else {
      @for (r of rows; track r.id) {
        <li>
          @if (ctx.adminOn() && ctx.editingId() === r.id) {
            <form class="edit" (ngSubmit)="editor.save(r.id)"><input [(ngModel)]="editor.drafts.editText" name="editRule" placeholder="القاعدة" aria-label="تعديل القاعدة" /><div class="edit-actions"><button type="submit" class="save"><i class="fa-solid fa-check"></i> حفظ</button><button type="button" class="cancel" (click)="ctx.cancelEdit()">إلغاء</button></div></form>
          } @else {
            <span>{{ r.ruleText }}</span>
            @if (ctx.adminOn()) { <div class="row-actions"><button type="button" class="edit-btn" (click)="editor.start(r)" aria-label="تعديل" title="تعديل"><i class="fa-solid fa-pen"></i></button><button type="button" class="del" (click)="remove(r.id)" aria-label="حذف"><i class="fa-solid fa-trash"></i> حذف</button></div> }
          }
        </li>
      }
    }
  `,
})
export class OffsideRenderer {
  @Input({ required: true }) editor!: OffsideEditor;
  @Input() rows!: OffsideRule[];
  @Input() ctx!: RendererContext;
  @Input() remove!: (id: number) => void;
  @Input() mode: RenderMode = 'rows';
}

@Component({
  selector: 'app-bank-renderer', standalone: true, imports: [FormsModule],
  template: `
    @if (mode === 'add') {
      <form class="add column" (ngSubmit)="editor.add()"><input [(ngModel)]="editor.drafts.addQuestion" name="nbq" placeholder="السؤال" /><input [(ngModel)]="editor.drafts.addAnswer" name="nba" placeholder="الجواب (قصير)" /><button type="submit"><i class="fa-solid fa-plus"></i> إضافة سؤال</button></form>
    } @else {
      @for (b of rows; track b.id) {
        <li class="wide bank-row">
          @if (ctx.adminOn() && ctx.editingId() === b.id) {
            <form class="edit column" (ngSubmit)="editor.save(b.id)"><input [(ngModel)]="editor.drafts.editQuestion" name="editBankQ" placeholder="السؤال" aria-label="تعديل السؤال" /><input [(ngModel)]="editor.drafts.editAnswer" name="editBankA" placeholder="الجواب (قصير)" aria-label="تعديل الجواب" /><div class="edit-actions"><button type="submit" class="save"><i class="fa-solid fa-check"></i> حفظ</button><button type="button" class="cancel" (click)="ctx.cancelEdit()">إلغاء</button></div></form>
          } @else {
            <span class="qa"><span class="q">{{ b.question }}</span><span class="answer-chip">{{ b.answer }}</span></span>
            @if (ctx.adminOn()) { <div class="row-actions"><button type="button" class="edit-btn" (click)="editor.start(b)" aria-label="تعديل" title="تعديل"><i class="fa-solid fa-pen"></i></button><button type="button" class="del" (click)="remove(b.id)" aria-label="حذف"><i class="fa-solid fa-trash"></i> حذف</button></div> }
          }
        </li>
      }
    }
  `,
})
export class BankRenderer {
  @Input({ required: true }) editor!: BankEditor;
  @Input() rows!: BankQuestion[];
  @Input() ctx!: RendererContext;
  @Input() remove!: (id: number) => void;
  @Input() mode: RenderMode = 'rows';
}
