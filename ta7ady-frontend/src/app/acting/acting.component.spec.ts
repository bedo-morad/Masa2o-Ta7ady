import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { ActingComponent } from './acting.component';

describe('ActingComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActingComponent],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();
  });

  it('creates', () => {
    const fixture = TestBed.createComponent(ActingComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('builds an encoded google search url', () => {
    const c = TestBed.createComponent(ActingComponent).componentInstance;
    expect(c.googleUrl('كريستيانو رونالدو')).toBe(
      `https://www.google.com/search?q=${encodeURIComponent('كريستيانو رونالدو')}`,
    );
  });
});
