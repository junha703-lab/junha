export type Period = "april" | "october" | "january";

export type CompetencyId =
  | "learning"
  | "guidance"
  | "professional"
  | "smart"
  | "culture"
  | "empathy"
  | "whole";

export type RecommendationContext = {
  success: boolean;
  error?: "INVALID_INPUT" | "SESSION_EXPIRED" | "ASSESSMENT_NOT_FOUND";
  period?: Period;
  assessment_submitted_at?: string;
  weakest_dimension?: CompetencyId;
  weakest_score?: number;
  cached_training?: TrainingRecommendation[] | null;
  cached_books?: BookRecommendation[] | null;
};

export type TrainingRecommendation = {
  title: string;
  keyword: string;
  provider: "대전교육연수원";
  reason: string;
  searchUrl: string;
  detailUrl: string;
  status: string;
  applicationPeriod?: string;
  educationPeriod?: string;
  target?: string;
};

export type BookRecommendation = {
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

type CompetencyRecommendationConfig = {
  label: string;
  diagnosis: string;
  trainingKeywords: [string, string, string, string, string];
  bookQueries: [string, string, string];
  bookFocus: string;
};

export const TETI_SEARCH_URL =
  "https://www.teti.kr/homepage/educourse/eduCourseList.do";

export const competencyRecommendations: Record<
  CompetencyId,
  CompetencyRecommendationConfig
> = {
  learning: {
    label: "학습지도",
    diagnosis:
      "교재 연구, 학생 맞춤형 수업 설계, 질문과 참여 촉진, 이해도 점검 및 평가 환류를 중심으로 다음 성장을 설계해 보세요.",
    trainingKeywords: [
      "수업",
      "평가",
      "학습",
      "피드백",
      "맞춤",
    ],
    bookQueries: ["초등 수업설계", "초등 질문 수업", "초등 과정중심평가"],
    bookFocus: "수업 설계·질문·평가 환류",
  },
  guidance: {
    label: "생활지도",
    diagnosis:
      "학생 개별 특성 이해, 또래 관계와 학급 공동체, 안전·학교폭력 예방, 기본생활습관 지도를 중심으로 보완해 보세요.",
    trainingKeywords: [
      "생활",
      "폭력",
      "안전",
      "학급",
      "상담",
    ],
    bookQueries: ["초등 생활지도", "초등 학교폭력 예방", "초등 학급공동체"],
    bookFocus: "학생 이해·관계·안전 생활지도",
  },
  professional: {
    label: "전문성개발",
    diagnosis:
      "교사학습공동체 참여, 새롭게 배운 지식의 수업 적용, 교육환경 변화에 따른 교육자료 재구성을 중심으로 성장해 보세요.",
    trainingKeywords: [
      "연수",
      "교육과정",
      "전문",
      "교사",
      "학습",
    ],
    bookQueries: ["초등 교사학습공동체", "초등 교사 전문성", "초등 교육과정 재구성"],
    bookFocus: "교사학습공동체·전문성·교육과정 재구성",
  },
  smart: {
    label: "C 미래스마트",
    diagnosis:
      "학생 특성과 요구에 맞는 에듀테크·AI 매체 선택과 수업 적용을 중심으로 디지털 수업 역량을 확장해 보세요.",
    trainingKeywords: [
      "디지털",
      "인공지능",
      "AI",
      "에듀테크",
      "미래",
    ],
    bookQueries: ["초등 에듀테크", "초등 인공지능 교육", "초등 디지털 수업"],
    bookFocus: "에듀테크·AI 기반 맞춤형 수업",
  },
  culture: {
    label: "A 예술문화",
    diagnosis:
      "학생의 적성과 특기를 살리는 예술·문화·진로 활동과 창의적 표현 기회 설계를 중심으로 보완해 보세요.",
    trainingKeywords: [
      "예술",
      "문화",
      "진로",
      "미술",
      "음악",
    ],
    bookQueries: ["초등 예술교육", "초등 진로교육", "초등 문화예술"],
    bookFocus: "예술·문화·진로와 창의적 표현",
  },
  empathy: {
    label: "R 공감소통",
    diagnosis:
      "독서·토의·토론·협동학습으로 상호작용을 촉진하고, 공감적 상담으로 학생의 문제를 지원하는 역량을 키워 보세요.",
    trainingKeywords: [
      "상담",
      "토론",
      "공감",
      "소통",
      "협력",
    ],
    bookQueries: ["초등 공감 상담", "초등 토론 수업", "초등 독서교육"],
    bookFocus: "공감적 상담·토론·협동과 소통",
  },
  whole: {
    label: "E 전인적성장",
    diagnosis:
      "체육·놀이 활동과 인성교육을 바탕으로 건강한 가치관과 도덕성을 갖춘 전인적 성장을 지원해 보세요.",
    trainingKeywords: [
      "체육",
      "놀이",
      "인성",
      "건강",
      "도덕",
    ],
    bookQueries: ["초등 체육교육", "초등 놀이교육", "초등 인성교육"],
    bookFocus: "체육·놀이·인성과 전인적 성장",
  },
};

const trainingKeywordInsights: Record<string, string> = {
  수업:
    "대전교육연수원에서 실제 과정과 연관 과정이 폭넓게 확인되어, 학생 맞춤형 수업 설계와 참여 촉진 사례를 찾는 출발어로 적합합니다.",
  수업설계:
    "학생 수준과 성취기준을 연결해 수업 목표·활동·평가를 한 흐름으로 설계하는 방법을 익히는 데 직접 도움이 됩니다.",
  질문:
    "학생의 사고를 열어 주는 발문, 기다림, 후속 질문을 연습해 참여도와 이해도 점검을 함께 강화할 수 있습니다.",
  평가:
    "과정중심평가와 피드백 결과를 다음 수업 설계에 환류하는 구체적인 방법을 찾는 데 적합합니다.",
  학습:
    "학생의 이해 과정과 참여 양상을 살피고 학습 활동을 조정하는 교수·학습 전략을 폭넓게 탐색할 수 있습니다.",
  피드백:
    "학생의 현재 수준을 확인하고 다음 학습 행동을 안내하는 구체적인 피드백 방법을 수업 개선과 연결할 수 있습니다.",
  맞춤:
    "학생별 수준과 요구를 반영한 개별화 수업, 지원 전략, 교육자료 재구성 사례를 찾는 데 유용합니다.",
  생활:
    "생활교육·생활인성·기본생활 등 실제 과정명이 폭넓게 검색되어 일상적인 학생 지도 사례를 찾기 좋습니다.",
  생활지도:
    "학생의 개별 특성을 파악하고 일상적인 갈등과 기본생활습관을 예방적으로 지도하는 전략을 살펴볼 수 있습니다.",
  학교폭력:
    "학교폭력의 조기 징후, 사안별 초기 대응, 관계 회복과 예방교육을 실제 학교 상황에 맞게 점검할 수 있습니다.",
  폭력:
    "학교폭력 예방, 사안 대응, 관계 회복과 관련된 실제 과정이 검색되는 핵심어로 학생 안전을 위한 실무 학습과 연결됩니다.",
  안전:
    "교실·체험학습·학교생활에서 발생할 수 있는 위험을 예측하고 학생의 안전 습관을 기르는 지도법과 연결됩니다.",
  학급:
    "학급 운영, 또래 관계, 공동체 규칙과 갈등 예방을 함께 다루는 실제적인 생활지도 자료를 찾을 수 있습니다.",
  학습공동체:
    "동료 교사와 수업 사례를 나누고 공동 연구 결과를 수업과 생활지도에 적용하는 실행 역량을 키울 수 있습니다.",
  전문성:
    "자기 성찰, 수업 개선, 동료 피드백을 바탕으로 교사의 지속적인 성장 계획을 구체화하는 데 도움이 됩니다.",
  교육과정:
    "교육환경과 학생 요구에 맞춰 성취기준과 교육자료를 재구성하는 실제 사례를 탐색하기 좋습니다.",
  연수:
    "새로운 교육 지식과 수업 사례를 지속적으로 학습하고 자신의 전문성 개발 계획을 세우는 과정 탐색에 적합합니다.",
  전문:
    "교과 전문성, 상담 전문성, 디지털 전문성 등 교사의 역할별 성장 과정을 폭넓게 확인할 수 있습니다.",
  교사:
    "교사 대상 과정이 풍부하게 검색되어 수업·생활지도·교육과정 재구성에 필요한 최신 사례를 비교하기 좋습니다.",
  에듀테크:
    "도구 자체보다 학생 특성과 수업 목적에 맞는 디지털 매체를 선택·활용하는 기준을 세우는 데 유용합니다.",
  인공지능:
    "생성형 AI의 교육적 활용, 윤리, 수업자료 제작을 함께 살펴보며 안전한 교실 적용 방법을 찾을 수 있습니다.",
  디지털:
    "디지털 기반 수업 설계와 학생 참여·피드백을 연결해 미래형 수업 역량을 넓히는 데 적합합니다.",
  AI:
    "인공지능 활용 수업, 생성형 AI, 디지털 윤리와 관련된 실제 과정을 짧은 영문 핵심어로 폭넓게 찾을 수 있습니다.",
  미래:
    "미래교육, 디지털 전환, 학생 맞춤형 교육처럼 변화하는 교육환경을 준비하는 과정을 탐색하는 데 도움이 됩니다.",
  예술:
    "음악·미술·공연 등 학생의 감수성과 창의적 표현을 살리는 예술교육 과정과 직접 연결됩니다.",
  예술교육:
    "학생의 적성과 특기를 발견하고 음악·미술·공연 등 창의적 표현 기회를 수업에 설계하는 방법과 연결됩니다.",
  진로:
    "학생의 흥미와 강점을 탐색하고 교과·체험 활동을 진로 인식과 연결하는 지도 방안을 살펴볼 수 있습니다.",
  문화:
    "다양한 문화 경험을 교과와 연결해 감수성, 표현력, 공동체 이해를 키우는 활동 설계에 도움이 됩니다.",
  미술:
    "시각적 표현과 감상 활동을 통해 학생의 창의성과 예술적 감수성을 기르는 수업 사례를 찾을 수 있습니다.",
  음악:
    "노래·연주·감상 활동을 활용해 학생의 표현력과 협력 경험을 확장하는 교육 과정을 탐색할 수 있습니다.",
  상담:
    "공감적 경청과 질문을 통해 학생의 당면 문제를 이해하고 필요한 지원으로 연결하는 대화 기술을 강화할 수 있습니다.",
  토론:
    "학생이 서로의 생각을 듣고 근거를 나누도록 토의·토론 구조와 상호작용 촉진 전략을 익히는 데 적합합니다.",
  독서:
    "독서 활동을 질문·대화·협동학습으로 확장해 공감과 의사소통을 촉진하는 수업 방법을 탐색할 수 있습니다.",
  공감:
    "학생의 감정과 관점을 이해하고 공감적 상담과 관계 회복으로 연결하는 교사 대화 역량을 키울 수 있습니다.",
  소통:
    "교실 대화, 학부모 상담, 학생 상호작용 등 교육공동체 안에서 필요한 의사소통 방법을 폭넓게 살펴볼 수 있습니다.",
  협력:
    "협동학습과 공동 문제해결을 통해 학생 간 상호작용과 책임 있는 참여를 촉진하는 방법을 찾을 수 있습니다.",
  체육:
    "신체활동을 통해 건강 습관, 협력, 규칙 존중을 함께 기르는 전인적 성장 지도와 직접 연결됩니다.",
  놀이:
    "놀이 속 자율성·관계·문제해결 경험을 학급 운영과 수업에 활용하는 구체적인 방법을 찾을 수 있습니다.",
  인성:
    "생활 속 실천을 중심으로 존중, 책임, 배려와 같은 가치가 행동으로 이어지도록 지도하는 데 도움이 됩니다.",
  건강:
    "신체·정서 건강과 안전한 생활습관을 함께 다루는 활동을 통해 학생의 균형 있는 성장을 지원할 수 있습니다.",
  도덕:
    "가치 판단과 생활 속 실천을 연결해 존중·책임·배려를 행동으로 이어 가는 지도 방법을 탐색할 수 있습니다.",
};

const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabasePublishableKey =
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "";

export async function callServerSupabaseRpc<T>(
  functionName: string,
  body: Record<string, unknown>,
): Promise<T> {
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/${functionName}`,
    {
      method: "POST",
      headers: {
        apikey: supabasePublishableKey,
        Authorization: `Bearer ${supabasePublishableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`SUPABASE_RPC_FAILED:${await response.text()}`);
  }
  return response.json() as Promise<T>;
}

export function isPeriod(value: unknown): value is Period {
  return value === "april" || value === "october" || value === "january";
}

export function isSessionToken(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

export function contextErrorStatus(error?: RecommendationContext["error"]) {
  if (error === "SESSION_EXPIRED") return 401;
  if (error === "ASSESSMENT_NOT_FOUND") return 404;
  return 400;
}

export async function loadRecommendationContext(
  sessionToken: string,
  period: Period,
) {
  return callServerSupabaseRpc<RecommendationContext>(
    "recommendation_context",
    {
      p_token: sessionToken,
      p_period: period,
    },
  );
}

export async function saveRecommendations(
  sessionToken: string,
  context: RecommendationContext,
  kind: "training" | "books",
  items: TrainingRecommendation[] | BookRecommendation[],
) {
  return callServerSupabaseRpc<{ success: boolean; error?: string }>(
    "recommendation_save",
    {
      p_token: sessionToken,
      p_period: context.period,
      p_assessment_submitted_at: context.assessment_submitted_at,
      p_weakest_dimension: context.weakest_dimension,
      p_weakest_score: context.weakest_score,
      p_kind: kind,
      p_items: items,
    },
  );
}

export function makeTrainingRecommendations(
  dimension: CompetencyId,
): TrainingRecommendation[] {
  const config = competencyRecommendations[dimension];
  return config.trainingKeywords.map((keyword) => ({
    title: `${keyword} 관련 연수 과정 검색`,
    keyword,
    provider: "대전교육연수원",
    reason: `‘${keyword}’는 ${config.label} 진단에서 확인한 ${config.bookFocus}의 보완과 직접 연결되는 주제입니다. ${trainingKeywordInsights[keyword]} 대전교육연수원에서는 긴 문장보다 이 핵심어로 검색한 뒤 대상·시간·직무 관련성을 비교하는 방식이 효율적입니다.`,
    searchUrl: makeTetiCourseSearchUrl(keyword),
    detailUrl: makeTetiCourseSearchUrl(keyword),
    status: "과정 검색",
  }));
}

const TETI_ORIGIN = "https://www.teti.kr";
const TETI_COURSE_LIST_URL = `${TETI_ORIGIN}/homepage/educourse/eduCourseList.do`;
const TETI_CACHE_MS = 1000 * 60 * 30;

type TetiCourse = {
  id: string;
  title: string;
  courseType: string;
  applicationPeriod?: string;
  educationPeriod?: string;
  target?: string;
  status: string;
};

const tetiCourseCache = new Map<
  string,
  { expiresAt: number; courses: TetiCourse[] }
>();

function decodeHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, decimal: string) =>
      String.fromCodePoint(Number.parseInt(decimal, 10)),
    )
    .replace(/\s+/g, " ")
    .trim();
}

function findInfo(card: string, label: string) {
  const match = card.match(
    new RegExp(
      `<p[^>]*class="[^"]*info[^"]*"[^>]*>[\\s\\S]*?<i>[\\s\\S]*?${label}[\\s\\S]*?</i>([\\s\\S]*?)</p>`,
      "i",
    ),
  );
  return match ? decodeHtml(match[1]) : undefined;
}

function parseTetiCourses(html: string) {
  const cards = html.match(
    /<li[^>]*class="[^"]*sub_list_card_wrap_2[^"]*"[^>]*>[\s\S]*?<\/li>/gi,
  );
  if (!cards) return [];

  const seen = new Set<string>();
  const courses: TetiCourse[] = [];
  for (const card of cards) {
    const id = card.match(/fnAtnlcAplyDetail\('([^']+)'\)/)?.[1];
    const titleMarkup = card.match(
      /class="title"[^>]*>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i,
    )?.[1];
    if (!id || !titleMarkup || seen.has(id)) continue;

    seen.add(id);
    const courseType = decodeHtml(
      card.match(/<p[^>]*class="[^"]*blue[^"]*"[^>]*>([\s\S]*?)<\/p>/i)?.[1] ??
        "",
    );
    const applicationPeriod = findInfo(card, "신청");
    const educationPeriod = findInfo(card, "교육");
    const target = findInfo(card, "대상");
    const status = /btn_learning_apply|신청하기/i.test(card)
      ? "신청 가능"
      : /학습중|교육중/i.test(card)
        ? "운영 중"
        : "운영 과정";

    courses.push({
      id,
      title: decodeHtml(titleMarkup),
      courseType,
      applicationPeriod,
      educationPeriod,
      target,
      status,
    });
  }
  return courses;
}

export function makeTetiCourseSearchUrl(keyword: string) {
  const params = new URLSearchParams({
    srchCrseNm: keyword,
    srchEduTrgtClId: "01",
    srchStatusOrdg: "1",
    srchYear: String(new Date().getFullYear()),
    srchMonth: "0",
    perPage: "100",
  });
  return `${TETI_COURSE_LIST_URL}?${params.toString()}`;
}

function tetiCourseDetailUrl(id: string) {
  return `${TETI_ORIGIN}/lh/ms/ac/atnlcAplyDetailView.do?srchCrseGnrtnId=${encodeURIComponent(id)}`;
}

async function fetchTetiCourses(keyword: string) {
  const cached = tetiCourseCache.get(keyword);
  if (cached && cached.expiresAt > Date.now()) return cached.courses;

  const response = await fetch(makeTetiCourseSearchUrl(keyword), {
    headers: { Accept: "text/html,application/xhtml+xml" },
    next: { revalidate: 1800 },
  });
  if (!response.ok) throw new Error(`TETI_FETCH_FAILED:${response.status}`);

  const courses = parseTetiCourses(await response.text());
  tetiCourseCache.set(keyword, {
    courses,
    expiresAt: Date.now() + TETI_CACHE_MS,
  });
  return courses;
}

const courseRelevanceSignals: Record<CompetencyId, string[]> = {
  learning: ["수업", "학습", "평가", "교육과정", "교과", "질문", "피드백"],
  guidance: ["생활", "학급", "상담", "학교폭력", "인성", "관계", "존중", "배려", "안전"],
  professional: ["교사", "연구", "공동체", "교육과정", "수업", "전문성", "자료"],
  smart: ["인공지능", "ai", "디지털", "에듀테크", "데이터", "소프트웨어"],
  culture: ["예술", "문화", "미술", "음악", "진로", "창의", "표현"],
  empathy: ["상담", "소통", "토론", "독서", "협력", "관계", "공감", "회복"],
  whole: ["체육", "놀이", "인성", "도덕", "건강", "성장", "스포츠"],
};

const coreCourseSignals: Partial<Record<CompetencyId, string[]>> = {
  learning: ["수업", "평가", "교육과정"],
  guidance: ["생활", "학급", "상담", "학교폭력", "인성"],
  professional: ["교사", "연구", "공동체", "전문성"],
  smart: ["인공지능", "ai", "디지털", "에듀테크"],
  culture: ["예술", "미술", "음악", "진로"],
  empathy: ["상담", "소통", "토론", "독서", "공감"],
  whole: ["체육", "놀이", "인성", "도덕"],
};

const unrelatedCourseSignals = [
  "산업", "시설", "청소", "채용", "근로", "관리감독", "직원", "공무원", "법정의무",
];

function relevanceScore(
  course: TetiCourse,
  keyword: string,
  dimension: CompetencyId,
) {
  const text = `${course.title} ${course.courseType} ${course.target ?? ""}`.toLowerCase();
  const normalizedKeyword = keyword.toLowerCase();
  const keywordScore = text.includes(normalizedKeyword) ? 90 : 0;
  const signalScore = courseRelevanceSignals[dimension].reduce(
    (score, signal) =>
      score +
      (text.includes(signal)
        ? coreCourseSignals[dimension]?.includes(signal)
          ? 95
          : 35
        : 0),
    0,
  );
  const elementaryScore = text.includes("초등") ? 55 : text.includes("교원") ? 25 : 0;
  const schoolLevelPenalty = /유치원|중등/.test(text) ? 90 : 0;
  const unrelatedPenalty = unrelatedCourseSignals.reduce(
    (score, signal) => score + (text.includes(signal) ? 150 : 0),
    0,
  );
  const statusScore = course.status === "신청 가능" ? 30 : course.status === "운영 중" ? 20 : 10;
  return (
    keywordScore +
    signalScore +
    elementaryScore +
    statusScore -
    unrelatedPenalty -
    schoolLevelPenalty
  );
}

export async function findLiveTrainingRecommendations(
  dimension: CompetencyId,
): Promise<TrainingRecommendation[]> {
  const config = competencyRecommendations[dimension];
  const results = await Promise.allSettled(
    config.trainingKeywords.map(async (keyword) => ({
      keyword,
      courses: await fetchTetiCourses(keyword),
    })),
  );

  const candidates = results.flatMap((result) =>
    result.status === "fulfilled"
      ? result.value.courses.map((course) => ({
          ...course,
          keyword: result.value.keyword,
        }))
      : [],
  );
  const unique = new Map<string, (typeof candidates)[number]>();
  for (const candidate of candidates) {
    const current = unique.get(candidate.id);
    if (
      !current ||
      relevanceScore(candidate, candidate.keyword, dimension) >
        relevanceScore(current, current.keyword, dimension)
    ) {
      unique.set(candidate.id, candidate);
    }
  }

  return Array.from(unique.values())
    .sort(
      (left, right) =>
        relevanceScore(right, right.keyword, dimension) -
          relevanceScore(left, left.keyword, dimension) ||
        left.title.localeCompare(right.title, "ko"),
    )
    .slice(0, 5)
    .map((course) => ({
      title: course.title,
      keyword: course.keyword,
      provider: "대전교육연수원" as const,
      status: course.status,
      applicationPeriod: course.applicationPeriod,
      educationPeriod: course.educationPeriod,
      target: course.target,
      detailUrl: tetiCourseDetailUrl(course.id),
      searchUrl: makeTetiCourseSearchUrl(course.keyword),
      reason: `대전교육연수원 과정 목록에서 ‘${course.keyword}’ 주제로 확인된 ${course.status} 과정입니다. ${config.label}의 ${config.bookFocus} 보완과 맞닿아 있으며, 과정명에 포함된 핵심 내용과 교원 대상 정보를 기준으로 우선 추천했습니다.`,
    }));
}

export function makeBookSearchLinks(title: string, authors: string[]) {
  const query = [title, authors[0]].filter(Boolean).join(" ");
  const encoded = encodeURIComponent(query);
  return {
    kyoboUrl: `https://search.kyobobook.co.kr/search?keyword=${encoded}`,
    youngpoongUrl: `https://www.ypbooks.co.kr/search/total?word=${encoded}`,
    naverUrl: `https://search.naver.com/search.naver?query=${encodeURIComponent(`${query} 책`)}`,
  };
}

export async function sha256(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
