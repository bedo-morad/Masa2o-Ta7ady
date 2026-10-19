import { Component, input, output } from '@angular/core';
@Component({
  selector: 'app-bank-chain-controls',
  standalone: true,
  templateUrl: './bank-chain-controls.component.html',
  styleUrl: './bank-chain-controls.component.scss',
})
export class BankChainControlsComponent {
  readonly value = input(0);
  readonly max = input(2048);
  readonly saved = input(0);
  readonly team = input('');
  readonly correct = output<void>();
  readonly miss = output<void>();
  readonly bank = output<void>();
}
