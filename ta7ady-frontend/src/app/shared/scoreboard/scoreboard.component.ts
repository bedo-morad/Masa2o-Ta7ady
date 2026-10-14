import { Component, model } from '@angular/core';
import { FormsModule } from '@angular/forms';

// Shared referee scoreboard: editable team names, always-on +/- scoring.
// The referee (game master) awards points at any moment; the site never locks him out.
// Signal two-way bindings: parents pass their own signals straight in.
@Component({
  selector: 'app-scoreboard',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './scoreboard.component.html',
  styleUrl: './scoreboard.component.scss',
})
export class ScoreboardComponent {
  readonly teamA = model<string>('');
  readonly teamB = model<string>('');
  readonly scoreA = model(0);
  readonly scoreB = model(0);

  bumpA(d: number): void {
    this.scoreA.update((v) => v + d);
  }

  bumpB(d: number): void {
    this.scoreB.update((v) => v + d);
  }
}
