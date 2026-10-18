import { Component, input, output } from '@angular/core';
import { RiskPack } from '../../../api.service';
import { ManageRowSelection } from '../manage-row-selection';
import { RiskPackEditorComponent } from '../../editors/risk/risk-pack-editor.component';
import { RISK_TIERS, RiskPackEditorModel } from '../../editors/risk/risk-pack-editor';

@Component({
  selector: 'app-risk-catalog',
  standalone: true,
  imports: [RiskPackEditorComponent],
  templateUrl: './risk-catalog.component.html',
  styleUrl: './risk-catalog.component.scss',
})
export class RiskCatalogComponent {
  readonly riskTiers = RISK_TIERS;
  readonly rows = input.required<readonly RiskPack[]>();
  readonly editor = input.required<RiskPackEditorModel>();
  readonly adminOn = input(false);
  readonly selection = input.required<ManageRowSelection>();
  readonly remove = output<number>();
}
