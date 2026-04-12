export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(opts: {
    message: string;
    statusCode: number;
    code: string;
    details?: unknown;
  }) {
    super(opts.message);
    this.statusCode = opts.statusCode;
    this.code = opts.code;
    this.details = opts.details;
  }
}

