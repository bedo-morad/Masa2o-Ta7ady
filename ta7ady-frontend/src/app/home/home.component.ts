import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SettingsModalComponent } from '../shared/settings/settings-modal.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, SettingsModalComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  readonly settingsOpen = signal(false);

  openSettings(): void {
    this.settingsOpen.set(true);
  }

  closeSettings(): void {
    this.settingsOpen.set(false);
  }
}
