import { Component, input, output } from '@angular/core';
import { ScoresheetMatch } from '../../../api.service';
import { ManageRowSelection } from '../manage-row-selection';
import { ScoreSheetEditorComponent } from '../../editors/scoresheet/scoresheet-editor.component';
import { ScoreSheetEditor } from '../../editors/scoresheet/scoresheet-editor';

@Component({
  selector: 'app-scoresheet-catalog',
  standalone: true,
  imports: [ScoreSheetEditorComponent],
  templateUrl: './scoresheet-catalog.component.html',
  styleUrl: './scoresheet-catalog.component.scss',
})
export class ScoresheetCatalogComponent {
  readonly rows = input.required<readonly ScoresheetMatch[]>();
  readonly editor = input.required<ScoreSheetEditor>();
  readonly adminOn = input(false);
  readonly selection = input.required<ManageRowSelection>();
  readonly remove = output<number>();
}
