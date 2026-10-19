import { Component, input, output } from '@angular/core';
import { BankQuestion } from '../../../../services/api.service';
import { ManageRowSelection } from '../../manage-row-selection';
import { BankEditorComponent } from '../../../editors/bank/bank-editor/bank-editor.component';
import { BankEditor } from '../../../editors/bank/bank-editor';

@Component({
  selector: 'app-bank-catalog',
  standalone: true,
  imports: [BankEditorComponent],
  templateUrl: './bank-catalog.component.html',
  styleUrl: './bank-catalog.component.scss',
})
export class BankCatalogComponent {
  readonly rows = input.required<readonly BankQuestion[]>();
  readonly editor = input.required<BankEditor>();
  readonly adminOn = input(false);
  readonly selection = input.required<ManageRowSelection>();
  readonly remove = output<number>();
}
