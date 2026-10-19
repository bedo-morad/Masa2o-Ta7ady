import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WhopictureNameListComponent } from './whopicture-name-list.component';

describe('WhopictureNameListComponent', () => {
  let fixture: ComponentFixture<WhopictureNameListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WhopictureNameListComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(WhopictureNameListComponent);
    fixture.componentRef.setInput('players', ['أحمد']);
    fixture.componentRef.setInput('assignments', {});
    fixture.componentRef.setInput('teamA', 'الصقور');
    fixture.componentRef.setInput('teamB', 'النمور');
    fixture.detectChanges();
  });

  it('renders the name and forwards the attribution event with its index', () => {
    const changes: unknown[] = [];
    fixture.componentInstance.attributionChanged.subscribe((change) => changes.push(change));
    const buttons = fixture.nativeElement.querySelectorAll('button');
    expect(fixture.nativeElement.textContent).toContain('أحمد');
    expect(fixture.nativeElement.textContent).toContain('الصقور');
    expect(fixture.nativeElement.textContent).toContain('النمور');
    (buttons[0] as HTMLButtonElement).click();
    expect(changes[0]).toEqual(expect.objectContaining({ index: 0 }));
  });
});
