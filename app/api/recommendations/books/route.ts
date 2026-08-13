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
  datetime?: string;
  status?: string;
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
  totalScore: number;
  sourcePosition: number;
  queryIndex: number;
};

async function fetchKakaoBooks(query: string, apiKey: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    async function load(sort: "accuracy" | "latest", size: number) {
      const url = new URL("https://dapi.kakao.com/v3/search/book");
      url.searchParams.set("query", query);
      url.searchParams.set("sort", sort);
      url.searchParams.set("size", String(size));
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
    }

    const [accuracy, latest] = await Promise.all([
      load("accuracy", 30),
      load("latest", 20),
    ]);
    const seen = new Set<string>();
    return [...accuracy, ...latest].filter((book) => {
      const identity =
        book.isbn?.replace(/\D/g, "") ||
        canonicalBookTitle(book.title ?? "");
      if (!identity || seen.has(identity)) return false;
      seen.add(identity);
      return true;
    });
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

function publicationYear(datetime?: string) {
  const year = Number(datetime?.slice(0, 4));
  const currentYear = new Date().getUTCFullYear();
  return Number.isInteger(year) && year >= 1900 && year <= currentYear + 1
    ? year
    : 0;
}

function isUnavailable(status?: string) {
  return /(절판|품절|판매\s*중지|구매\s*불가)/.test(status?.trim() ?? "");
}

function freshnessScore(year: number) {
  if (!year) return 0;
  const age = new Date().getUTCFullYear() - year;
  if (age <= 2) return 34;
  if (age <= 4) return 27;
  if (age <= 7) return 18;
  if (age <= 10) return 8;
  if (age <= 15) return -6;
  if (age <= 20) return -22;
  return -45;
}

function popularityScore(popularity: PopularitySignal) {
  const countScore = Math.min(
    24,
    Math.log10(popularity.ratingsCount + 1) * 9,
  );
  const ratingScore =
    popularity.averageRating > 0
      ? Math.max(0, popularity.averageRating - 3) * 5
      : 0;
  return countScore + ratingScore;
}

function makeDetailedReason({
  title,
  query,
  configLabel,
  bookFocus,
  year,
  status,
  popularity,
  isCustomSearch,
}: {
  title: string;
  query: string;
  configLabel: string;
  bookFocus: string;
  year: number;
  status: string;
  popularity: PopularitySignal;
  isCustomSearch: boolean;
}) {
  const relevance = isCustomSearch
    ? `『${title}』는 사용자가 입력한 ‘${query}’ 검색어와 제목·소개 정보의 관련도가 높아 우선 살펴볼 책으로 골랐습니다.`
    : `『${title}』는 ‘${query}’ 주제와 관련성이 높아 ${configLabel}의 ${bookFocus}을 보완할 자료로 골랐습니다.`;
  const freshness =
    year > 0
      ? `${year}년 출간 도서이며${status ? ` 카카오 도서 정보상 ‘${status}’ 상태로` : ""} 확인되어, 오래되었거나 명시적으로 절판·품절된 책은 추천에서 제외하는 기준을 통과했습니다.`
      : `${status ? `카카오 도서 정보상 ‘${status}’ 상태이며 ` : ""}명시적으로 절판·품절된 책은 제외했지만 출간연도는 확인되지 않아 상세 페이지에서 개정판 여부를 함께 확인하는 것이 좋습니다.`;
  const reputation =
    popularity.ratingsCount > 0
      ? `평판 참고값으로 Google Books 공개 평가 ${popularity.ratingsCount.toLocaleString("ko-KR")}건${popularity.averageRating > 0 ? `, 평균 ${popularity.averageRating.toFixed(1)}점` : ""}이 확인되어 관련도 다음의 보조 기준으로 반영했습니다.`
      : "공개 평점 건수는 확인되지 않아 평판을 임의로 추정하지 않았고, 카카오 검색 관련도·출간시점·판매 상태를 중심으로 판단했습니다.";
  return `${relevance} ${freshness} ${reputation}`;
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
  const salesStatus = book.status?.trim() ?? "";
  if (
    !title ||
    authors.length === 0 ||
    !detailUrl ||
    isUnavailable(salesStatus)
  ) {
    return null;
  }

  const config = competencyRecommendations[dimension];
  const year = publicationYear(book.datetime);
  const reason = makeDetailedReason({
    title,
    query,
    configLabel: config.label,
    bookFocus: config.bookFocus,
    year,
    status: salesStatus,
    popularity,
    isCustomSearch,
  });
  const popularityLabel =
    popularity.ratingsCount > 0
      ? `평판 참고 · Google Books 공개 평가 ${popularity.ratingsCount.toLocaleString("ko-KR")}건${popularity.averageRating > 0 ? ` · ${popularity.averageRating.toFixed(1)}점` : ""}`
      : "공개 평점 없음 · 관련도·최신성·판매 상태로 선정";
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
    publishedDate: book.datetime?.trim() || "",
    publicationYear: year || undefined,
    salesStatus,
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
  if (a.totalScore !== b.totalScore) {
    return b.totalScore - a.totalScore;
  }
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
      const year = publicationYear(document.datetime);
      const relevanceScore = scoreBook(document, query);
      ranked.push({
        book: normalized,
        identity: canonicalBookTitle(normalized.title),
        relevanceScore,
        ratingsCount: popularitySignal.ratingsCount,
        averageRating: popularitySignal.averageRating,
        totalScore:
          relevanceScore +
          freshnessScore(year) +
          popularityScore(popularitySignal) +
          (document.status?.includes("정상") ? 10 : 0),
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
      ? "kakao-book-search:v5-freshness-reason"
      : "kakao-books:v6-five-recommendations";
    const cacheKey = await sha256(
      `${cacheVersion}:${context.weakest_dimension}:${queryText}`,
    );
    const cache = await getCachedBooks(body.sessionToken, cacheKey);
    const limit = customQuery ? 6 : 5;

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
