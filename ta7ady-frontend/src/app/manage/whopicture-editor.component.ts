import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WhoPictureEditor } from './whopicture-editor';

@Component({
  selector: 'app-whopicture-editor',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './whopicture-editor.component.html',
})
export class WhoPictureEditorComponent {
  readonly editor = input.required<WhoPictureEditor>();
  readonly mode = input<'add' | 'edit'>('add');
  readonly id = input<number>();
  readonly slots = Array.from({ length: 11 }, (_, i) => i + 1);
}
