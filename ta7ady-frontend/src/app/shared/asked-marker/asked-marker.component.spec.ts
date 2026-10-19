import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AskedMarkerComponent } from './asked-marker.component';

@Component({
  standalone: true,
  imports: [AskedMarkerComponent],
  template: '<button appAskedMarker [number]="3" [pressed]="pressed" ariaLabel="تحديد السؤال 3 على أنه طُرح" (marked)="marked = $event"></button>',
})
class HostComponent {
  pressed = true;
  marked = 0;
}

describe('AskedMarkerComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
  });

  function create() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('stays a native asked-mark button with numbered pressed semantics', () => {
    const element = create().nativeElement.querySelector('button') as HTMLButtonElement;
    expect(element.tagName).toBe('BUTTON');
    expect(element.classList.contains('asked-mark')).toBe(true);
    expect(element.getAttribute('aria-pressed')).toBe('true');
    expect(element.getAttribute('aria-label')).toBe('تحديد السؤال 3 على أنه طُرح');
    expect(element.querySelector('.asked-number')?.textContent?.trim()).toBe('3');
    expect(element.hasAttribute('title')).toBe(false);
  });

  it('forwards the number so the game retains toggle identity', () => {
    const fixture = create();
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    expect(fixture.componentInstance.marked).toBe(3);
  });
});
