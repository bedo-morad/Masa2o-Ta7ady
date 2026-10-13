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
});
