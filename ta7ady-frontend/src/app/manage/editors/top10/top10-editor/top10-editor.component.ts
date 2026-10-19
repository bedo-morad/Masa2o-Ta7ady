import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Top10Editor } from '../top10-editor';

@Component({
  selector: 'app-top10-editor',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './top10-editor.component.html',
})
export class Top10EditorComponent {
  readonly editor = input.required<Top10Editor>();
  readonly mode = input<'add' | 'edit'>('add');
  readonly id = input<number>();
  readonly slots = Array.from({ length: 13 }, (_, i) => i + 1);
}
