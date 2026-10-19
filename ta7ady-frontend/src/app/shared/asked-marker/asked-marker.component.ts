import { booleanAttribute, Component, input, output } from '@angular/core';

/** A semantic button attribute: the game retains the asked Set and toggle policy. */
@Component({
  selector: 'button[appAskedMarker]',
  standalone: true,
  templateUrl: './asked-marker.component.html',
  styleUrl: './asked-marker.component.scss',
  host: {
    class: 'asked-mark tabular-nums',
    type: 'button',
    '[attr.aria-pressed]': 'pressed()',
    '[attr.aria-label]': 'ariaLabel()',
    '(click)': 'markClicked()',
  },
})
export class AskedMarkerComponent {
  readonly number = input.required<number>();
  readonly pressed = input(false, { transform: booleanAttribute });
  readonly ariaLabel = input.required<string>();
  readonly marked = output<number>();
  markClicked(): void {
    this.marked.emit(this.number());
  }
}
