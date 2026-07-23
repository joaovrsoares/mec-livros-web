const PUBLIC_API_BASE = "https://meclivros.mec.gov.br/api/backend";
const DOWNLOAD_API_BASE = "https://api-meclivros.mec.gov.br";

export type MecBook = {
  id: number;
  title: string;
  authors: string[];
  cover_filename: string;
  isbn: string;
  description: string;
  publisher: string;
  published_date: string;
  page_count: number;
  categories: string[];
  language: string;
  likes_count: number;
  view_count: number;
  rating: number;
  review_count: number;
  has_epub?: boolean;
  epub_filename?: string;
  size?: number;
};

export type MecSearchResponse = {
  books: MecBook[];
  pagination: {
    page: number;
    limit: number;
    total_items: number;
    total_pages: number;
    has_next_page: boolean;
    has_previous_page: boolean;
  };
  query: string;
};

export type MecDownloadResponse = {
  downloadUrl: string;
  expiresAt: string;
  bookId: number;
  accessType: string;
  encrypted: boolean;
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(
      `Erro na API (${response.status} ${response.statusText})${details ? `: ${details}` : ""}`,
    );
  }

  return (await response.json()) as T;
}

export async function searchBooks(params: {
  query: string;
  page: number;
  limit: number;
}): Promise<MecSearchResponse> {
  const searchParams = new URLSearchParams({
    query: params.query,
    page: String(params.page),
    limit: String(params.limit),
  });

  return fetchJson<MecSearchResponse>(
    `${PUBLIC_API_BASE}/books/search?${searchParams.toString()}`,
  );
}

export async function getBookById(id: string): Promise<MecBook> {
  return fetchJson<MecBook>(`${PUBLIC_API_BASE}/books/${id}`);
}

export async function getDownloadInfo(
  id: string,
  bearerToken: string,
): Promise<MecDownloadResponse> {
  return fetchJson<MecDownloadResponse>(`${DOWNLOAD_API_BASE}/books/${id}/download`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${bearerToken}`,
      "X-Device-Info": "MecLivros/1.0.6 (iPad; iOS 26.5; pt_BR)",
      "User-Agent": "MEC Livros Frontend MVP/1.0",
      "Accept-Language": "pt-BR,pt;q=0.9",
    },
  });
}

