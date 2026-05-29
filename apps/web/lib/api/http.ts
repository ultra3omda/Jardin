export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export function authHeaders(token: string): Record<string, string> {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

export async function apiOk<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let body: unknown;
    let message = `Request failed with status ${res.status}`;
    try {
      body = await res.json();
      if (body && typeof body === 'object' && 'message' in body) {
        const m = (body as { message: unknown }).message;
        if (typeof m === 'string') message = m;
        else if (Array.isArray(m) && m.length > 0) message = String(m[0]);
      }
    } catch {
      // response had no JSON body — keep the status message
    }
    throw new ApiError(res.status, message, body);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function apiGet<T>(path: string, token: string): Promise<T> {
  return apiOk<T>(await fetch(path, { headers: authHeaders(token) }));
}

export async function apiPost<T>(path: string, token: string, body: unknown): Promise<T> {
  return apiOk<T>(
    await fetch(path, { method: 'POST', headers: authHeaders(token), body: JSON.stringify(body) }),
  );
}

export async function apiPatch<T>(path: string, token: string, body: unknown): Promise<T> {
  return apiOk<T>(
    await fetch(path, { method: 'PATCH', headers: authHeaders(token), body: JSON.stringify(body) }),
  );
}

export async function apiDelete<T = void>(path: string, token: string): Promise<T> {
  return apiOk<T>(await fetch(path, { method: 'DELETE', headers: authHeaders(token) }));
}
