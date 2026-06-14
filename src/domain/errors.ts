export type DomainErrorCode =
  | 'ROUTINE_NOT_FOUND'
  | 'ROUTINE_CREATE_FAILED'
  | 'ROUTINE_UPDATE_FAILED'

export class DomainError extends Error {
  readonly code: DomainErrorCode

  constructor(code: DomainErrorCode, message: string) {
    super(message)
    this.code = code
    this.name = 'DomainError'
  }
}
