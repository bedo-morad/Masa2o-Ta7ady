import { Component, input, output } from '@angular/core';
import { PlayerName } from '../../../services/api.service';
import { ManageRowSelection } from '../manage-row-selection';
import { PlayersEditorComponent } from '../../editors/players/players-editor.component';
import { PlayersEditor } from '../../editors/players/players-editor';

@Component({
  selector: 'app-players-catalog',
  standalone: true,
  imports: [PlayersEditorComponent],
  templateUrl: './players-catalog.component.html',
  styleUrl: './players-catalog.component.scss',
})
export class PlayersCatalogComponent {
  readonly rows = input.required<readonly PlayerName[]>();
  readonly editor = input.required<PlayersEditor>();
  readonly adminOn = input(false);
  readonly selection = input.required<ManageRowSelection>();
  readonly remove = output<number>();
}
