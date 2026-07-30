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

async function fetchKakaoBooks(query: string, apiKey: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const url = new URL("https://dapi.kakao.com/v3/search/book");
    url.searchParams.set("query", query);
    url.searchParams.set("sort", "accuracy");
    url.searchParams.set("size", "10");
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

function normalizeBook(
  book: KakaoBook,
  dimension: CompetencyId,
  query: string,
): BookRecommendation | null {
  const title = book.title?.trim();
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
    reason: `카카오 도서 검색에서 ‘${query}’와 관련성이 높은 실제 도서로 확인되었습니다. ${config.bookFocus} 역량을 살펴보는 데 활용해 보세요.`,
    ...makeBookSearchLinks(title, authors),
  };
}

async function searchBooks(
  dimension: CompetencyId,
  apiKey: string,
): Promise<BookRecommendation[]> {
  const queries = competencyRecommendations[dimension].bookQueries;
  const results = await Promise.allSettled(
    queries.map((query) => fetchKakaoBooks(query, apiKey)),
  );

  const recommendations: BookRecommendation[] = [];
  const seen = new Set<string>();

  results.forEach((result, queryIndex) => {
    if (result.status !== "fulfilled") return;
    const query = queries[queryIndex];
    for (const document of result.value) {
      const normalized = normalizeBook(document, dimension, query);
      if (!normalized) continue;
      const identity =
        normalized.isbn ||
        `${normalized.title.toLocaleLowerCase("ko-KR")}:${normalized.authors.join(",")}`;
      if (seen.has(identity)) continue;
      seen.add(identity);
      recommendations.push(normalized);
      break;
    }
  });

  if (recommendations.length < 3) {
    results.forEach((result, queryIndex) => {
      if (result.status !== "fulfilled") return;
      const query = queries[queryIndex];
      for (const document of result.value) {
        if (recommendations.length >= 3) break;
        const normalized = normalizeBook(document, dimension, query);
        if (!normalized) continue;
        const identity =
          normalized.isbn ||
          `${normalized.title.toLocaleLowerCase("ko-KR")}:${normalized.authors.join(",")}`;
        if (seen.has(identity)) continue;
        seen.add(identity);
        recommendations.push(normalized);
      }
    });
  }

  return recommendations.slice(0, 3);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      sessionToken?: unknown;
      period?: unknown;
    };
    if (!isSessionToken(body.sessionToken) || !isPeriod(body.period)) {
      return NextResponse.json(
        { success: false, error: "INVALID_INPUT" },
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

    const config = competencyRecommendations[context.weakest_dimension];
    if (Array.isArray(context.cached_books) && context.cached_books.length > 0) {
      return NextResponse.json({
        success: true,
        source: "history",
        weakestDimension: context.weakest_dimension,
        weakestLabel: config.label,
        weakestScore: context.weakest_score,
        diagnosis: config.diagnosis,
        recommendations: context.cached_books.slice(0, 3),
      });
    }

    const apiKey = process.env.KAKAO_REST_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "BOOK_API_NOT_CONFIGURED" },
        { status: 503 },
      );
    }

    const queryText = config.bookQueries.join(" | ");
    const cacheKey = await sha256(
      `kakao-books:v1:${context.weakest_dimension}:${queryText}`,
    );
    const cache = await callServerSupabaseRpc<BookCacheResponse>(
      "recommendation_book_cache_get",
      { p_token: body.sessionToken, p_cache_key: cacheKey },
    );

    let recommendations =
      cache.success && cache.hit && Array.isArray(cache.books)
        ? cache.books.slice(0, 3)
        : [];
    let source = "supabase-cache";

    if (recommendations.length === 0) {
      recommendations = await searchBooks(context.weakest_dimension, apiKey);
      source = "kakao-api";
      if (recommendations.length === 0) {
        return NextResponse.json(
          { success: false, error: "NO_VERIFIED_BOOKS_FOUND" },
          { status: 404 },
        );
      }
      await callServerSupabaseRpc("recommendation_book_cache_put", {
        p_token: body.sessionToken,
        p_cache_key: cacheKey,
        p_dimension: context.weakest_dimension,
        p_query_text: queryText,
        p_books: recommendations,
      });
    }

    const saved = await saveRecommendations(
      body.sessionToken,
      context,
      "books",
      recommendations,
    );
    if (!saved.success) throw new Error(saved.error ?? "SAVE_FAILED");

    return NextResponse.json({
      success: true,
      source,
      weakestDimension: context.weakest_dimension,
      weakestLabel: config.label,
      weakestScore: context.weakest_score,
      diagnosis: config.diagnosis,
      recommendations,
    });
  } catch (error) {
    console.error("Book recommendation failed", error);
    return NextResponse.json(
      { success: false, error: "BOOK_RECOMMENDATION_FAILED" },
      { status: 500 },
    );
  }
}
