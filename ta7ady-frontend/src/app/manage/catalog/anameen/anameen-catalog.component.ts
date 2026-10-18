import { Component, input, output } from '@angular/core';
import { AnameenSubject } from '../../../api.service';
import { ManageRowSelection } from '../manage-row-selection';
import { AnameenEditorComponent } from '../../editors/anameen/anameen-editor.component';
import { AnameenEditor } from '../../editors/anameen/anameen-editor';

@Component({
  selector: 'app-anameen-catalog',
  standalone: true,
  imports: [AnameenEditorComponent],
  templateUrl: './anameen-catalog.component.html',
  styleUrl: './anameen-catalog.component.scss',
})
export class AnameenCatalogComponent {
  readonly rows = input.required<readonly AnameenSubject[]>();
  readonly editor = input.required<AnameenEditor>();
  readonly adminOn = input(false);
  readonly selection = input.required<ManageRowSelection>();
  readonly remove = output<number>();
}
