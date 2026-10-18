import { Component, input, output } from '@angular/core';
import { OffsideRule } from '../../../api.service';
import { ManageRowSelection } from '../manage-row-selection';
import { OffsideEditorComponent } from '../../editors/offside/offside-editor.component';
import { OffsideEditor } from '../../editors/offside/offside-editor';

@Component({
  selector: 'app-offside-catalog',
  standalone: true,
  imports: [OffsideEditorComponent],
  templateUrl: './offside-catalog.component.html',
  styleUrl: './offside-catalog.component.scss',
})
export class OffsideCatalogComponent {
  readonly rows = input.required<readonly OffsideRule[]>();
  readonly editor = input.required<OffsideEditor>();
  readonly adminOn = input(false);
  readonly selection = input.required<ManageRowSelection>();
  readonly remove = output<number>();
}
