export type ApiResponse<T> = {
  ok: boolean;
  data: T;
};

export type ApiErrorResponse = {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

