import { computed, signal } from '@angular/core';
import { ApiService } from '../../api.service';

export interface DismissableModal {
  dismiss: () => void;
}

export class ManageAdminAccess {
  readonly password = signal('');
  readonly error = signal('');
  readonly adminOn = computed(() => this.api.adminPassword() !== null);

  constructor(
    private readonly api: ApiService,
    private readonly reportFeedback: (message: string) => void,
  ) {}

  unlock(dismiss?: DismissableModal): void {
    const password = this.password().trim();
    if (!password) {
      this.error.set('أدخل كلمة المرور.');
      return;
    }
    this.api.unlock(password);
    this.password.set('');
    this.error.set('');
    this.reportFeedback('تم تفعيل وضع الإدارة لهذه الجلسة — ظهرت أزرار التعديل والحذف.');
    dismiss?.dismiss();
  }

  lock(dismiss?: DismissableModal): void {
    this.api.lock();
    this.error.set('');
    this.reportFeedback('تم قفل وضع الإدارة — أُخفيت أزرار التعديل والحذف.');
    dismiss?.dismiss();
  }

  rejectUnauthorized(): void {
    this.api.lock();
    this.error.set('كلمة المرور غير صحيحة.');
  }
}
