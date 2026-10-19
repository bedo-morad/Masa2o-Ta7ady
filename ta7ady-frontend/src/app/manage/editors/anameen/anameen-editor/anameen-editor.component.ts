import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AnameenEditor } from '../anameen-editor';

@Component({
  selector: 'app-anameen-editor',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './anameen-editor.component.html',
})
export class AnameenEditorComponent {
  readonly editor = input.required<AnameenEditor>();
  readonly mode = input<'add' | 'edit'>('add');
  readonly id = input<number>();
  readonly slots = Array.from({ length: 5 }, (_, i) => i + 1);
}
