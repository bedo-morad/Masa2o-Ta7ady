import { firstValueFrom } from 'rxjs';
import { ApiService, Pool } from '../../../services/api.service';
import { ManageEditorHost } from './editor-host';

export async function applyEditMutation(
  api: ApiService,
  host: ManageEditorHost,
  pool: Pool,
  id: number,
  body: unknown,
  success: string,
  fallback: string,
): Promise<void> {
  host.clearFeedback();
  try {
    await firstValueFrom(api.update(pool, id, body));
  } catch (error: unknown) {
    host.reportEditFailure(error, fallback);
    return;
  }
  host.completeEdit(success);
}
