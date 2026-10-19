import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ScoreSheetEditor } from '../scoresheet-editor';

@Component({
  selector: 'app-scoresheet-editor',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './scoresheet-editor.component.html',
})
export class ScoreSheetEditorComponent {
  readonly editor = input.required<ScoreSheetEditor>();
  readonly mode = input<'add' | 'edit'>('add');
  readonly id = input<number>();
  readonly slots = Array.from({ length: 11 }, (_, i) => i + 1);
}
