import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BankEditor } from './bank-editor';

@Component({
  selector: 'app-bank-renderer',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './bank-editor.component.html',
})
export class BankEditorComponent {
  readonly editor = input.required<BankEditor>();
  readonly mode = input<'add' | 'edit'>('add');
  readonly id = input<number>();
}
