import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AnameenEditor, ANAMEEN_EDITOR_CLUES } from './anameen-editor';

@Component({
  selector: 'app-anameen-editor',
  standalone: true,
  imports: [FormsModule],
  template: `
    <form [class.add]="!isEdit()" [class.edit]="isEdit()" class="column" (ngSubmit)="submit()">
      <input [ngModel]="isEdit() ? editor().editSubject() : editor().subject()" (ngModelChange)="setSubject($event)" [name]="isEdit() ? 'editSubject' : 'nsubj'" placeholder="اسم الشخصية — مثال: محمد صلاح" />
      <ol class="ranks">
        @for (clue of slots; track clue; let i = $index) {
          <li><span class="rank tabular-nums" aria-hidden="true">{{ clue }}</span><input [ngModel]="clueValue(i)" (ngModelChange)="setClue(i, $event)" [name]="(isEdit() ? 'eclue' : 'nclue') + clue" [placeholder]="'التلميح رقم ' + clue" [attr.aria-label]="(isEdit() ? 'تعديل ' : '') + 'التلميح رقم ' + clue" /></li>
        }
      </ol>
      <div class="edit-actions"><button type="submit" [class.save]="isEdit()"><i class="fa-solid" [class.fa-check]="isEdit()" [class.fa-plus]="!isEdit()"></i> {{ isEdit() ? 'حفظ' : 'إضافة شخصية' }}</button>@if (isEdit()) { <button type="button" class="cancel" (click)="editor().hostCancel()">إلغاء</button> }</div>
    </form>
  `,
})
export class AnameenEditorComponent {
  readonly editor = input.required<AnameenEditor>();
  readonly mode = input<'add' | 'edit'>('add');
  readonly id = input<number>();
  readonly slots = Array.from({ length: ANAMEEN_EDITOR_CLUES }, (_, i) => i + 1);
  isEdit(): boolean { return this.mode() === 'edit'; }
  clueValue(i: number): string { return this.isEdit() ? this.editor().editClues()[i] : this.editor().clues()[i]; }
  setSubject(value: string): void { if (this.isEdit()) this.editor().editSubject.set(value); else this.editor().subject.set(value); }
  setClue(i: number, value: string): void { if (this.isEdit()) this.editor().setEditClue(i, value); else this.editor().setClue(i, value); }
  submit(): void { if (this.isEdit()) void this.editor().save(this.id()!); else void this.editor().add(); }
}
