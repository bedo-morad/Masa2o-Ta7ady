import { Component, input, output } from '@angular/core';
import { IhbidQuestion } from '../../../../services/api.service';
import { ManageRowSelection } from '../../manage-row-selection';
import { IhbidEditorComponent } from '../../../editors/ihbid/ihbid-editor/ihbid-editor.component';
import { IhbidEditor } from '../../../editors/ihbid/ihbid-editor';

@Component({
  selector: 'app-ihbid-catalog',
  standalone: true,
  imports: [IhbidEditorComponent],
  templateUrl: './ihbid-catalog.component.html',
  styleUrl: './ihbid-catalog.component.scss',
})
export class IhbidCatalogComponent {
  readonly rows = input.required<readonly IhbidQuestion[]>();
  readonly editor = input.required<IhbidEditor>();
  readonly adminOn = input(false);
  readonly selection = input.required<ManageRowSelection>();
  readonly remove = output<number>();
}
