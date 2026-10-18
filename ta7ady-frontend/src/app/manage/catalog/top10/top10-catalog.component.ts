import { Component, input, output } from '@angular/core';
import { Top10List } from '../../../api.service';
import { ManageRowSelection } from '../manage-row-selection';
import { Top10EditorComponent } from '../../editors/top10/top10-editor.component';
import { Top10Editor } from '../../editors/top10/top10-editor';

@Component({
  selector: 'app-top10-catalog',
  standalone: true,
  imports: [Top10EditorComponent],
  templateUrl: './top10-catalog.component.html',
  styleUrl: './top10-catalog.component.scss',
})
export class Top10CatalogComponent {
  readonly rows = input.required<readonly Top10List[]>();
  readonly editor = input.required<Top10Editor>();
  readonly adminOn = input(false);
  readonly selection = input.required<ManageRowSelection>();
  readonly remove = output<number>();
}
