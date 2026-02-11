export class AppError extends Error {
  code: string;
  status: number;
  publicMessage: string;

  constructor(code: string, publicMessage: string, status = 400) {
    super(publicMessage);
    this.code = code;
    this.status = status;
    this.publicMessage = publicMessage;
  }
}

export type ApiErrorPayload = {
  ok: false;
  code: string;
  message: string;
};

export function toApiError(
  error: unknown,
  fallback: { code: string; message: string; status?: number } = {
    code: "internal_error",
    message: "Something went wrong. Please try again.",
    status: 500,
  },
): { status: number; payload: ApiErrorPayload } {
  if (error instanceof AppError) {
    return {
      status: error.status,
      payload: {
        ok: false,
        code: error.code,
        message: error.publicMessage,
      },
    };
  }

  return {
    status: fallback.status ?? 500,
    payload: {
      ok: false,
      code: fallback.code,
      message: fallback.message,
    },
  };
}
