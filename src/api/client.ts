import axios, { AxiosError, type AxiosRequestConfig } from 'axios';

import { Env } from '@/lib/env';
import { StorageKeys, secureStorage } from '@/lib/storage';

/**
 * The backend has no single response envelope — success bodies come back as
 * `{status:"success",data}`, `{success:true,data}`, `{success:true,tickets}`,
 * `{event}`, or bare, depending on the controller. Rather than guess here, each
 * module in `src/api` unwraps its own endpoints with the helpers at the bottom
 * of this file. What IS centralised is error normalisation, because the error
 * shapes vary just as much and every caller needs the same thing out of them.
 */

/**
 * Several controllers are bare `async` handlers on Express 4 without
 * `express-async-errors`, so a thrown error inside them rejects a promise nobody
 * catches and the request hangs open instead of returning 4xx. A hard timeout is
 * the only client-side defence.
 */
const REQUEST_TIMEOUT_MS = 20_000;

// eslint-disable-next-line import/no-named-as-default-member -- axios's default export is the factory; the named `create` is unrelated.
export const api = axios.create({
  baseURL: `${Env.apiUrl}/api`,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
});

/** In-memory mirror of the persisted token so the common path avoids async storage. */
let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export async function loadAuthToken(): Promise<string | null> {
  authToken = await secureStorage.get(StorageKeys.token);
  return authToken;
}

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

export type ApiErrorCode =
  | 'ACCOUNT_BANNED'
  | 'PHONE_BANNED'
  | 'NETWORK'
  | 'TIMEOUT'
  | (string & {});

export class ApiError extends Error {
  readonly status: number;
  readonly code?: ApiErrorCode;
  readonly details?: unknown;

  constructor(message: string, status: number, code?: ApiErrorCode, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** Suspended accounts must land on a suspension screen, never a login bounce. */
  get isBanned() {
    return this.code === 'ACCOUNT_BANNED' || this.code === 'PHONE_BANNED';
  }

  get isAuthExpired() {
    return this.status === 401 && !this.isBanned;
  }

  get isOffline() {
    return this.code === 'NETWORK' || this.code === 'TIMEOUT';
  }
}

/** Pulls a human message out of any of the shapes the backend actually emits. */
function messageFrom(body: unknown, fallback: string): string {
  if (typeof body === 'string' && body.trim()) return body;
  if (body && typeof body === 'object') {
    const b = body as Record<string, unknown>;
    for (const key of ['message', 'error'] as const) {
      const value = b[key];
      if (typeof value === 'string' && value.trim()) return value;
    }
  }
  return fallback;
}

function codeFrom(body: unknown): string | undefined {
  if (body && typeof body === 'object') {
    const code = (body as Record<string, unknown>).code;
    if (typeof code === 'string') return code;
  }
  return undefined;
}

/**
 * Some handlers return HTTP 200 with a failure body (`{success:false}` or
 * `{status:"error"|"fail"}`), so a 2xx alone does not mean the call worked.
 */
function isFailureBody(body: unknown): boolean {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return b.success === false || b.status === 'error' || b.status === 'fail';
}

api.interceptors.response.use(
  (response) => {
    if (isFailureBody(response.data)) {
      throw new ApiError(
        messageFrom(response.data, 'Request failed'),
        response.status,
        codeFrom(response.data),
        response.data,
      );
    }
    return response;
  },
  (error: AxiosError) => {
    if (error instanceof ApiError) throw error;

    if (error.code === 'ECONNABORTED') {
      throw new ApiError('The server took too long to respond.', 0, 'TIMEOUT');
    }
    if (!error.response) {
      throw new ApiError(
        'Could not reach Pazimo. Check your connection and try again.',
        0,
        'NETWORK',
      );
    }

    const { status, data } = error.response;
    throw new ApiError(
      messageFrom(data, `Request failed (${status})`),
      status,
      codeFrom(data),
      data,
    );
  },
);

/* ------------------------------------------------------------------ *
 * Unwrapping helpers — used by the per-resource modules in src/api.
 * ------------------------------------------------------------------ */

/** `{ status:"success", data: T }` or `{ success:true, data: T }`. */
export async function getData<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await api.get<{ data: T }>(url, config);
  return res.data.data;
}

export async function postData<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const res = await api.post<{ data: T }>(url, body, config);
  return res.data.data;
}

/** Endpoints that return the payload under a bespoke key, e.g. `{ tickets: [] }`. */
export async function getKeyed<T>(
  url: string,
  key: string,
  config?: AxiosRequestConfig,
): Promise<T> {
  const res = await api.get<Record<string, T>>(url, config);
  return res.data[key];
}

/** Endpoints that return the whole body, e.g. payment status. */
export async function getRaw<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await api.get<T>(url, config);
  return res.data;
}

export async function postRaw<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const res = await api.post<T>(url, body, config);
  return res.data;
}
