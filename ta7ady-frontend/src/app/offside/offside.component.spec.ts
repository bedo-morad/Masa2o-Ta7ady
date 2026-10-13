import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { OffsideComponent } from './offside.component';

describe('OffsideComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OffsideComponent],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();
  });

  it('creates', () => {
    const fixture = TestBed.createComponent(OffsideComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
