const PUBLIC_API_BASE = "https://meclivros.mec.gov.br/api/backend";
const DOWNLOAD_API_BASE = "https://api-meclivros.mec.gov.br";

export type MecBook = {
  id: number;
  title: string;
  authors: string[];
  cover_filename: string;
  isbn?: string;
  description?: string;
  publisher?: string;
  published_date?: string;
  page_count?: number;
  categories?: string[];
  language?: string;
  likes_count?: number;
  view_count?: number;
  rating?: number;
  review_count?: number;
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

export type MecCategory = {
  slug: string;
  name: string;
  icon?: string;
  gradient_from?: string;
  gradient_to?: string;
  count: number;
};

export type MecCategorySection = {
  id: string;
  name: string;
  categories: MecCategory[];
};

export type MecCategoriesPreviewResponse = {
  total_books: number;
  excluded_books?: number;
  promoted_books?: number;
  sections: MecCategorySection[];
};

export type MecCategoryBooksResponse = {
  slug: string;
  name: string;
  section: string;
  total: number;
  page: number;
  limit: number;
  books: MecBook[];
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

  const res = await fetchJson<MecSearchResponse>(
    `${PUBLIC_API_BASE}/books/search?${searchParams.toString()}`,
  );

  if (res.books) {
    res.books = await Promise.all(
      res.books.map(async (book) => {
        let publisher = book.publisher?.trim();
        let pageCount = book.page_count;

        if (!publisher) {
          try {
            const detail = await getBookById(String(book.id));
            if (detail?.publisher) {
              publisher = detail.publisher;
            }
            if (!pageCount && detail?.page_count) {
              pageCount = detail.page_count;
            }
          } catch {
            // Keep original values if detail call fails
          }
        }

        return {
          ...book,
          cover_filename: getCoverUrl(book.cover_filename),
          publisher,
          page_count: pageCount,
        };
      }),
    );
  }

  return res;
}

export async function getCategoriesPreview(): Promise<MecCategoriesPreviewResponse> {
  return fetchJson<MecCategoriesPreviewResponse>(`${PUBLIC_API_BASE}/categories/preview`);
}

const bookCache = new Map<string, { book: MecBook; timestamp: number }>();
const BOOK_CACHE_TTL = 1000 * 60 * 15; // 15 minutes

export async function getBookById(id: string): Promise<MecBook> {
  const cached = bookCache.get(id);
  if (cached && Date.now() - cached.timestamp < BOOK_CACHE_TTL) {
    return cached.book;
  }
  const book = await fetchJson<MecBook>(`${PUBLIC_API_BASE}/books/${id}`);
  if (book && book.cover_filename) {
    book.cover_filename = getCoverUrl(book.cover_filename);
  }
  if (book) {
    bookCache.set(id, { book, timestamp: Date.now() });
  }
  return book;
}

export async function getCategoryBooks(params: {
  slug: string;
  page: number;
  limit: number;
}): Promise<MecCategoryBooksResponse> {
  const searchParams = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
  });

  const res = await fetchJson<MecCategoryBooksResponse>(
    `${PUBLIC_API_BASE}/categories/preview/${encodeURIComponent(params.slug)}?${searchParams.toString()}`,
  );

  if (res.books) {
    res.books = await Promise.all(
      res.books.map(async (book) => {
        let publisher = book.publisher;
        let pageCount = book.page_count;

        if (!publisher) {
          try {
            const detail = await getBookById(String(book.id));
            if (detail?.publisher) {
              publisher = detail.publisher;
            }
            if (!pageCount && detail?.page_count) {
              pageCount = detail.page_count;
            }
          } catch {
            // Keep original values if detail call fails
          }
        }

        return {
          ...book,
          cover_filename: getCoverUrl(book.cover_filename),
          publisher,
          page_count: pageCount,
        };
      }),
    );
  }

  return res;
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

export function getCoverUrl(rawUrl: string): string {
  if (!rawUrl) return "";
  let url = rawUrl.split("?")[0];

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    const cleanPath = url.replace(/^\/?(covers\/|covers-webp\/)?/, "");
    url = `https://static-meclivros.mec.gov.br/covers-webp/${cleanPath}`;
  } else {
    url = url.replace(
      "static-meclivros.mec.gov.br/covers/",
      "static-meclivros.mec.gov.br/covers-webp/"
    );
  }

  return url;
}

export const getProxyCoverUrl = getCoverUrl;

export function formatHomepageTitle(title: string): string {
  if (!title) return "";
  if (title.length > 50) {
    return `${title.slice(0, 50).trim()}...`;
  }
  return title;
}

export function formatHomepageAuthors(authors?: string[]): string {
  if (!authors || authors.length === 0) {
    return "Autor desconhecido";
  }
  if (authors.length <= 2) {
    return authors.join(", ");
  }
  return `${authors[0]}, ${authors[1]} e mais`;
}

export function formatLanguage(language?: string): string {
  if (!language) {
    return "Não informado";
  }

  const code = language.trim().toLowerCase();
  if (!code) {
    return "Não informado";
  }

  try {
    const displayName = new Intl.DisplayNames(["pt-BR"], {
      type: "language",
    }).of(code);

    if (displayName && displayName.toLowerCase() !== code) {
      return displayName.charAt(0).toLocaleUpperCase("pt-BR") + displayName.slice(1);
    }
  } catch {
    // Preserve the API value when the runtime does not support this code.
  }

  return language;
}
