import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { PlayerName } from '../services/api.service';
import { ActingComponent } from './acting.component';

describe('ActingComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActingComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
  });

  it('creates', () => {
    const fixture = TestBed.createComponent(ActingComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('shows the encoded player search only while the card is revealed', async () => {
    const fixture: ComponentFixture<ActingComponent> = TestBed.createComponent(ActingComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    const player: PlayerName = { id: 1, playerName: 'كريستيانو رونالدو' };
    http.expectOne((request) => request.urlWithParams.endsWith('/players?count=10')).flush([player]);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.gsearch')).toBeNull();
    (fixture.nativeElement.querySelector('.flip') as HTMLButtonElement).click();
    fixture.detectChanges();
    const link = fixture.nativeElement.querySelector('.gsearch') as HTMLAnchorElement;
    expect(link).not.toBeNull();
    expect(link.getAttribute('href')).toBe(
      `https://www.google.com/search?q=${encodeURIComponent(player.playerName)}`,
    );
    expect(link.getAttribute('aria-label')).toBe('بحث عن اللاعب');
    expect(link.target).toBe('_blank');
    expect(link.rel).toBe('noopener');

    (fixture.nativeElement.querySelector('.flip') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.gsearch')).toBeNull();
  });
});
