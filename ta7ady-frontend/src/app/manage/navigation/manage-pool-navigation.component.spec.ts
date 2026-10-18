import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { page, setupCatalog } from '../testing/manage-catalog-fixtures';

// A real tab click must reach the page and request that Pool, not merely emit.
describe('Manage Pool navigation', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('marks the clicked Pool active and requests its catalog', async () => {
    const { fixture, httpMock } = await setupCatalog();
    const buttons = fixture.nativeElement.querySelectorAll(
      '.pools button',
    ) as NodeListOf<HTMLButtonElement>;
    expect(buttons).toHaveLength(9);
    expect(buttons[0].classList.contains('active')).toBe(true);
    buttons[7].click();
    fixture.detectChanges();
    page(httpMock, 'anameen');
    await fixture.whenStable();
    fixture.detectChanges();
    expect(buttons[7].classList.contains('active')).toBe(true);
    expect(buttons[0].classList.contains('active')).toBe(false);
    expect(fixture.componentInstance.pool()).toBe('anameen');
  });
});
