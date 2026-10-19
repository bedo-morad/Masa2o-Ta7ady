import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Stateless navigation/title chrome; the host retains page layout and state. */
@Component({
  selector: 'app-game-header',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './game-header.component.html',
  styleUrl: './game-header.component.scss',
})
export class GameHeaderComponent {
  readonly title = input.required<string>();
}
