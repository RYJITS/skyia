const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

export type ApiOptions = {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
};

export const apiUrl = (path: string) => `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;

export const apiRequest = async <T>(path: string, options: ApiOptions = {}): Promise<T> => {
    const headers: Record<string, string> = {
        ...(options.headers || {}),
    };

    let body: BodyInit | undefined;
    if (options.body !== undefined) {
        headers['Content-Type'] = headers['Content-Type'] || 'application/json';
        body = JSON.stringify(options.body);
    }

    const response = await fetch(apiUrl(path), {
        method: options.method || 'GET',
        credentials: 'include',
        headers,
        body,
    });

    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json')
        ? await response.json().catch(() => ({}))
        : { error: await response.text() };

    if (!response.ok) {
        const message = typeof payload?.error === 'string' ? payload.error : `API error ${response.status}`;
        throw new Error(message);
    }

    return payload as T;
};

export const apiGet = <T>(path: string) => apiRequest<T>(path);
export const apiPost = <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'POST', body });
export const apiPut = <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'PUT', body });
export const apiDelete = <T>(path: string) => apiRequest<T>(path, { method: 'DELETE' });
