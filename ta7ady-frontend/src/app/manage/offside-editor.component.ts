import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OffsideEditor } from './pool-editors';

@Component({
  selector: 'app-offside-renderer',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './offside-editor.component.html',
})
export class OffsideEditorComponent {
  readonly editor = input.required<OffsideEditor>();
  readonly mode = input<'add' | 'edit'>('add');
  readonly id = input<number>();
}
