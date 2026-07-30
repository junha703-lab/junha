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
  keyword: string;
  provider: "대전교육연수원";
  reason: string;
  searchUrl: string;
};

export type BookRecommendation = {
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

type CompetencyRecommendationConfig = {
  label: string;
  diagnosis: string;
  trainingKeywords: [string, string, string];
  bookQueries: [string, string, string];
  bookFocus: string;
};

export const TETI_SEARCH_URL =
  "https://www.teti.kr/homepage/search/selectTotalSearchList.do";

export const competencyRecommendations: Record<
  CompetencyId,
  CompetencyRecommendationConfig
> = {
  learning: {
    label: "학습지도",
    diagnosis:
      "교재 연구, 학생 맞춤형 수업 설계, 질문과 참여 촉진, 이해도 점검 및 평가 환류를 중심으로 다음 성장을 설계해 보세요.",
    trainingKeywords: [
      "학생 맞춤형 수업 설계",
      "질문과 학습 참여 촉진",
      "과정중심평가와 수업 개선",
    ],
    bookQueries: ["학생 맞춤형 수업 설계", "교사 질문 수업", "과정중심평가"],
    bookFocus: "수업 설계·질문·평가 환류",
  },
  guidance: {
    label: "생활지도",
    diagnosis:
      "학생 개별 특성 이해, 또래 관계와 학급 공동체, 안전·학교폭력 예방, 기본생활습관 지도를 중심으로 보완해 보세요.",
    trainingKeywords: [
      "학생 이해와 관계 중심 생활지도",
      "학교폭력 및 안전사고 예방",
      "기본생활습관과 학급 공동체",
    ],
    bookQueries: ["관계 중심 생활지도", "학교폭력 예방 교육", "학급 공동체"],
    bookFocus: "학생 이해·관계·안전 생활지도",
  },
  professional: {
    label: "전문성개발",
    diagnosis:
      "교사학습공동체 참여, 새롭게 배운 지식의 수업 적용, 교육환경 변화에 따른 교육자료 재구성을 중심으로 성장해 보세요.",
    trainingKeywords: [
      "교사학습공동체와 수업 나눔",
      "교원 전문성 개발",
      "교육과정 재구성과 교육환경 변화",
    ],
    bookQueries: ["교사학습공동체", "교사 전문성 개발", "교육과정 재구성"],
    bookFocus: "교사학습공동체·전문성·교육과정 재구성",
  },
  smart: {
    label: "C 미래스마트",
    diagnosis:
      "학생 특성과 요구에 맞는 에듀테크·AI 매체 선택과 수업 적용을 중심으로 디지털 수업 역량을 확장해 보세요.",
    trainingKeywords: [
      "에듀테크 활용 맞춤형 수업",
      "교사를 위한 생성형 AI 교육",
      "AI 디지털 수업 설계",
    ],
    bookQueries: ["교사 에듀테크 수업", "교사 생성형 AI", "AI 디지털 수업 설계"],
    bookFocus: "에듀테크·AI 기반 맞춤형 수업",
  },
  culture: {
    label: "A 예술문화",
    diagnosis:
      "학생의 적성과 특기를 살리는 예술·문화·진로 활동과 창의적 표현 기회 설계를 중심으로 보완해 보세요.",
    trainingKeywords: [
      "예술 문화 교육 수업",
      "학생 진로교육과 적성 탐색",
      "창의적 표현활동 지도",
    ],
    bookQueries: ["예술 문화 교육", "학생 진로교육", "창의적 표현 수업"],
    bookFocus: "예술·문화·진로와 창의적 표현",
  },
  empathy: {
    label: "R 공감소통",
    diagnosis:
      "독서·토의·토론·협동학습으로 상호작용을 촉진하고, 공감적 상담으로 학생의 문제를 지원하는 역량을 키워 보세요.",
    trainingKeywords: [
      "공감적 학생 상담",
      "토의 토론 협동학습",
      "독서교육과 의사소통",
    ],
    bookQueries: ["교사 공감 대화 상담", "토의 토론 협동학습", "독서교육 소통"],
    bookFocus: "공감적 상담·토론·협동과 소통",
  },
  whole: {
    label: "E 전인적성장",
    diagnosis:
      "체육·놀이 활동과 인성교육을 바탕으로 건강한 가치관과 도덕성을 갖춘 전인적 성장을 지원해 보세요.",
    trainingKeywords: [
      "체육 놀이 중심 교육",
      "인성교육과 도덕성",
      "전인적 성장과 건강한 가치관",
    ],
    bookQueries: ["체육 놀이 교육", "학교 인성교육", "학생 전인적 성장"],
    bookFocus: "체육·놀이·인성과 전인적 성장",
  },
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
    keyword,
    provider: "대전교육연수원",
    reason: `${config.label} 문항의 핵심인 ‘${keyword}’ 관련 실제 운영 과정을 공식 연수원에서 확인할 수 있는 검색어입니다.`,
    searchUrl: TETI_SEARCH_URL,
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
