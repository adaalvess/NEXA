const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

interface OpcoesPedido {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
}

/**
 * Cliente único de acesso à API (Especificação Técnica do Passo 14, 3.4) —
 * nenhum ecrã chama `fetch` diretamente. `credentials: 'include'` é
 * obrigatório: o CORS do backend (Passo 3/4) já exige `credentials: true`
 * e restringe a origem a `WEB_APP_URL`, para o cookie `nexa_session` viajar
 * entre `:3000` (frontend) e `:4000` (backend).
 */
export async function api<T>(path: string, opcoes: OpcoesPedido = {}): Promise<T> {
  const url = new URL(path, BASE_URL);
  if (opcoes.query) {
    for (const [chave, valor] of Object.entries(opcoes.query)) {
      if (valor !== undefined) {
        url.searchParams.set(chave, String(valor));
      }
    }
  }

  const res = await fetch(url, {
    method: opcoes.method ?? 'GET',
    credentials: 'include',
    headers: opcoes.body ? { 'Content-Type': 'application/json' } : undefined,
    body: opcoes.body ? JSON.stringify(opcoes.body) : undefined,
  });

  if (!res.ok) {
    const texto = await res.text().catch(() => '');
    throw new ApiError(res.status, texto || res.statusText);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}
