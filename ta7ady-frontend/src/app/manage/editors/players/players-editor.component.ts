import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PlayersEditor } from './players-editor';

@Component({
  selector: 'app-players-renderer',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './players-editor.component.html',
})
export class PlayersEditorComponent {
  readonly editor = input.required<PlayersEditor>();
  readonly mode = input<'add' | 'edit'>('add');
  readonly id = input<number>();
}
