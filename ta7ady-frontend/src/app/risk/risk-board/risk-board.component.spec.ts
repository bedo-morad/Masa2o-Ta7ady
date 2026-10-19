import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { RiskPack } from '../../services/api.service';
import { cellKey } from '../risk-lifecycle';
import { RiskAssignmentRequest, RiskBoardComponent } from './risk-board.component';

@Component({
  standalone: true,
  imports: [RiskBoardComponent],
  template: `
    <app-risk-board
      [packs]="packs"
      [seen]="seen"
      [open]="open"
      [double]="double"
      [teamA]="teamA"
      [teamB]="teamB"
      (cellToggle)="selected = $event"
      (columnReroll)="rerolled = $event"
      (assignment)="assigned = $event"
    />
  `,
})
class HostComponent {
  packs: RiskPack[] = [];
  seen = new Set<string>();
  open: string | null = null;
  double: string | null = null;
  teamA = '';
  teamB = '';
  selected = '';
  rerolled: number | null = null;
  assigned: RiskAssignmentRequest | null = null;
}

describe('RiskBoardComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  const pack = (id: number, genre = 'مجموعة'): RiskPack => ({
    id,
    genre,
    questions: [5, 10, 20, 40].map((points, tier) => ({
      points,
      question: `سؤال ${tier}`,
      answer: `جواب ${tier}`,
    })),
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.packs = [pack(1, 'الدوري الإيطالي'), pack(2)];
    fixture.detectChanges();
  });

  it('renders the board and keeps the reroll attached to its genre', () => {
    const headers = fixture.nativeElement.querySelectorAll('.genre') as NodeListOf<HTMLElement>;
    expect(headers).toHaveLength(2);
    expect(headers[0].querySelector('.gname')?.textContent).toBe('الدوري الإيطالي');
    expect(headers[0].querySelector('button')?.getAttribute('aria-label')).toBe(
      'تغيير المجموعة الدوري الإيطالي',
    );

    (headers[1].querySelector('button') as HTMLButtonElement).click();
    expect(fixture.componentInstance.rerolled).toBe(1);
  });

  it('emits cell selection and preserves hidden double secrecy', () => {
    const host = fixture.componentInstance;
    host.double = cellKey(1, 0);
    fixture.detectChanges();

    const cells = fixture.nativeElement.querySelectorAll(
      '.cell:not(.empty)',
    ) as NodeListOf<HTMLButtonElement>;
    expect(cells[0].querySelector('.dbl')).toBeNull();
    cells[0].click();
    expect(host.selected).toBe(cellKey(1, 0));

    host.seen = new Set([cellKey(1, 0)]);
    fixture.detectChanges();
    expect(cells[0].querySelector('.dbl')).not.toBeNull();
  });

  it('emits a typed assignment request from the spotlight', () => {
    const host = fixture.componentInstance;
    const child = fixture.debugElement.query(By.directive(RiskBoardComponent))
      .componentInstance as RiskBoardComponent;
    child.assignment.subscribe((request) => {
      host.assigned = request;
    });
    child.requestAssignment(cellKey(1, 1), 'سؤال 1', {
      label: 'سؤال 1',
      points: 10,
      picked: 'A',
      from: null,
      to: 'A',
    });
    expect(host.assigned).toEqual(
      expect.objectContaining({ key: cellKey(1, 1), question: 'سؤال 1' }),
    );
    expect(host.assigned?.change.picked).toBe('A');
  });
});
