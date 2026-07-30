import { NextResponse } from "next/server";

import {
  callServerSupabaseRpc,
  competencyRecommendations,
  contextErrorStatus,
  isPeriod,
  isSessionToken,
  loadRecommendationContext,
  makeBookSearchLinks,
  saveRecommendations,
  sha256,
  type BookRecommendation,
  type CompetencyId,
} from "../../../../lib/growth-recommendations";

type KakaoBook = {
  title?: string;
  authors?: string[];
  publisher?: string;
  thumbnail?: string;
  url?: string;
  isbn?: string;
  contents?: string;
  price?: number;
  sale_price?: number;
};

type KakaoBookResponse = {
  documents?: KakaoBook[];
};

type GoogleVolume = {
  volumeInfo?: {
    title?: string;
    averageRating?: number;
    ratingsCount?: number;
    industryIdentifiers?: Array<{
      type?: string;
      identifier?: string;
    }>;
  };
};

type GoogleBookResponse = {
  items?: GoogleVolume[];
};

type PopularitySignal = {
  ratingsCount: number;
  averageRating: number;
};

type BookCacheResponse = {
  success: boolean;
  error?: string;
  hit?: boolean;
  books?: BookRecommendation[] | null;
};

type RankedBook = {
  book: BookRecommendation;
  identity: string;
  relevanceScore: number;
  ratingsCount: number;
  averageRating: number;
  sourcePosition: number;
  queryIndex: number;
};

async function fetchKakaoBooks(query: string, apiKey: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const url = new URL("https://dapi.kakao.com/v3/search/book");
    url.searchParams.set("query", query);
    url.searchParams.set("sort", "accuracy");
    url.searchParams.set("size", "20");
    const response = await fetch(url, {
      headers: { Authorization: `KakaoAK ${apiKey}` },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`KAKAO_BOOK_API_${response.status}`);
    }
    const result = (await response.json()) as KakaoBookResponse;
    return result.documents ?? [];
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchGooglePopularity(query: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const url = new URL("https://www.googleapis.com/books/v1/volumes");
    url.searchParams.set("q", query);
    url.searchParams.set("maxResults", "40");
    url.searchParams.set("printType", "books");
    url.searchParams.set("langRestrict", "ko");
    url.searchParams.set(
      "fields",
      "items(volumeInfo(title,averageRating,ratingsCount,industryIdentifiers))",
    );
    const response = await fetch(url, {
      signal: controller.signal,
      cache: "force-cache",
    });
    if (!response.ok) throw new Error(`GOOGLE_BOOKS_API_${response.status}`);

    const result = (await response.json()) as GoogleBookResponse;
    const popularity = new Map<string, PopularitySignal>();
    for (const item of result.items ?? []) {
      const info = item.volumeInfo;
      const ratingsCount = Math.max(0, Number(info?.ratingsCount ?? 0));
      if (!info?.title || ratingsCount === 0) continue;
      const signal = {
        ratingsCount,
        averageRating: Math.max(0, Number(info.averageRating ?? 0)),
      };
      const keys = [
        `title:${canonicalBookTitle(info.title)}`,
        ...(info.industryIdentifiers ?? []).map(
          (identifier) =>
            `isbn:${(identifier.identifier ?? "").replace(/\D/g, "")}`,
        ),
      ].filter((key) => !key.endsWith(":"));
      for (const key of keys) {
        const current = popularity.get(key);
        if (!current || current.ratingsCount < ratingsCount) {
          popularity.set(key, signal);
        }
      }
    }
    return popularity;
  } finally {
    clearTimeout(timeout);
  }
}

function cleanBookTitle(title: string) {
  return title.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function canonicalBookTitle(title: string) {
  return cleanBookTitle(title)
    .toLocaleLowerCase("ko-KR")
    .replace(/[\[(（][^\])）]*[\])）]/g, "")
    .replace(/개정\s*\d*판|개정판|전\s*\d+권|세트/g, "")
    .replace(/[^0-9a-z가-힣]/gi, "");
}

function findPopularity(
  popularity: Map<string, PopularitySignal>,
  title: string,
  isbn: string,
) {
  const keys = [
    ...isbn
      .split(/\s+/)
      .map((value) => value.replace(/\D/g, ""))
      .filter(Boolean)
      .map((value) => `isbn:${value}`),
    `title:${canonicalBookTitle(title)}`,
  ];
  for (const key of keys) {
    const signal = popularity.get(key);
    if (signal) return signal;
  }
  return { ratingsCount: 0, averageRating: 0 };
}

function normalizeBook(
  book: KakaoBook,
  dimension: CompetencyId,
  query: string,
  isCustomSearch: boolean,
  popularity: PopularitySignal,
): BookRecommendation | null {
  const title = cleanBookTitle(book.title ?? "");
  const authors = Array.isArray(book.authors)
    ? book.authors.map((author) => author.trim()).filter(Boolean)
    : [];
  const detailUrl = book.url?.trim();
  if (!title || authors.length === 0 || !detailUrl) return null;

  const config = competencyRecommendations[dimension];
  const reason = isCustomSearch
    ? `카카오 도서 검색에서 ‘${query}’ 관련 실제 도서로 확인되었습니다. 제목과 저자, 상세 정보를 확인해 활용해 보세요.`
    : `카카오 도서 검색에서 확인된 실제 도서입니다. ${config.bookFocus} 역량을 보완하는 데 활용해 보세요.`;
  const popularityLabel =
    popularity.ratingsCount > 0
      ? `인기도 참고 · Google Books 평가 ${popularity.ratingsCount.toLocaleString("ko-KR")}개${popularity.averageRating > 0 ? ` · ${popularity.averageRating.toFixed(1)}점` : ""}`
      : "관련도 우선 · 카카오 검색 상위";
  return {
    title,
    authors,
    publisher: book.publisher?.trim() || "출판사 정보 없음",
    thumbnail: book.thumbnail?.trim() || "",
    detailUrl,
    isbn: book.isbn?.trim() || "",
    reason,
    popularityLabel,
    price: Math.max(0, Number(book.price ?? 0)),
    salePrice: Math.max(0, Number(book.sale_price ?? 0)),
    ...makeBookSearchLinks(title, authors),
  };
}

function scoreBook(book: KakaoBook, query: string) {
  const title = cleanBookTitle(book.title ?? "").toLocaleLowerCase("ko-KR");
  const contents = (book.contents ?? "").toLocaleLowerCase("ko-KR");
  const corpus = `${title} ${contents}`;
  const normalizedQuery = query.toLocaleLowerCase("ko-KR").trim();
  const tokens = query
    .toLocaleLowerCase("ko-KR")
    .split(/\s+/)
    .filter((token) => token.length > 1);

  let score = 0;
  if (normalizedQuery.length > 1 && title.includes(normalizedQuery)) score += 45;
  if (title.includes("초등") || title.includes("초등학생")) score += 60;
  else if (contents.includes("초등") || contents.includes("초등학생")) score += 25;
  if (title.includes("교사") || contents.includes("초등 교사")) score += 12;
  for (const token of tokens) {
    if (title.includes(token)) score += 18;
    else if (corpus.includes(token)) score += 7;
  }
  if (/(중등|고등|대학|유아)/.test(title) && !title.includes("초등")) {
    score -= 35;
  }
  return score;
}

function compareRankedBooks(a: RankedBook, b: RankedBook) {
  if (a.relevanceScore !== b.relevanceScore) {
    return b.relevanceScore - a.relevanceScore;
  }
  if (a.ratingsCount !== b.ratingsCount) {
    return b.ratingsCount - a.ratingsCount;
  }
  if (a.averageRating !== b.averageRating) {
    return b.averageRating - a.averageRating;
  }
  return a.sourcePosition - b.sourcePosition;
}

function uniqueBooks(books: BookRecommendation[], limit: number) {
  const seen = new Set<string>();
  return books.filter((book) => {
    if (seen.size >= limit) return false;
    const identity = canonicalBookTitle(book.title);
    if (!identity || seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}

async function searchBooksForQueries(
  dimension: CompetencyId,
  queries: readonly string[],
  apiKey: string,
  limit: number,
  isCustomSearch: boolean,
): Promise<BookRecommendation[]> {
  const [results, popularityResults] = await Promise.all([
    Promise.allSettled(
      queries.map((query) => fetchKakaoBooks(query, apiKey)),
    ),
    Promise.allSettled(queries.map((query) => fetchGooglePopularity(query))),
  ]);
  const ranked: RankedBook[] = [];

  results.forEach((result, queryIndex) => {
    if (result.status !== "fulfilled") return;
    const query = queries[queryIndex];
    const popularity =
      popularityResults[queryIndex]?.status === "fulfilled"
        ? popularityResults[queryIndex].value
        : new Map<string, PopularitySignal>();
    result.value.forEach((document, position) => {
      const popularitySignal = findPopularity(
        popularity,
        document.title ?? "",
        document.isbn ?? "",
      );
      const normalized = normalizeBook(
        document,
        dimension,
        query,
        isCustomSearch,
        popularitySignal,
      );
      if (!normalized) return;
      ranked.push({
        book: normalized,
        identity: canonicalBookTitle(normalized.title),
        relevanceScore: scoreBook(document, query),
        ratingsCount: popularitySignal.ratingsCount,
        averageRating: popularitySignal.averageRating,
        sourcePosition: position,
        queryIndex,
      });
    });
  });

  const selected: RankedBook[] = [];
  const seen = new Set<string>();
  for (let queryIndex = 0; queryIndex < queries.length; queryIndex += 1) {
    const best = ranked
      .filter((item) => item.queryIndex === queryIndex && !seen.has(item.identity))
      .sort(compareRankedBooks)[0];
    if (!best) continue;
    selected.push(best);
    seen.add(best.identity);
  }

  for (const candidate of ranked.sort(compareRankedBooks)) {
    if (selected.length >= limit) break;
    if (!candidate.identity || seen.has(candidate.identity)) continue;
    selected.push(candidate);
    seen.add(candidate.identity);
  }

  return selected.slice(0, limit).map((item) => item.book);
}

async function getCachedBooks(sessionToken: string, cacheKey: string) {
  return callServerSupabaseRpc<BookCacheResponse>(
    "recommendation_book_cache_get",
    { p_token: sessionToken, p_cache_key: cacheKey },
  );
}

async function putCachedBooks(
  sessionToken: string,
  cacheKey: string,
  dimension: CompetencyId,
  queryText: string,
  books: BookRecommendation[],
) {
  return callServerSupabaseRpc("recommendation_book_cache_put", {
    p_token: sessionToken,
    p_cache_key: cacheKey,
    p_dimension: dimension,
    p_query_text: queryText,
    p_books: books,
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      sessionToken?: unknown;
      period?: unknown;
      query?: unknown;
    };
    if (!isSessionToken(body.sessionToken) || !isPeriod(body.period)) {
      return NextResponse.json(
        { success: false, error: "INVALID_INPUT" },
        { status: 400 },
      );
    }

    const customQuery =
      typeof body.query === "string" ? body.query.trim().replace(/\s+/g, " ") : "";
    if (
      body.query !== undefined &&
      (typeof body.query !== "string" ||
        customQuery.length < 2 ||
        customQuery.length > 40)
    ) {
      return NextResponse.json(
        { success: false, error: "INVALID_BOOK_QUERY" },
        { status: 400 },
      );
    }

    const context = await loadRecommendationContext(
      body.sessionToken,
      body.period,
    );
    if (
      !context.success ||
      !context.weakest_dimension ||
      context.weakest_score === undefined
    ) {
      return NextResponse.json(context, {
        status: contextErrorStatus(context.error),
      });
    }

    const apiKey = process.env.KAKAO_REST_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "BOOK_API_NOT_CONFIGURED" },
        { status: 503 },
      );
    }

    const config = competencyRecommendations[context.weakest_dimension];
    const queries = customQuery ? [customQuery] : config.bookQueries;
    const queryText = queries.join(" | ");
    const cacheVersion = customQuery
      ? "kakao-book-search:v4-price"
      : "kakao-books:v4-price";
    const cacheKey = await sha256(
      `${cacheVersion}:${context.weakest_dimension}:${queryText}`,
    );
    const cache = await getCachedBooks(body.sessionToken, cacheKey);
    const limit = customQuery ? 6 : 3;

    let recommendations =
      cache.success && cache.hit && Array.isArray(cache.books)
        ? uniqueBooks(cache.books, limit)
        : [];
    let source = "supabase-cache";

    if (recommendations.length === 0) {
      recommendations = await searchBooksForQueries(
        context.weakest_dimension,
        queries,
        apiKey,
        limit,
        Boolean(customQuery),
      );
      source = "kakao-api";
      if (recommendations.length === 0) {
        return NextResponse.json(
          { success: false, error: "NO_VERIFIED_BOOKS_FOUND" },
          { status: 404 },
        );
      }
      await putCachedBooks(
        body.sessionToken,
        cacheKey,
        context.weakest_dimension,
        queryText,
        recommendations,
      );
    }

    if (!customQuery) {
      const saved = await saveRecommendations(
        body.sessionToken,
        context,
        "books",
        recommendations,
      );
      if (!saved.success) throw new Error(saved.error ?? "SAVE_FAILED");
    }

    return NextResponse.json({
      success: true,
      source,
      weakestDimension: context.weakest_dimension,
      weakestLabel: config.label,
      weakestScore: context.weakest_score,
      diagnosis: config.diagnosis,
      recommendations,
      searchSuggestions: config.bookQueries,
      query: customQuery || undefined,
    });
  } catch (error) {
    console.error("Book recommendation failed", error);
    return NextResponse.json(
      { success: false, error: "BOOK_RECOMMENDATION_FAILED" },
      { status: 500 },
    );
  }
}
