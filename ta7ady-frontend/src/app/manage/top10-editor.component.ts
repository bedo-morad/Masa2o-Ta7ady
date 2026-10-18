import { Component, input, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Top10Editor, TOP10_EDITOR_SIZE } from './top10-editor';

@Component({
  selector: 'app-top10-editor',
  standalone: true,
  imports: [FormsModule],
  encapsulation: ViewEncapsulation.None,
  styles: [`app-top10-editor form,app-anameen-editor form{display:flex;flex-direction:column;gap:.5rem}app-top10-editor input,app-anameen-editor input{min-height:48px;padding:.65rem .8rem;border:1px solid var(--pitch-line);border-radius:10px;background:var(--pitch-surface);color:var(--pitch-ink)}app-top10-editor .ranks,app-anameen-editor .ranks{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:.45rem}`],
  template: `
    <form [class.add]="!isEdit()" [class.edit]="isEdit()" class="column" (ngSubmit)="submit()">
      <input [ngModel]="isEdit() ? editor().editPrompt() : editor().prompt()" (ngModelChange)="setPrompt($event)" [name]="isEdit() ? 'editPrompt' : 'ntp'" placeholder="عنوان القائمة — مثال: أعلى 13 هدافًا…" />
      <ol class="ranks">
        @for (rank of ranks; track rank; let i = $index) {
          <li><span class="rank tabular-nums" aria-hidden="true">{{ rank }}</span><input [ngModel]="answer(i)" (ngModelChange)="setAnswer(i, $event)" [name]="(isEdit() ? 'eans' : 'ans') + rank" [placeholder]="'الإجابة رقم ' + rank" [attr.aria-label]="(isEdit() ? 'تعديل ' : '') + 'الإجابة رقم ' + rank" /></li>
        }
      </ol>
      <div class="edit-actions"><button type="submit" [class.save]="isEdit()"><i class="fa-solid" [class.fa-check]="isEdit()" [class.fa-plus]="!isEdit()"></i> {{ isEdit() ? 'حفظ' : 'إضافة قائمة' }}</button>@if (isEdit()) { <button type="button" class="cancel" (click)="editor().hostCancel()">إلغاء</button> }</div>
    </form>
  `,
})
export class Top10EditorComponent {
  readonly editor = input.required<Top10Editor>();
  readonly mode = input<'add' | 'edit'>('add');
  readonly id = input<number>();
  readonly ranks = Array.from({ length: TOP10_EDITOR_SIZE }, (_, i) => i + 1);
  isEdit(): boolean { return this.mode() === 'edit'; }
  answer(i: number): string { return this.isEdit() ? this.editor().editAnswers()[i] : this.editor().answers()[i]; }
  setPrompt(value: string): void { if (this.isEdit()) this.editor().editPrompt.set(value); else this.editor().prompt.set(value); }
  setAnswer(i: number, value: string): void { if (this.isEdit()) this.editor().setEditAnswer(i, value); else this.editor().setAnswer(i, value); }
  submit(): void { if (this.isEdit()) void this.editor().save(this.id()!); else void this.editor().add(); }
}
