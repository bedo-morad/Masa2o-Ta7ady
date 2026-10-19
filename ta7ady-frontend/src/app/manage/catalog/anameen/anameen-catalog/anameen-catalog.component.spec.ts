import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { describe, expect, it, afterEach } from 'vitest';
import { catalogRows, page, setupCatalog } from '../../../testing/manage-catalog-fixtures';

describe('AnameenCatalogComponent rendered Manage page delete behavior', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('renders its delete button, deletes its typed row, and flushes the active reload', async () => {
    const { fixture, apiStub, httpMock } = await setupCatalog();
    fixture.componentInstance.select('anameen');
    fixture.detectChanges();
    page(httpMock, 'anameen', [catalogRows.anameen]);
    await fixture.whenStable();
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('.del') as HTMLButtonElement | null;
    expect(button).not.toBeNull();
    button!.click();
    await Promise.resolve();
    expect(apiStub.del).toHaveBeenLastCalledWith('anameen', catalogRows.anameen.id);
    await new Promise((resolve) => setTimeout(resolve, 0));
    page(httpMock, 'anameen');
    await fixture.whenStable();
    fixture.detectChanges();
    expect(() => httpMock.verify()).not.toThrow();
  });
});
