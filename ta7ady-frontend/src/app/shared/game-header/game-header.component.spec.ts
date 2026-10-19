import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { GameHeaderComponent } from './game-header.component';

describe('GameHeaderComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GameHeaderComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('renders the caller title with the two existing Arabic routes', () => {
    const fixture = TestBed.createComponent(GameHeaderComponent);
    fixture.componentRef.setInput('title', 'اهبد صح');
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h2')?.textContent?.trim()).toBe('اهبد صح');
    expect(element.querySelector('.back')?.getAttribute('href')).toBe('/');
    expect(element.querySelector('.manage')?.getAttribute('href')).toBe('/manage');
    expect(element.textContent).toContain('رجوع');
    expect(element.textContent).toContain('إدارة الأسئلة');
  });
});
