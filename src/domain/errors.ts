export class DomainError extends Error {
  constructor(
    message: string,
    public status = 422,
  ) {
    super(message);
  }
}
export function ensure(value: unknown, message: string, status = 422): asserts value {
  if (!value) throw new DomainError(message, status);
}
