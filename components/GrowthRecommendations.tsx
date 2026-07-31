"use client";

import { useEffect, useState } from "react";

type Period = "april" | "october" | "january";

type RecommendationSummary = {
  weakestDimension: string;
  weakestLabel: string;
  weakestScore: number;
  diagnosis: string;
};

type GrowthHighlight = {
  label: string;
  score: number;
  delta: number;
  previousLabel: string;
  isBaseline: boolean;
  message: string;
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
  popularityLabel?: string;
  price?: number;
  salePrice?: number;
  publishedDate?: string;
  publicationYear?: number;
  salesStatus?: string;
  kyoboUrl: string;
  youngpoongUrl: string;
  naverUrl: string;
};

type RecommendationResponse<T> = Partial<RecommendationSummary> & {
  success: boolean;
  error?: string;
  recommendations?: T[];
  searchSuggestions?: string[];
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

const TETI_SEARCH_URL =
  "https://www.teti.kr/homepage/search/selectTotalSearchList.do";

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
  if (error === "INVALID_BOOK_QUERY") {
    return "검색어를 2자 이상 40자 이하로 입력해 주세요.";
  }
  return section === "training"
    ? "연수 검색어를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."
    : "도서 정보를 불러오지 못했습니다. 연수 추천은 계속 이용할 수 있습니다.";
}

function formatWon(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

function RecommendationReason({ reason }: { reason: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="recommendation-reason">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="reason-button-copy">
          <span className="reason-icon" aria-hidden="true">i</span>
          <span>
            <b>왜 추천했나요?</b>
            <small>추천 근거 보기</small>
          </span>
        </span>
        <span className="reason-chevron" aria-hidden="true">+</span>
      </button>
      {open && (
        <div className="recommendation-reason-answer">
          <strong>맞춤 추천 근거</strong>
          <p className="card-reason">{reason}</p>
        </div>
      )}
    </div>
  );
}

function BookCard({
  book,
  primary = false,
  onChoose,
  onOther,
}: {
  book: BookRecommendation;
  primary?: boolean;
  onChoose?: () => void;
  onOther?: () => void;
}) {
  const price = Math.max(0, Number(book.price ?? 0));
  const salePrice = Math.max(0, Number(book.salePrice ?? 0));
  const displayedPrice = salePrice || price;

  return (
    <article
      className={`book-card ${primary ? "primary-book-card" : ""}`}
      key={`${book.title}:${book.isbn || book.detailUrl}`}
    >
      <div className="book-cover">
        <span>표지 없음</span>
        {book.thumbnail && (
          <img src={book.thumbnail} alt={`${book.title} 표지`} />
        )}
      </div>
      <div className="book-card-content">
        <span className="verified-badge">
          {primary ? "가장 먼저 볼 추천" : "도서 API 확인"}
        </span>
        <h4>{book.title}</h4>
        <p className="book-meta">
          {book.authors.join(", ")}
          <span>{book.publisher}</span>
        </p>
        {(book.publicationYear || book.salesStatus) && (
          <p className="book-facts">
            {book.publicationYear && (
              <span>{book.publicationYear}년 출간</span>
            )}
            {book.salesStatus && <span>{book.salesStatus}</span>}
          </p>
        )}
        {displayedPrice > 0 && (
          <p className="book-price">
            <span>카카오 등록가</span>
            <strong>{formatWon(displayedPrice)}</strong>
            {salePrice > 0 && price > salePrice && (
              <del>정가 {formatWon(price)}</del>
            )}
          </p>
        )}
        {book.popularityLabel && (
          <p className="book-popularity">{book.popularityLabel}</p>
        )}
        <RecommendationReason reason={book.reason} />
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
          <a href={book.youngpoongUrl} target="_blank" rel="noreferrer">
            영풍문고
          </a>
          <a href={book.naverUrl} target="_blank" rel="noreferrer">
            네이버
          </a>
        </div>
        {(onChoose || onOther) && (
          <div className="recommendation-choice-actions">
            {onChoose && (
              <button type="button" onClick={onChoose}>
                이 도서를 먼저 보기
              </button>
            )}
            {onOther && (
              <button type="button" onClick={onOther}>
                관심 없음 · 다른 도서 추천
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function BookCards({ items }: { items: BookRecommendation[] }) {
  return (
    <div className="recommendation-grid book-grid">
      {items.map((book) => (
        <BookCard
          book={book}
          key={`${book.title}:${book.isbn || book.detailUrl}`}
        />
      ))}
    </div>
  );
}

function TrainingCard({
  item,
  primary = false,
  copied,
  onCopy,
  onUseKeyword,
  onChoose,
  onOther,
}: {
  item: TrainingRecommendation;
  primary?: boolean;
  copied: boolean;
  onCopy: () => void;
  onUseKeyword: () => void;
  onChoose?: () => void;
  onOther?: () => void;
}) {
  return (
    <article className={`training-card ${primary ? "primary-training-card" : ""}`}>
      <span className="verified-badge">
        {primary ? "가장 먼저 볼 추천" : "짧은 핵심 검색어"}
      </span>
      <h4>{item.keyword}</h4>
      <p className="card-provider">{item.provider}</p>
      <RecommendationReason reason={item.reason} />
      <div className="card-actions">
        <button type="button" onClick={onUseKeyword}>
          연수 통합검색창에 넣기
        </button>
        <button type="button" onClick={onCopy}>
          {copied ? "복사됨 ✓" : "검색어 복사"}
        </button>
      </div>
      {(onChoose || onOther) && (
        <div className="recommendation-choice-actions">
          {onChoose && (
            <button type="button" onClick={onChoose}>
              이 연수를 먼저 보기
            </button>
          )}
          {onOther && (
            <button type="button" onClick={onOther}>
              관심 없음 · 다른 연수 추천
            </button>
          )}
        </div>
      )}
    </article>
  );
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
  growthHighlight,
}: {
  sessionToken: string;
  period: Period;
  complete: boolean;
  refreshKey: number;
  growthHighlight: GrowthHighlight;
}) {
  const [summary, setSummary] = useState<RecommendationSummary | null>(null);
  const [training, setTraining] =
    useState<SectionState<TrainingRecommendation>>(
      loadingState<TrainingRecommendation>,
    );
  const [books, setBooks] =
    useState<SectionState<BookRecommendation>>(loadingState<BookRecommendation>);
  const [copiedKeyword, setCopiedKeyword] = useState("");
  const [trainingQuery, setTrainingQuery] = useState("");
  const [bookQuery, setBookQuery] = useState("");
  const [bookSuggestions, setBookSuggestions] = useState<string[]>([]);
  const [bookSearch, setBookSearch] =
    useState<SectionState<BookRecommendation> | null>(null);
  const [trainingFocusIndex, setTrainingFocusIndex] = useState(0);
  const [bookFocusIndex, setBookFocusIndex] = useState(0);

  useEffect(() => {
    if (!sessionToken || !complete) {
      return;
    }

    const controller = new AbortController();
    queueMicrotask(() => {
      if (controller.signal.aborted) return;
      setSummary(null);
      setTraining(loadingState<TrainingRecommendation>());
      setBooks(loadingState<BookRecommendation>());
      setCopiedKeyword("");
      setTrainingQuery("");
      setBookQuery("");
      setBookSuggestions([]);
      setBookSearch(null);
      setTrainingFocusIndex(0);
      setBookFocusIndex(0);
    });

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
        if (section === "training") {
          const first = result.recommendations[0] as TrainingRecommendation;
          setTrainingQuery(first?.keyword ?? "");
        }
        if (section === "books" && Array.isArray(result.searchSuggestions)) {
          setBookSuggestions(result.searchSuggestions.slice(0, 3));
        }
        setState({
          status: "ready",
          items: result.recommendations.slice(0, 5),
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

  async function searchBooks(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = bookQuery.trim().replace(/\s+/g, " ");
    if (query.length < 2 || query.length > 40) {
      setBookSearch({
        status: "error",
        items: [],
        error: errorMessage("INVALID_BOOK_QUERY", "books"),
      });
      return;
    }

    setBookSearch(loadingState<BookRecommendation>());
    try {
      const response = await fetch("/api/recommendations/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken, period, query }),
      });
      const result =
        (await response.json()) as RecommendationResponse<BookRecommendation>;
      if (
        !response.ok ||
        !result.success ||
        !Array.isArray(result.recommendations)
      ) {
        throw new Error(result.error ?? "UNKNOWN_ERROR");
      }
      setBookSearch({
        status: "ready",
        items: result.recommendations.slice(0, 6),
        error: "",
      });
    } catch (error) {
      const code = error instanceof Error ? error.message : undefined;
      setBookSearch({
        status: "error",
        items: [],
        error: errorMessage(code, "books"),
      });
    }
  }

  function useTrainingKeyword(keyword: string) {
    setTrainingQuery(keyword);
    window.requestAnimationFrame(() => {
      const panel = document.getElementById("training-search-panel");
      const input = document.getElementById("training-search-keyword");
      panel?.scrollIntoView({ behavior: "smooth", block: "center" });
      if (input instanceof HTMLInputElement) input.focus({ preventScroll: true });
    });
  }

  const focusedTrainingIndex =
    training.items.length > 0
      ? trainingFocusIndex % training.items.length
      : 0;
  const focusedBookIndex =
    books.items.length > 0 ? bookFocusIndex % books.items.length : 0;
  const focusedTraining = training.items[focusedTrainingIndex];
  const focusedBook = books.items[focusedBookIndex];
  const additionalTraining = training.items
    .map((item, index) => ({ item, index }))
    .filter(({ index }) => index !== focusedTrainingIndex);
  const additionalBooks = books.items
    .map((book, index) => ({ book, index }))
    .filter(({ index }) => index !== focusedBookIndex);

  return (
    <section
      className="growth-recommendations stage-three"
      id="growth-recommendations"
      aria-labelledby="growth-title"
    >
      <div className="recommendation-heading">
        <div className="section-kicker">
          03 <span>맞춤형 성장 설계</span>
        </div>
        <h2 id="growth-title">나의 다음 성장을 위한 추천</h2>
        <p>
          저장된 {periodLabels[period]} 진단 결과에서 성장한 역량을 확인하고,
          다음에 보완할 역량에 맞춰 연수와 도서를 연결합니다.
        </p>
      </div>

      {!complete ? (
        <div className="recommendation-empty">
          <strong>16개 문항에 모두 응답해 주세요.</strong>
          <span>평가를 저장하면 현재 역량에 맞는 성장 자료가 나타납니다.</span>
        </div>
      ) : summary ? (
        <div className="recommendation-insight-grid">
          <div className="growth-highlight-summary">
            <div className="growth-highlight-head">
              <span>
                {growthHighlight.isBaseline
                  ? "현재 돋보이는 역량"
                  : `${growthHighlight.previousLabel}보다 변화가 가장 긍정적인 역량`}
              </span>
              <strong>{growthHighlight.label}</strong>
            </div>
            <div className="growth-highlight-score">
              {growthHighlight.isBaseline ? (
                <>
                  <b>{growthHighlight.score.toFixed(2)}</b>
                  <span>/ 5점</span>
                </>
              ) : (
                <>
                  <b>
                    {growthHighlight.delta >= 0 ? "+" : ""}
                    {growthHighlight.delta.toFixed(2)}
                  </b>
                  <span>점 변화</span>
                </>
              )}
            </div>
            <p>{growthHighlight.message}</p>
          </div>
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
        </div>
      ) : (
        <div className="recommendation-summary-loading">
          저장된 진단 결과를 읽고 있습니다.
        </div>
      )}

      {complete && (
        <>
          <section className="recommendation-section training-recommendation-section">
            <div className="recommendation-section-title">
              <span className="recommendation-number">01</span>
              <div>
                <h3>가장 먼저 살펴볼 연수 주제</h3>
                <p>
                  대표 추천 1개에 집중하고, 추가 추천 4개는 필요할 때
                  펼쳐보세요.
                </p>
              </div>
            </div>
            {training.status === "loading" && (
              <div className="recommendation-loading">연수 검색어를 구성하고 있습니다.</div>
            )}
            {training.status === "error" && (
              <div className="recommendation-error">{training.error}</div>
            )}
            {training.status === "ready" && focusedTraining && (
              <>
                <div className="focused-recommendation">
                  <TrainingCard
                    item={focusedTraining}
                    primary
                    copied={copiedKeyword === focusedTraining.keyword}
                    onCopy={() => void copyKeyword(focusedTraining.keyword)}
                    onUseKeyword={() =>
                      useTrainingKeyword(focusedTraining.keyword)
                    }
                    onOther={
                      training.items.length > 1
                        ? () =>
                            setTrainingFocusIndex(
                              (current) =>
                                (current + 1) % training.items.length,
                            )
                        : undefined
                    }
                  />
                  {additionalTraining.length > 0 && (
                    <details className="additional-recommendations">
                      <summary>
                        추가 추천 {additionalTraining.length}개 보기
                        <span aria-hidden="true">⌄</span>
                      </summary>
                      <div className="additional-recommendation-grid">
                        {additionalTraining.map(({ item, index }) => (
                          <TrainingCard
                            item={item}
                            key={item.keyword}
                            copied={copiedKeyword === item.keyword}
                            onCopy={() => void copyKeyword(item.keyword)}
                            onUseKeyword={() =>
                              useTrainingKeyword(item.keyword)
                            }
                            onChoose={() => setTrainingFocusIndex(index)}
                          />
                        ))}
                      </div>
                    </details>
                  )}
                </div>
                <div
                  className="training-search-panel"
                  id="training-search-panel"
                >
                  <div>
                    <strong>연수 통합검색</strong>
                    <span>
                      검색어를 입력하면 대전교육연수원 검색 결과로 바로
                      이동합니다.
                    </span>
                  </div>
                  <form
                    className="recommendation-search-form"
                    action={TETI_SEARCH_URL}
                    method="get"
                    target="_blank"
                  >
                    <label className="sr-only" htmlFor="training-search-keyword">
                      연수 검색어
                    </label>
                    <span className="search-lens" aria-hidden="true">
                      <i />
                    </span>
                    <input
                      id="training-search-keyword"
                      name="searchKeyword"
                      value={trainingQuery}
                      onChange={(event) => setTrainingQuery(event.target.value)}
                      maxLength={20}
                      placeholder="찾고 싶은 연수 주제를 입력하세요"
                      required
                    />
                    <button type="submit">연수 찾기 ↗</button>
                  </form>
                </div>
              </>
            )}
          </section>

          <section className="recommendation-section book-recommendation-section">
            <div className="recommendation-section-title">
              <span className="recommendation-number">02</span>
              <div>
                <h3>가장 먼저 읽어볼 도서</h3>
                <p>
                  관련도·최신성·판매 상태와 공개 평판을 반영한 대표 추천
                  1권입니다.
                </p>
              </div>
            </div>
            {books.status === "loading" && (
              <div className="recommendation-loading">관련 도서를 확인하고 있습니다.</div>
            )}
            {books.status === "error" && (
              <div className="recommendation-error books-error">{books.error}</div>
            )}
            {books.status === "ready" && focusedBook && (
              <div className="focused-recommendation">
                <BookCard
                  book={focusedBook}
                  primary
                  onOther={
                    books.items.length > 1
                      ? () =>
                          setBookFocusIndex(
                            (current) => (current + 1) % books.items.length,
                          )
                      : undefined
                  }
                />
                {additionalBooks.length > 0 && (
                  <details className="additional-recommendations">
                    <summary>
                      추가 추천 {additionalBooks.length}권 보기
                      <span aria-hidden="true">⌄</span>
                    </summary>
                    <div className="additional-recommendation-grid book-grid">
                      {additionalBooks.map(({ book, index }) => (
                        <BookCard
                          book={book}
                          key={`${book.title}:${book.isbn || book.detailUrl}`}
                          onChoose={() => setBookFocusIndex(index)}
                        />
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}

            {books.status === "ready" && (
              <div className="book-search-panel">
                <div className="book-search-heading">
                  <div>
                    <strong>도서 직접 검색</strong>
                    <span>
                      주제를 입력하면 관련도와 최신성·판매 상태를 먼저
                      확인하고 공개 평가를 참고해 실제 도서를 찾습니다.
                    </span>
                  </div>
                  <div className="book-suggestion-chips">
                    {bookSuggestions.map((suggestion) => (
                      <button
                        type="button"
                        key={suggestion}
                        onClick={() => setBookQuery(suggestion)}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
                <form
                  className="recommendation-search-form"
                  onSubmit={(event) => void searchBooks(event)}
                >
                  <label className="sr-only" htmlFor="book-search-query">
                    도서 검색어
                  </label>
                  <span className="search-lens" aria-hidden="true">
                    <i />
                  </span>
                  <input
                    id="book-search-query"
                    value={bookQuery}
                    onChange={(event) => setBookQuery(event.target.value)}
                    maxLength={40}
                    placeholder="찾고 싶은 도서 주제를 입력하세요"
                  />
                  <button type="submit">도서 찾기</button>
                </form>

                {bookSearch?.status === "loading" && (
                  <div className="recommendation-loading compact">
                    실제 도서를 검색하고 있습니다.
                  </div>
                )}
                {bookSearch?.status === "error" && (
                  <div className="recommendation-error compact">
                    {bookSearch.error}
                  </div>
                )}
                {bookSearch?.status === "ready" && (
                  <div className="custom-book-results">
                    <div className="custom-book-results-title">
                      <strong>“{bookQuery.trim()}” 검색 결과</strong>
                      <span>{bookSearch.items.length}권</span>
                    </div>
                    <BookCards items={bookSearch.items} />
                  </div>
                )}
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}
