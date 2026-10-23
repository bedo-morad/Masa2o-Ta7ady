import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GAME_CATALOG } from '../shared/game-catalog';
import { SettingsModalComponent } from '../shared/settings/settings-modal.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, SettingsModalComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  readonly games = GAME_CATALOG;
  readonly settingsOpen = signal(false);

  openSettings(): void {
    this.settingsOpen.set(true);
  }

  closeSettings(): void {
    this.settingsOpen.set(false);
  }
}
