import { Component, input, output } from '@angular/core';
import { GoogleSearchComponent } from '../../shared/google-search/google-search.component';
import { BankQuestion } from '../../api.service';

@Component({
  selector: 'app-bank-question-card',
  standalone: true,
  imports: [GoogleSearchComponent],
  templateUrl: './bank-question-card.component.html',
  styleUrl: './bank-question-card.component.scss',
})
export class BankQuestionCardComponent {
  readonly question = input<BankQuestion | null>(null);
  readonly position = input(0);
  readonly count = input(0);
  readonly previous = output<void>();
  readonly next = output<void>();
}
