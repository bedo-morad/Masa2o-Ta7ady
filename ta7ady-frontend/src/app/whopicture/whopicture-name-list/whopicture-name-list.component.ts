import { Component, input, output } from '@angular/core';
import {
  AssignedTeam,
  AttributionChange,
  AttributionComponent,
} from '../../shared/attribution/attribution.component';
import { NameMap, nameKey } from '../whopicture-helpers';

@Component({
  selector: 'app-whopicture-name-list',
  standalone: true,
  imports: [AttributionComponent],
  templateUrl: './whopicture-name-list.component.html',
  styleUrl: './whopicture-name-list.component.scss',
})
export class WhopictureNameListComponent {
  readonly players = input.required<readonly string[]>();
  readonly teamA = input('');
  readonly teamB = input('');
  readonly assignments = input.required<NameMap>();
  readonly attributionChanged = output<{ index: number; change: AttributionChange }>();

  assigned(index: number): AssignedTeam {
    return this.assignments()[nameKey(index)] ?? null;
  }

  change(index: number, change: AttributionChange): void {
    this.attributionChanged.emit({ index, change });
  }
}
