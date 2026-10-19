import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { GoogleSearchComponent } from './google-search.component';

@Component({
  imports: [GoogleSearchComponent],
  template: `<a
    [appGoogleSearch]="query()"
    [searchLabel]="label()"
    [stopPropagation]="isolate()"
  ></a>`,
})
class SearchHost {
  readonly query = signal('');
  readonly label = signal('بحث عن السؤال');
  readonly isolate = signal(false);
}

describe('GoogleSearchComponent', () => {
  function setup(query = 'سؤال & جواب؟ #1') {
    const fixture = TestBed.createComponent(SearchHost);
    fixture.componentInstance.query.set(query);
    fixture.detectChanges();
    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    return { fixture, link };
  }

  it('renders an encoded search link with the existing safe new-tab contract', () => {
    const { link } = setup();
    expect(link.getAttribute('href')).toBe(
      'https://www.google.com/search?q=%D8%B3%D8%A4%D8%A7%D9%84%20%26%20%D8%AC%D9%88%D8%A7%D8%A8%D8%9F%20%231',
    );
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener');
    expect(link.getAttribute('title')).toBe('بحث');
    expect(link.getAttribute('aria-label')).toBe('بحث عن السؤال');
    expect(link.querySelector('.fa-google')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('updates the query and player label when inputs change', () => {
    const { fixture, link } = setup();
    fixture.componentInstance.query.set('A+B / 50%');
    fixture.componentInstance.label.set('بحث عن اللاعب');
    fixture.detectChanges();
    expect(link.getAttribute('href')).toBe('https://www.google.com/search?q=A%2BB%20%2F%2050%25');
    expect(link.getAttribute('aria-label')).toBe('بحث عن اللاعب');
  });

  it('handles an empty query without inventing search text', () => {
    const { link } = setup('');
    expect(link.getAttribute('href')).toBe('https://www.google.com/search?q=');
  });

  it('only isolates card clicks when requested, without cancelling navigation', () => {
    const { fixture, link } = setup();
    const parent = document.createElement('div');
    parent.appendChild(link);
    let bubbled = 0;
    parent.addEventListener('click', () => bubbled++);
    const click = () => new MouseEvent('click', { bubbles: true, cancelable: true });
    const questionClick = click();
    link.dispatchEvent(questionClick);
    expect(bubbled).toBe(1);
    expect(questionClick.defaultPrevented).toBe(false);

    fixture.componentInstance.isolate.set(true);
    fixture.detectChanges();
    const cardClick = click();
    link.querySelector('i')!.dispatchEvent(cardClick);
    expect(bubbled).toBe(1);
    expect(cardClick.defaultPrevented).toBe(false);
    parent.remove();
  });
});
