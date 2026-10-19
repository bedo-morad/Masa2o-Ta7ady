import { Component, input, output } from '@angular/core';

/**
 * Invariant item rail for multi-item game hosts.
 *
 * The host owns the selected index and all effects of changing it. This module
 * only presents bounded previous/next controls and numbered selection buttons,
 * then emits the referee's intent back to the host.
 */
@Component({
  selector: 'app-item-navigation',
  standalone: true,
  templateUrl: './item-navigation.component.html',
  styleUrl: './item-navigation.component.scss',
})
export class ItemNavigationComponent {
  readonly items = input.required<readonly unknown[]>();
  readonly index = input.required<number>();
  readonly itemLabel = input.required<string>();
  readonly itemsLabel = input.required<string>();

  readonly previous = output<void>();
  readonly next = output<void>();
  readonly select = output<number>();
}
