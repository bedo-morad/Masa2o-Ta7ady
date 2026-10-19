import { Component, inject, input, TemplateRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ManageAdminAccess } from '../manage-admin-access';

@Component({
  selector: 'app-manage-access',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './manage-access.component.html',
  styleUrl: './manage-access.component.scss',
})
export class ManageAccessComponent {
  readonly access = input.required<ManageAdminAccess>();
  private readonly modal = inject(NgbModal);

  openAdminModal(content: TemplateRef<unknown>): void {
    this.access().error.set('');
    this.modal.open(content, { centered: true });
  }
}
