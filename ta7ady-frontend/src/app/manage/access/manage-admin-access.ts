import { computed, signal } from '@angular/core';
import { ApiService } from '../../services/api.service';

export interface DismissableModal {
  dismiss: () => void;
}

export class ManageAdminAccess {
  readonly password = signal('');
  readonly error = signal('');
  readonly adminOn = computed(() => this.api.adminPassword() !== null);

  constructor(
    private readonly api: ApiService,
    private readonly reportFeedback: (message: string, intent?: 'error') => void,
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
    this.reportFeedback('ظهرت أزرار التعديل والحذف — يتحقّق الخادم من كلمة المرور عند تنفيذ العملية.');
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
    this.reportFeedback(
      'كلمة المرور غير صحيحة أو تغيّرت — لم تُنفّذ العملية. افتح وضع الإدارة وأدخل كلمة المرور الصحيحة ثم أعد المحاولة.',
      'error',
    );
  }
}
