import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IhbidEditor } from './pool-editors';

@Component({
  selector: 'app-ihbid-renderer',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './ihbid-editor.component.html',
})
export class IhbidEditorComponent {
  readonly editor = input.required<IhbidEditor>();
  readonly mode = input<'add' | 'edit'>('add');
  readonly id = input<number>();
}
