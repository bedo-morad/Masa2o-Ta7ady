import { Component, input, output } from '@angular/core';
import { Pool } from '../../services/api.service';

interface PoolTab {
  readonly pool: Pool;
  readonly icon: string;
  readonly label: string;
}

@Component({
  selector: 'app-manage-pool-navigation',
  standalone: true,
  templateUrl: './manage-pool-navigation.component.html',
  styleUrl: './manage-pool-navigation.component.scss',
})
export class ManagePoolNavigationComponent {
  readonly pool = input.required<Pool>();
  readonly selected = output<Pool>();
  readonly tabs: readonly PoolTab[] = [
    { pool: 'players', icon: 'fa-users', label: 'أسماء اللاعبين' },
    { pool: 'ihbid', icon: 'fa-bullseye', label: 'اهبد صح' },
    { pool: 'offside', icon: 'fa-flag', label: 'أوفسايد' },
    { pool: 'top10', icon: 'fa-list-ol', label: 'توب 10' },
    { pool: 'scoresheet', icon: 'fa-clipboard-list', label: 'سكور شيت' },
    { pool: 'bank', icon: 'fa-coins', label: 'بنك' },
    { pool: 'risk', icon: 'fa-dice', label: 'ريسك' },
    { pool: 'anameen', icon: 'fa-mask', label: 'أنا مين؟' },
    { pool: 'whopicture', icon: 'fa-image', label: 'مين في الصورة' },
  ];

  choose(pool: Pool): void {
    this.selected.emit(pool);
  }
}
