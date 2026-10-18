import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { describe, expect, it, afterEach } from 'vitest';
import { catalogRows, page, setupCatalog } from '../../testing/manage-catalog-fixtures';

describe('WhopictureCatalogComponent rendered Manage page delete behavior', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('renders its delete button, deletes its typed row, and flushes the active reload', async () => {
    const { fixture, apiStub, httpMock } = await setupCatalog();
    fixture.componentInstance.select('whopicture');
    fixture.detectChanges();
    page(httpMock, 'whopicture', [catalogRows.whopicture]);
    await fixture.whenStable();
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('.del') as HTMLButtonElement | null;
    expect(button).not.toBeNull();
    button!.click();
    await Promise.resolve();
    expect(apiStub.del).toHaveBeenLastCalledWith('whopicture', catalogRows.whopicture.id);
    await new Promise((resolve) => setTimeout(resolve, 0));
    page(httpMock, 'whopicture');
    await fixture.whenStable();
    fixture.detectChanges();
    expect(() => httpMock.verify()).not.toThrow();
  });
});
