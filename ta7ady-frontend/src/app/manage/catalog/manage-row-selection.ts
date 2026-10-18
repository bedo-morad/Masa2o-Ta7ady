import { signal } from '@angular/core';

/** Coordinates one expanded row and one active editor for a Manage catalog page. */
export class ManageRowSelection {
  readonly expandedId = signal<number | null>(null);
  readonly editingId = signal<number | null>(null);

  isOpen(id: number): boolean {
    return this.expandedId() === id;
  }

  toggle(id: number): void {
    this.expandedId.update((current) => (current === id ? null : id));
  }

  requestEdit(id: number): void {
    this.editingId.set(id);
    this.expandedId.set(null);
  }

  cancelEdit(): void {
    this.editingId.set(null);
  }

  reset(): void {
    this.expandedId.set(null);
    this.editingId.set(null);
  }
}
