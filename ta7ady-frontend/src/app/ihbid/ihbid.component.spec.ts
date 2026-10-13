import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { IhbidComponent } from './ihbid.component';

describe('IhbidComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IhbidComponent],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();
  });

  it('creates', () => {
    const fixture = TestBed.createComponent(IhbidComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('toggles reveal', () => {
    const c = TestBed.createComponent(IhbidComponent).componentInstance;
    c.toggle(7);
    expect(c.revealed().has(7)).toBe(true);
    c.toggle(7);
    expect(c.revealed().has(7)).toBe(false);
  });
});
