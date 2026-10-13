import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { PasswordComponent } from './password.component';

describe('PasswordComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PasswordComponent],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();
  });

  it('creates', () => {
    const fixture = TestBed.createComponent(PasswordComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
