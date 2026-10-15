import { Component, computed, inject, model, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../settings/settings.service';

// Shared referee scoreboard: editable team names, always-on +/- scoring.
// The referee (game master) awards points at any moment; the site never locks him out.
// Signal two-way bindings: parents pass their own signals straight in.
// Empty name models are prefilled once from persisted settings on init;
// placeholders fall back to the settings values too. Still fully editable.
@Component({
  selector: 'app-scoreboard',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './scoreboard.component.html',
  styleUrl: './scoreboard.component.scss',
})
export class ScoreboardComponent implements OnInit {
  private settings = inject(SettingsService);
  readonly teamA = model<string>('');
  readonly teamB = model<string>('');
  readonly scoreA = model(0);
  readonly scoreB = model(0);
  readonly placeholderA = computed(() => this.settings.teamA() || 'الفريق الأول');
  readonly placeholderB = computed(() => this.settings.teamB() || 'الفريق الثاني');

  ngOnInit(): void {
    if (!this.teamA()) this.teamA.set(this.settings.teamA());
    if (!this.teamB()) this.teamB.set(this.settings.teamB());
  }

  bumpA(d: number): void {
    this.scoreA.update((v) => v + d);
  }

  bumpB(d: number): void {
    this.scoreB.update((v) => v + d);
  }
}
