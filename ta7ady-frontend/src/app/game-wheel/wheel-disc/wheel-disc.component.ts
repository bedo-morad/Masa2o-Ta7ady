import { Component, computed, inject, input, output } from '@angular/core';
import type { GameOption } from '../../shared/game-catalog';
import { ThemeService } from '../../services/theme.service';
import { createWheelSegments } from '../wheel-geometry';

@Component({
  selector: 'app-wheel-disc',
  standalone: true,
  templateUrl: './wheel-disc.component.html',
  styleUrl: './wheel-disc.component.scss',
})
export class WheelDiscComponent {
  readonly games = input.required<readonly GameOption[]>();
  readonly rotation = input(0);
  readonly spinning = input(false);
  readonly spinFinished = output<void>();

  private readonly themeService = inject(ThemeService);
  readonly isDarkTheme = computed(() => this.themeService.theme() !== 'sand');
  readonly labelCounterRotation = computed(() => (this.spinning() ? 0 : -this.rotation()));
  readonly wheelSegments = computed(() => createWheelSegments(this.games()));
  readonly wheelDescription = computed(() => `عجلة الحظ، ${this.games().length} ألعاب متاحة`);
}
