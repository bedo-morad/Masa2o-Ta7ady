import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ItemNavigationComponent } from './item-navigation.component';

@Component({
  imports: [ItemNavigationComponent],
  template: `<app-item-navigation
    [items]="items()"
    [index]="index()"
    itemLabel="العنصر"
    itemsLabel="العناصر"
    (previous)="previousClicked()"
    (next)="nextClicked()"
    (select)="selected.set($event)"
  />`,
})
class NavigationHost {
  readonly items = signal<readonly unknown[]>(['a', 'b', 'c']);
  readonly index = signal(1);
  previous = 0;
  next = 0;
  readonly selected = signal(-1);

  previousClicked(): void {
    this.previous += 1;
  }

  nextClicked(): void {
    this.next += 1;
  }
}

describe('ItemNavigationComponent', () => {
  function setup() {
    const fixture = TestBed.createComponent(NavigationHost);
    fixture.detectChanges();
    return { fixture, host: fixture.componentInstance };
  }

  it('renders bounded controls and forwards previous, next, and selected intents', () => {
    const { fixture, host } = setup();
    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    buttons[0].click();
    buttons[buttons.length - 1].click();
    (buttons[2] as HTMLButtonElement).click();
    expect(host.previous).toBe(1);
    expect(host.next).toBe(1);
    expect(host.selected()).toBe(1);
    expect(buttons[0].disabled).toBe(false);
    expect(buttons[buttons.length - 1].disabled).toBe(false);
  });

  it('hides the rail for a single item and disables the appropriate edge', () => {
    const { fixture, host } = setup();
    host.items.set(['only']);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.nav-row')).toBeNull();

    host.items.set(['a', 'b']);
    host.index.set(0);
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('.navbtn') as NodeListOf<HTMLButtonElement>;
    expect(buttons[0].disabled).toBe(true);
    expect(buttons[1].disabled).toBe(false);
  });
});
