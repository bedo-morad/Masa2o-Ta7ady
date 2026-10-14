import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('creates', () => {
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('has a settings gear button and no theme picker', () => {
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[aria-label="فتح الإعدادات"]')).toBeTruthy();
    expect(el.querySelector('.themes')).toBeNull();
  });

  it('opens the settings modal from the gear button', () => {
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.gear') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-settings-modal')).toBeTruthy();
  });
});
