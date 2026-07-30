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
};

type KakaoBookResponse = {
  documents?: KakaoBook[];
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
  score: number;
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

function normalizeBook(
  book: KakaoBook,
  dimension: CompetencyId,
): BookRecommendation | null {
  const title = cleanBookTitle(book.title ?? "");
  const authors = Array.isArray(book.authors)
    ? book.authors.map((author) => author.trim()).filter(Boolean)
    : [];
  const detailUrl = book.url?.trim();
  if (!title || authors.length === 0 || !detailUrl) return null;

  const config = competencyRecommendations[dimension];
  return {
    title,
    authors,
    publisher: book.publisher?.trim() || "출판사 정보 없음",
    thumbnail: book.thumbnail?.trim() || "",
    detailUrl,
    isbn: book.isbn?.trim() || "",
    reason: `카카오 도서 검색에서 확인된 실제 도서입니다. ${config.bookFocus} 역량을 보완하는 데 활용해 보세요.`,
    ...makeBookSearchLinks(title, authors),
  };
}

function scoreBook(book: KakaoBook, query: string, position: number) {
  const title = cleanBookTitle(book.title ?? "").toLocaleLowerCase("ko-KR");
  const contents = (book.contents ?? "").toLocaleLowerCase("ko-KR");
  const corpus = `${title} ${contents}`;
  const tokens = query
    .toLocaleLowerCase("ko-KR")
    .split(/\s+/)
    .filter((token) => token.length > 1);

  let score = Math.max(0, 30 - position);
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
): Promise<BookRecommendation[]> {
  const results = await Promise.allSettled(
    queries.map((query) => fetchKakaoBooks(query, apiKey)),
  );
  const ranked: RankedBook[] = [];

  results.forEach((result, queryIndex) => {
    if (result.status !== "fulfilled") return;
    const query = queries[queryIndex];
    result.value.forEach((document, position) => {
      const normalized = normalizeBook(document, dimension);
      if (!normalized) return;
      ranked.push({
        book: normalized,
        identity: canonicalBookTitle(normalized.title),
        score: scoreBook(document, query, position),
        queryIndex,
      });
    });
  });

  const selected: RankedBook[] = [];
  const seen = new Set<string>();
  for (let queryIndex = 0; queryIndex < queries.length; queryIndex += 1) {
    const best = ranked
      .filter((item) => item.queryIndex === queryIndex && !seen.has(item.identity))
      .sort((a, b) => b.score - a.score)[0];
    if (!best) continue;
    selected.push(best);
    seen.add(best.identity);
  }

  for (const candidate of ranked.sort((a, b) => b.score - a.score)) {
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
      ? "kakao-book-search:v1"
      : "kakao-books:v2-elementary";
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
