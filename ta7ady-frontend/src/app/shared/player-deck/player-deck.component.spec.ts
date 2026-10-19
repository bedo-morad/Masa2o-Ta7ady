import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { PlayerName } from '../../api.service';
import { PlayerDeckComponent } from './player-deck.component';

describe('PlayerDeckComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlayerDeckComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  function create(): [ComponentFixture<PlayerDeckComponent>, HttpTestingController] {
    const fixture = TestBed.createComponent(PlayerDeckComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    return [fixture, http];
  }

  it('draws the default ten players and keeps loading controls observable', async () => {
    const [fixture, http] = create();
    const request = http.expectOne((r) => r.urlWithParams.endsWith('/players?count=10'));
    expect(fixture.componentInstance.loading()).toBe(true);
    request.flush([{ id: 1, playerName: 'لاعب 1' }]);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.flip').length).toBe(1);
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('reveals player names and keeps search hidden until reveal', async () => {
    const [fixture, http] = create();
    const player: PlayerName = { id: 1, playerName: 'كريستيانو رونالدو' };
    http.expectOne((r) => r.urlWithParams.endsWith('/players?count=10')).flush([player]);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.gsearch')).toBeNull();
    (fixture.nativeElement.querySelector('.flip') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.gsearch').getAttribute('href')).toBe(
      `https://www.google.com/search?q=${encodeURIComponent(player.playerName)}`,
    );
  });

  it('rerolls to a deduplicated player and resets the card reveal', async () => {
    const [fixture, http] = create();
    const first: PlayerName = { id: 1, playerName: 'الأول' };
    http.expectOne((r) => r.urlWithParams.endsWith('/players?count=10')).flush([first]);
    await fixture.whenStable();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.flip') as HTMLButtonElement).click();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.reroll') as HTMLButtonElement).click();
    http.expectOne((r) => r.urlWithParams.endsWith('/players?count=6')).flush([
      first,
      { id: 2, playerName: 'الثاني' },
    ]);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.flip.open')).toBeNull();
    expect(fixture.nativeElement.querySelector('.gsearch')).toBeNull();
    (fixture.nativeElement.querySelector('.flip') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.back').textContent).toContain('الثاني');
  });

  it('reports draw and reroll network failures without throwing', async () => {
    const [fixture, http] = create();
    http.expectOne((r) => r.urlWithParams.endsWith('/players?count=10')).flush('fail', {
      status: 500,
      statusText: 'Server Error',
    });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.notice').textContent).toContain('تعذر تحميل الأسماء');
  });
});
