import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RiskPack } from '../api.service';
import { RiskPackEditorModel } from './risk-pack-editor';

@Component({
  selector: 'app-risk-pack-editor',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './risk-pack-editor.component.html',
  styleUrl: './risk-pack-editor.component.scss',
})
export class RiskPackEditorComponent {
  @Input({ required: true }) model!: RiskPackEditorModel;
  @Input() pack?: RiskPack;
  @Input() editing = false;

  get addMode(): boolean {
    return !this.pack;
  }

  async submit(): Promise<void> {
    if (this.pack) await this.model.save(this.pack.id);
    else await this.model.add();
  }
}
