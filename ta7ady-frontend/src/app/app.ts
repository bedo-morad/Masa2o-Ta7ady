import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './services/theme.service';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  template: `<router-outlet />`,
})
export class App {
  // Initialize the persisted theme before routed content is displayed,
  // including routes that never open the settings modal.
  private readonly theme = inject(ThemeService);
}
