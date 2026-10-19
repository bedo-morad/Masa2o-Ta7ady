import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

/** The caller owns count policy; this module only renders choices and forwards actions. */
@Component({
  selector: 'app-count-selector',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './count-selector.component.html',
  styleUrl: './count-selector.component.scss',
})
export class CountSelectorComponent {
  readonly id = input.required<string>({ alias: 'controlId' });
  readonly label = input.required<string>();
  readonly count = input.required<number>();
  readonly options = input.required<readonly number[]>();
  readonly loading = input(false);
  readonly countChanged = output<number>();
  readonly redraw = output<void>();

  select(value: number | string): void {
    const next = Number(value);
    if (Number.isFinite(next)) this.countChanged.emit(next);
  }

  redrawRequested(): void {
    this.redraw.emit();
  }
}
