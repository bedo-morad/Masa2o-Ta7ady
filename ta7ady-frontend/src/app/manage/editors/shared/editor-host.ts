/**
 * The small boundary future Pool editors use to coordinate with Manage.
 * Catalog lifecycle, authorization, feedback, and cross-row coordination stay
 * with the host; each editor keeps its own draft, validation, and mutation.
 */
export interface ManageEditorHost {
  readonly authorization: () => boolean;
  requestEdit(id: number): void;
  cancelEdit(): void;
  refreshAfterMutation(): void;
  refreshAfterAdd(): void;
  completeEdit(message: string): void;
  reportMutationFailure(error: unknown, fallback: string): void;
  reportFeedback(message: string, intent: 'success' | 'error'): void;
  clearFeedback(): void;
  reportEditFailure(error: unknown, fallback: string): void;
}
