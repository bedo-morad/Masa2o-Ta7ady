import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeService, type Theme } from '../theme.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  private themes = inject(ThemeService);
  readonly theme = this.themes.theme;

  setTheme(t: Theme): void {
    this.themes.setTheme(t);
  }
}
