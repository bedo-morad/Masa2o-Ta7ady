import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { ManageComponent } from './manage.component';

describe('ManageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageComponent],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();
  });

  it('creates on the shared player pool', () => {
    const fixture = TestBed.createComponent(ManageComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.componentInstance.pool()).toBe('players');
  });

  it('switches pools and resets paging', () => {
    const c = TestBed.createComponent(ManageComponent).componentInstance;
    c.page.set(3);
    c.select('ihbid');
    expect(c.pool()).toBe('ihbid');
    expect(c.page()).toBe(0);
  });
});
