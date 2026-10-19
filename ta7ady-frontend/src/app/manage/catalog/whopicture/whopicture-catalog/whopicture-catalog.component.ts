import { Component, input, output } from '@angular/core';
import { WhoPicturePhoto } from '../../../../services/api.service';
import { ManageRowSelection } from '../../manage-row-selection';
import { WhoPictureEditorComponent } from '../../../editors/whopicture/whopicture-editor/whopicture-editor.component';
import { WhoPictureEditor } from '../../../editors/whopicture/whopicture-editor';

@Component({
  selector: 'app-whopicture-catalog',
  standalone: true,
  imports: [WhoPictureEditorComponent],
  templateUrl: './whopicture-catalog.component.html',
  styleUrl: './whopicture-catalog.component.scss',
})
export class WhopictureCatalogComponent {
  readonly rows = input.required<readonly WhoPicturePhoto[]>();
  readonly editor = input.required<WhoPictureEditor>();
  readonly adminOn = input(false);
  readonly selection = input.required<ManageRowSelection>();
  readonly remove = output<number>();
}
