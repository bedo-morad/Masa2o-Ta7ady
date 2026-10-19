import { Component, computed, input } from '@angular/core';

// An attribute selector keeps each game's anchor in its existing layout.
@Component({
  selector: 'a[appGoogleSearch]',
  standalone: true,
  templateUrl: './google-search.component.html',
  styleUrl: './google-search.component.scss',
  host: {
    '[href]': 'url()',
    '[attr.aria-label]': 'searchLabel()',
    title: 'بحث',
    target: '_blank',
    rel: 'noopener',
    '(click)': 'onClick($event)',
  },
})
export class GoogleSearchComponent {
  readonly query = input.required<string>({ alias: 'appGoogleSearch' });
  readonly searchLabel = input('بحث عن السؤال');
  readonly stopPropagation = input(false);
  readonly url = computed(
    () => `https://www.google.com/search?q=${encodeURIComponent(this.query())}`,
  );

  onClick(event: MouseEvent): void {
    if (this.stopPropagation()) event.stopPropagation();
  }
}
