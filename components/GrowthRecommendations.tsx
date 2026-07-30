"use client";

import { useEffect, useState } from "react";

type Period = "april" | "october" | "january";

type RecommendationSummary = {
  weakestDimension: string;
  weakestLabel: string;
  weakestScore: number;
  diagnosis: string;
};

type TrainingRecommendation = {
  keyword: string;
  provider: string;
  reason: string;
  searchUrl: string;
};

type BookRecommendation = {
  title: string;
  authors: string[];
  publisher: string;
  thumbnail: string;
  detailUrl: string;
  isbn: string;
  reason: string;
  kyoboUrl: string;
  youngpoongUrl: string;
  naverUrl: string;
};

type RecommendationResponse<T> = Partial<RecommendationSummary> & {
  success: boolean;
  error?: string;
  recommendations?: T[];
};

type SectionState<T> =
  | { status: "loading"; items: T[]; error: "" }
  | { status: "ready"; items: T[]; error: "" }
  | { status: "error"; items: T[]; error: string };

const periodLabels: Record<Period, string> = {
  april: "4월",
  october: "10월",
  january: "1월",
};

function loadingState<T>(): SectionState<T> {
  return { status: "loading", items: [], error: "" };
}

function errorMessage(error: string | undefined, section: "training" | "books") {
  if (error === "ASSESSMENT_NOT_FOUND") {
    return "먼저 현재 평가를 저장하면 맞춤 추천을 확인할 수 있습니다.";
  }
  if (error === "BOOK_API_NOT_CONFIGURED") {
    return "도서 추천 연동을 준비하고 있습니다. 연수 추천은 정상적으로 이용할 수 있습니다.";
  }
  if (error === "NO_VERIFIED_BOOKS_FOUND") {
    return "현재 검색어로 확인된 도서를 찾지 못했습니다. 잠시 후 다시 시도해 주세요.";
  }
  if (error === "SESSION_EXPIRED") {
    return "로그인 시간이 만료되었습니다. 다시 로그인해 주세요.";
  }
  return section === "training"
    ? "연수 검색어를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."
    : "도서 정보를 불러오지 못했습니다. 연수 추천은 계속 이용할 수 있습니다.";
}

function summaryFrom<T>(
  response: RecommendationResponse<T>,
): RecommendationSummary | null {
  if (
    typeof response.weakestDimension !== "string" ||
    typeof response.weakestLabel !== "string" ||
    typeof response.weakestScore !== "number" ||
    typeof response.diagnosis !== "string"
  ) {
    return null;
  }
  return {
    weakestDimension: response.weakestDimension,
    weakestLabel: response.weakestLabel,
    weakestScore: response.weakestScore,
    diagnosis: response.diagnosis,
  };
}

export default function GrowthRecommendations({
  sessionToken,
  period,
  complete,
  refreshKey,
}: {
  sessionToken: string;
  period: Period;
  complete: boolean;
  refreshKey: number;
}) {
  const [summary, setSummary] = useState<RecommendationSummary | null>(null);
  const [training, setTraining] =
    useState<SectionState<TrainingRecommendation>>(
      loadingState<TrainingRecommendation>,
    );
  const [books, setBooks] =
    useState<SectionState<BookRecommendation>>(loadingState<BookRecommendation>);
  const [copiedKeyword, setCopiedKeyword] = useState("");

  useEffect(() => {
    if (!sessionToken || !complete) {
      setSummary(null);
      setTraining(loadingState<TrainingRecommendation>());
      setBooks(loadingState<BookRecommendation>());
      return;
    }

    const controller = new AbortController();
    setSummary(null);
    setTraining(loadingState<TrainingRecommendation>());
    setBooks(loadingState<BookRecommendation>());
    setCopiedKeyword("");

    async function loadSection<T>(
      section: "training" | "books",
      setState: React.Dispatch<React.SetStateAction<SectionState<T>>>,
    ) {
      try {
        const response = await fetch(`/api/recommendations/${section}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionToken, period }),
          signal: controller.signal,
        });
        const result = (await response.json()) as RecommendationResponse<T>;
        if (!response.ok || !result.success || !Array.isArray(result.recommendations)) {
          throw new Error(result.error ?? "UNKNOWN_ERROR");
        }
        const nextSummary = summaryFrom(result);
        if (nextSummary) setSummary(nextSummary);
        setState({
          status: "ready",
          items: result.recommendations.slice(0, 3),
          error: "",
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        const code = error instanceof Error ? error.message : undefined;
        setState({ status: "error", items: [], error: errorMessage(code, section) });
      }
    }

    void loadSection<TrainingRecommendation>("training", setTraining);
    void loadSection<BookRecommendation>("books", setBooks);

    return () => controller.abort();
  }, [sessionToken, period, complete, refreshKey]);

  async function copyKeyword(keyword: string) {
    try {
      await navigator.clipboard.writeText(keyword);
      setCopiedKeyword(keyword);
      window.setTimeout(() => setCopiedKeyword(""), 1800);
    } catch {
      setCopiedKeyword("");
    }
  }

  return (
    <section className="growth-recommendations" aria-labelledby="growth-title">
      <div className="recommendation-heading">
        <div className="section-kicker">
          03 <span>CARE NEXT · 맞춤형 성장 설계</span>
        </div>
        <h2 id="growth-title">나의 다음 성장을 위한 추천</h2>
        <p>
          저장된 {periodLabels[period]} 진단 결과에서 가장 보완이 필요한
          역량을 찾아 연수 탐색어와 실제 도서를 연결합니다.
        </p>
      </div>

      {!complete ? (
        <div className="recommendation-empty">
          <strong>16개 문항에 모두 응답해 주세요.</strong>
          <span>평가를 저장하면 현재 역량에 맞는 성장 자료가 나타납니다.</span>
        </div>
      ) : summary ? (
        <div className="weakest-summary">
          <div>
            <span>가장 보완이 필요한 역량</span>
            <strong>{summary.weakestLabel}</strong>
          </div>
          <div className="weakest-score">
            <b>{summary.weakestScore.toFixed(2)}</b>
            <span>/ 5점</span>
          </div>
          <p>{summary.diagnosis}</p>
        </div>
      ) : (
        <div className="recommendation-summary-loading">
          저장된 진단 결과를 읽고 있습니다.
        </div>
      )}

      {complete && (
        <>
          <section className="recommendation-section">
            <div className="recommendation-section-title">
              <span className="recommendation-number">01</span>
              <div>
                <h3>추천 연수 탐색어 3개</h3>
                <p>
                  실제 개설 과정은 대전교육연수원 공식 검색에서 확인합니다.
                </p>
              </div>
            </div>
            {training.status === "loading" && (
              <div className="recommendation-loading">연수 검색어를 구성하고 있습니다.</div>
            )}
            {training.status === "error" && (
              <div className="recommendation-error">{training.error}</div>
            )}
            {training.status === "ready" && (
              <div className="recommendation-grid training-grid">
                {training.items.map((item, index) => (
                  <article className="training-card" key={item.keyword}>
                    <div className="card-index">{String(index + 1).padStart(2, "0")}</div>
                    <span className="verified-badge">공식 사이트 검색어</span>
                    <h4>{item.keyword}</h4>
                    <p className="card-provider">{item.provider}</p>
                    <p className="card-reason">{item.reason}</p>
                    <div className="card-actions">
                      <a href={item.searchUrl} target="_blank" rel="noreferrer">
                        연수 검색하기 ↗
                      </a>
                      <button type="button" onClick={() => void copyKeyword(item.keyword)}>
                        {copiedKeyword === item.keyword ? "복사됨 ✓" : "검색어 복사"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="recommendation-section">
            <div className="recommendation-section-title">
              <span className="recommendation-number">02</span>
              <div>
                <h3>추천 도서 3권</h3>
                <p>카카오 도서 검색 API에서 확인된 실제 도서만 표시합니다.</p>
              </div>
            </div>
            {books.status === "loading" && (
              <div className="recommendation-loading">관련 도서를 확인하고 있습니다.</div>
            )}
            {books.status === "error" && (
              <div className="recommendation-error books-error">{books.error}</div>
            )}
            {books.status === "ready" && (
              <div className="recommendation-grid book-grid">
                {books.items.map((book) => (
                  <article className="book-card" key={book.isbn || book.detailUrl}>
                    <div className="book-cover">
                      <span>표지 없음</span>
                      {book.thumbnail && (
                        <img src={book.thumbnail} alt={`${book.title} 표지`} />
                      )}
                    </div>
                    <div className="book-card-content">
                      <span className="verified-badge">도서 API 확인</span>
                      <h4>{book.title}</h4>
                      <p className="book-meta">
                        {book.authors.join(", ")}
                        <span>{book.publisher}</span>
                      </p>
                      <p className="card-reason">{book.reason}</p>
                      <a
                        className="book-detail-link"
                        href={book.detailUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        도서 상세보기 ↗
                      </a>
                      <div className="bookstore-links">
                        <a href={book.kyoboUrl} target="_blank" rel="noreferrer">
                          교보문고
                        </a>
                        <a
                          href={book.youngpoongUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          영풍문고
                        </a>
                        <a href={book.naverUrl} target="_blank" rel="noreferrer">
                          네이버
                        </a>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}
