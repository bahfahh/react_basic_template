export type LazyPackErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'invalid_input'
  | 'conflict'
  | 'invalid_transition'
  | 'approval_invalid'
  | 'approval_required_in_app';

export class LazyPackError extends Error {
  constructor(
    public readonly code: LazyPackErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'LazyPackError';
  }
}

export const HTTP_STATUS: Record<LazyPackErrorCode, number> = {
  unauthorized: 401,
  forbidden: 403,
  approval_required_in_app: 403,
  not_found: 404,
  invalid_input: 400,
  conflict: 409,
  invalid_transition: 409,
  approval_invalid: 409,
};
