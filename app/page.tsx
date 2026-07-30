"use client";

import { useEffect, useMemo, useState } from "react";

type Period = "april" | "october" | "january";
type Dimension = {
  id: string;
  label: string;
  short: string;
  color: string;
  items: string[];
};
type RadarSkill = Dimension & { value: number };
type ComparisonLayer = {
  period: "april" | "october";
  label: string;
  skills: RadarSkill[];
  className: string;
};
type AnswersByPeriod = Record<Period, Record<string, number>>;
type StoredRecord = {
  answers?: Record<string, number>;
  submitted_at?: string;
};
type LoginResponse = {
  success: boolean;
  error?: "INVALID_INPUT" | "INVALID_CREDENTIALS" | "LOGIN_LOCKED";
  created?: boolean;
  teacher_name?: string;
  session_token?: string;
};
type LoadResponse = {
  success: boolean;
  error?: "SESSION_EXPIRED";
  teacher_name?: string;
  is_admin?: boolean;
  records?: Partial<Record<Period, StoredRecord>>;
};
type SaveResponse = {
  success: boolean;
  error?: "SESSION_EXPIRED" | "INVALID_INPUT";
  submitted_at?: string;
};
type AdminAccount = {
  account_id: string;
  teacher_name: string;
  created_at: string;
  records?: Partial<Record<Period, StoredRecord>>;
};
type AdminListResponse = {
  success: boolean;
  error?: "NOT_AUTHORIZED";
  accounts?: AdminAccount[];
};
type AdminDeleteResponse = {
  success: boolean;
  error?: "NOT_AUTHORIZED" | "ACCOUNT_NOT_FOUND";
  deleted_name?: string;
};

const dimensions: Dimension[] = [
  {
    id: "learning",
    label: "학습지도 역량",
    short: "학습지도",
    color: "#e85f5f",
    items: [
      "수업교재 연구를 충실히 하는가?",
      "학생 수준에 적합한 수업계획을 수립하는가?",
      "학생의 능력과 수준에 적합한 질문을 제시하는가?",
      "학생들을 학습활동이나 과제 수행에 적절히 참여시키는가?",
      "학생의 이해도와 참여도를 수시로 점검하는가?",
      "평가 결과를 수업개선을 위한 자료로 적극 활용하는가?",
    ],
  },
  {
    id: "guidance",
    label: "생활지도 역량",
    short: "생활지도",
    color: "#e7ad35",
    items: [
      "학생 개개인의 특성을 파악하기 위하여 노력하는가?",
      "학생들이 학급에서 친구들과 잘 어울려 생활하도록 지도하는가?",
      "안전사고 및 학교폭력을 예방하기 위한 교육을 실시하는가?",
      "학생들이 올바른 기본생활습관(언어, 행동, 예절, 질서 등)을 기르도록 지도하는가?",
    ],
  },
  {
    id: "professional",
    label: "전문성 개발 역량",
    short: "전문성개발",
    color: "#65a966",
    items: [
      "교사 연구회 혹은 연구 모임에 적극적으로 참여하여 새롭게 학습한 지식이나 경험을 수업과 생활지도에 적극적으로 반영하는가?",
      "다양한 교사 연수에 적극적으로 참여하여 급변하는 교육환경 변화에 맞춰 교육 자료를 재구성하는가?",
    ],
  },
  {
    id: "smart",
    label: "미래스마트형 역량",
    short: "C미래스마트",
    color: "#3d75bd",
    items: [
      "학생 특성과 요구에 적합한 수업자료 및 매체(에듀테크, AI 등)를 적극적으로 활용하는가?",
    ],
  },
  {
    id: "culture",
    label: "예술문화형 역량",
    short: "A예술문화",
    color: "#8665b0",
    items: [
      "학생의 적성과 특기를 고려하여 예술·문화·진로 및 창의적인 표현 활동의 기회를 제공하는가?",
    ],
  },
  {
    id: "empathy",
    label: "소통공감형 역량",
    short: "R공감소통",
    color: "#d35e91",
    items: [
      "독서, 토의·토론, 협동학습 등으로 상호작용을 촉진하고, 공감적 상담을 통해 학생의 당면 문제를 원만히 지원하는가?",
    ],
  },
  {
    id: "whole",
    label: "전인적 성장 역량",
    short: "E전인적 성장",
    color: "#2f9e9b",
    items: [
      "체육, 놀이 등 다양한 활동을 바탕으로 건전한 가치관과 도덕성을 갖춘 전인적 성장을 지도하는가?",
    ],
  },
];

const likertLabels = [
  "전혀 그렇지 않다",
  "그렇지 않다",
  "보통이다",
  "그렇다",
  "매우 그렇다",
];
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const SESSION_KEY = "competency-session-token";
const periods: Period[] = ["april", "october", "january"];
const periodLabels: Record<Period, string> = {
  april: "4월",
  october: "10월",
  january: "1월",
};
const careSteps = [
  { letter: "C", label: "역량 설계", className: "care-c" },
  { letter: "A", label: "역량 연수", className: "care-a" },
  { letter: "R", label: "역량 실현", className: "care-r" },
  { letter: "E", label: "역량 변화", className: "care-e" },
];

function blankAnswers() {
  return Object.fromEntries(
    dimensions.flatMap((dimension) =>
      dimension.items.map((_, index) => [`${dimension.id}-${index}`, 0]),
    ),
  );
}

function blankPeriods(): AnswersByPeriod {
  return {
    april: blankAnswers(),
    october: blankAnswers(),
    january: blankAnswers(),
  };
}

function answersFromRecords(
  records?: Partial<Record<Period, StoredRecord>>,
): AnswersByPeriod {
  const next = blankPeriods();
  (["april", "october", "january"] as Period[]).forEach((period) => {
    const saved = records?.[period]?.answers;
    if (saved && typeof saved === "object") {
      next[period] = { ...next[period], ...saved };
    }
  });
  return next;
}

async function callSupabaseRpc<T>(
  functionName: string,
  body: Record<string, unknown>,
): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Supabase environment variables are missing.");
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/rpc/${functionName}`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}

function radarPoints(values: number[], radius = 42) {
  return values
    .map((value, index) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / values.length;
      const distance = radius * (value / 5);
      return `${50 + Math.cos(angle) * distance},${50 + Math.sin(angle) * distance}`;
    })
    .join(" ");
}

function makeSkills(answerSet: Record<string, number>): RadarSkill[] {
  return dimensions.map((dimension) => {
    const scores = dimension.items.map(
      (_, index) => answerSet[`${dimension.id}-${index}`] ?? 0,
    );
    const average =
      scores.reduce((sum, score) => sum + score, 0) / scores.length;
    return { ...dimension, value: average };
  });
}

function comparisonLayersFor(
  period: Period,
  answersByPeriod: AnswersByPeriod,
): ComparisonLayer[] {
  const layers: ComparisonLayer[] = [];
  if (period === "october" || period === "january") {
    layers.push({
      period: "april",
      label: "4월 배경",
      skills: makeSkills(answersByPeriod.april),
      className: "comparison-april",
    });
  }
  if (period === "january") {
    layers.push({
      period: "october",
      label: "10월 배경",
      skills: makeSkills(answersByPeriod.october),
      className: "comparison-october",
    });
  }
  return layers;
}

function Radar({
  skills,
  comparisons,
}: {
  skills: RadarSkill[];
  comparisons: ComparisonLayer[];
}) {
  const values = skills.map((skill) => skill.value);
  return (
    <div className="radar-wrap" aria-label="7개 교원 역량 레이더 그래프">
      <svg viewBox="0 0 100 100" role="img">
        {[1, 2, 3, 4, 5].map((ring) => (
          <polygon
            key={ring}
            points={radarPoints(values.map(() => ring))}
            className="grid-ring"
          />
        ))}
        {values.map((_, index) => {
          const angle = -Math.PI / 2 + (Math.PI * 2 * index) / values.length;
          return (
            <line
              key={index}
              x1="50"
              y1="50"
              x2={50 + Math.cos(angle) * 42}
              y2={50 + Math.sin(angle) * 42}
              className="grid-line"
            />
          );
        })}
        {comparisons.map((comparison) => (
          <polygon
            key={comparison.period}
            points={radarPoints(
              comparison.skills.map((skill) => skill.value),
            )}
            className={`comparison-line ${comparison.className}`}
          />
        ))}
        <polygon points={radarPoints(values.map(() => 5))} className="data-area" />
        <polygon points={radarPoints(values)} className="data-line" />
        {values.map((value, index) => {
          const angle = -Math.PI / 2 + (Math.PI * 2 * index) / values.length;
          const distance = 42 * (value / 5);
          return (
            <circle
              key={skills[index].id}
              cx={50 + Math.cos(angle) * distance}
              cy={50 + Math.sin(angle) * distance}
              r="1.65"
              className="data-dot"
            />
          );
        })}
      </svg>
      {skills.map((skill, index) => {
        const angle = -Math.PI / 2 + (Math.PI * 2 * index) / skills.length;
        return (
          <div
            key={skill.id}
            className="axis-label"
            style={{
              left: `${50 + Math.cos(angle) * 49}%`,
              top: `${50 + Math.sin(angle) * 49}%`,
            }}
          >
            {skill.short}
          </div>
        );
      })}
    </div>
  );
}

function downloadRadarPng(
  skills: RadarSkill[],
  period: Period,
  comparisons: ComparisonLayer[],
  teacherName?: string,
) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 900;
  const context = canvas.getContext("2d");
  if (!context) return;

  context.fillStyle = "#f7fbff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  const centerX = 600;
  const centerY = 410;
  const radius = 275;
  const point = (value: number, index: number) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / skills.length;
    const distance = radius * (value / 5);
    return [
      centerX + Math.cos(angle) * distance,
      centerY + Math.sin(angle) * distance,
    ] as const;
  };
  const drawPolygon = (
    values: number[],
    fill: string,
    stroke: string,
    lineWidth: number,
    dash: number[] = [],
  ) => {
    context.beginPath();
    values.forEach((value, index) => {
      const [x, y] = point(value, index);
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.closePath();
    context.setLineDash(dash);
    context.fillStyle = fill;
    context.fill();
    context.strokeStyle = stroke;
    context.lineWidth = lineWidth;
    context.stroke();
    context.setLineDash([]);
  };

  [1, 2, 3, 4, 5].forEach((ring) =>
    drawPolygon(skills.map(() => ring), "transparent", "#d6e0ee", 1),
  );
  skills.forEach((_, index) => {
    const [x, y] = point(5, index);
    context.beginPath();
    context.moveTo(centerX, centerY);
    context.lineTo(x, y);
    context.strokeStyle = "#e2e9f3";
    context.lineWidth = 1;
    context.stroke();
  });
  comparisons.forEach((comparison) => {
    const isApril = comparison.period === "april";
    drawPolygon(
      comparison.skills.map((skill) => skill.value),
      isApril ? "rgba(116,132,125,.05)" : "rgba(111,139,151,.11)",
      isApril ? "rgba(126,143,135,.55)" : "rgba(94,126,139,.72)",
      isApril ? 2.5 : 3,
      isApril ? [4, 9] : [10, 6],
    );
  });
  drawPolygon(
    skills.map((skill) => skill.value),
      "rgba(38,87,174,.14)",
    "#2657ae",
    4,
  );
  skills.forEach((skill, index) => {
    const [x, y] = point(skill.value, index);
    context.beginPath();
    context.arc(x, y, 7, 0, Math.PI * 2);
    context.fillStyle = "#fff";
    context.fill();
    context.strokeStyle = "#2657ae";
    context.lineWidth = 3;
    context.stroke();
    const [labelX, labelY] = point(5.85, index);
    context.fillStyle = "#46556c";
    context.font = "22px Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(skill.short, labelX, labelY);
  });
  context.fillStyle = "#17366f";
  context.font = "700 28px Arial";
  context.textAlign = "left";
  context.fillText(
    comparisons.length
      ? `${teacherName ? `${teacherName} · ` : ""}${periodLabels[period]} 역량지도 · 성장 비교`
      : `${teacherName ? `${teacherName} · ` : ""}${periodLabels[period]} 역량지도`,
    55,
    65,
  );
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const namePrefix = teacherName ? `${teacherName}-` : "";
    link.download = comparisons.length
      ? `${namePrefix}${periodLabels[period]}-역량지도-성장비교.png`
      : `${namePrefix}${periodLabels[period]}-역량지도.png`;
    link.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

function AdminDashboard({
  accounts,
  state,
  deletingAccountId,
  onRefresh,
  onDelete,
  onLogout,
}: {
  accounts: AdminAccount[];
  state: "loading" | "ready" | "error";
  deletingAccountId: string;
  onRefresh: () => void;
  onDelete: (accountId: string) => Promise<void>;
  onLogout: () => void;
}) {
  return (
    <main className="admin-page">
      <header className="topbar admin-topbar">
        <div className="brand-mark">Y</div>
        <div className="brand">역량지도</div>
        <div className="brand-sub">대전양지초 · 관리자 화면</div>
        <div className="top-actions">
          <button
            className="ghost-button"
            onClick={onRefresh}
            disabled={state === "loading"}
          >
            {state === "loading" ? "불러오는 중…" : "새로고침 ↻"}
          </button>
          <button className="profile-button" onClick={onLogout}>
            양지초 · 로그아웃
          </button>
        </div>
      </header>

      <section className="admin-hero">
        <div>
          <p className="eyebrow">YANGJI CARE ADMIN</p>
          <h1>
            전체 교원의 <em>성장 흐름</em>을
            <br />
            한눈에 살펴보세요
          </h1>
          <p>
            4월·10월·1월 역량지도를 계정별로 확인하고, 필요한 지도를
            PNG 이미지로 저장할 수 있습니다.
          </p>
        </div>
        <div className="admin-summary">
          <strong>{accounts.length}</strong>
          <span>등록 교원 계정</span>
        </div>
      </section>

      <section className="admin-content">
        <div className="admin-guide">
          <div>
            <strong>지도 읽는 방법</strong>
            <span>현재 월은 진하게, 이전 평가는 점선 배경으로 표시됩니다.</span>
          </div>
        </div>

        {state === "error" && (
          <div className="admin-empty error">
            계정 목록을 불러오지 못했습니다. 잠시 후 새로고침해 주세요.
          </div>
        )}
        {state === "loading" && accounts.length === 0 && (
          <div className="admin-empty">교원별 역량지도를 불러오고 있습니다…</div>
        )}
        {state === "ready" && accounts.length === 0 && (
          <div className="admin-empty">등록된 교원 계정이 없습니다.</div>
        )}

        <div className="admin-list">
          {accounts.map((account, accountIndex) => {
            const accountAnswers = answersFromRecords(account.records);
            return (
              <article className="admin-teacher-card" key={account.account_id}>
                <div className="admin-teacher-head">
                  <div className="admin-teacher-name">
                    <span>{String(accountIndex + 1).padStart(2, "0")}</span>
                    <div>
                      <h2>{account.teacher_name}</h2>
                      <p>4월·10월·1월 성장 기록</p>
                    </div>
                  </div>
                  <button
                    className="admin-delete-button"
                    disabled={deletingAccountId === account.account_id}
                    onClick={() => {
                      const confirmed = window.confirm(
                        `${account.teacher_name} 계정과 모든 평가 기록을 삭제할까요?\n삭제한 정보는 복구할 수 없습니다.`,
                      );
                      if (confirmed) void onDelete(account.account_id);
                    }}
                  >
                    {deletingAccountId === account.account_id
                      ? "삭제 중…"
                      : "계정 삭제"}
                  </button>
                </div>

                <div className="admin-period-grid">
                  {periods.map((period) => {
                    const periodSkills = makeSkills(accountAnswers[period]);
                    const comparisons = comparisonLayersFor(
                      period,
                      accountAnswers,
                    );
                    const record = account.records?.[period];
                    return (
                      <section className="admin-period-card" key={period}>
                        <div className="admin-period-head">
                          <div>
                            <h3>{periodLabels[period]} 역량지도</h3>
                            <span
                              className={record ? "submitted" : "not-submitted"}
                            >
                              {record ? "평가 저장됨" : "미제출"}
                            </span>
                          </div>
                          <button
                            className="admin-png-button"
                            onClick={() =>
                              downloadRadarPng(
                                periodSkills,
                                period,
                                comparisons,
                                account.teacher_name,
                              )
                            }
                          >
                            PNG ↓
                          </button>
                        </div>
                        <div className="admin-radar">
                          <Radar
                            skills={periodSkills}
                            comparisons={comparisons}
                          />
                        </div>
                        {comparisons.length > 0 && (
                          <div className="admin-comparison-caption">
                            {comparisons.map((comparison) => (
                              <span key={comparison.period}>
                                <i
                                  className={`compare-chip ${comparison.className}`}
                                />
                                {comparison.label}
                              </span>
                            ))}
                          </div>
                        )}
                      </section>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </section>
      <div className="developer-credit">앱개발자: 연구부장</div>
    </main>
  );
}

export default function Home() {
  const [authReady, setAuthReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminAccounts, setAdminAccounts] = useState<AdminAccount[]>([]);
  const [adminState, setAdminState] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [deletingAccountId, setDeletingAccountId] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [pin, setPin] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginState, setLoginState] = useState<"idle" | "loading">("idle");
  const [sessionToken, setSessionToken] = useState("");
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [activePeriod, setActivePeriod] = useState<Period>("april");
  const [openDimension, setOpenDimension] = useState("learning");
  const [answersByPeriod, setAnswersByPeriod] =
    useState<AnswersByPeriod>(blankPeriods);

  useEffect(() => {
    let cancelled = false;
    const savedToken = localStorage.getItem(SESSION_KEY);

    async function restoreSession() {
      if (!savedToken) {
        if (!cancelled) setAuthReady(true);
        return;
      }

      try {
        const loaded = await callSupabaseRpc<LoadResponse>("teacher_load", {
          p_token: savedToken,
        });
        if (!loaded.success || !loaded.teacher_name) {
          localStorage.removeItem(SESSION_KEY);
          return;
        }
        if (!cancelled) {
          setSessionToken(savedToken);
          setTeacherName(loaded.teacher_name);
          setIsAdmin(Boolean(loaded.is_admin));
          setAnswersByPeriod(answersFromRecords(loaded.records));
          setAuthenticated(true);
          if (loaded.is_admin) {
            await fetchAdminAccounts(savedToken);
          }
        }
      } catch {
        localStorage.removeItem(SESSION_KEY);
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    }

    void restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  async function fetchAdminAccounts(token = sessionToken) {
    if (!token) {
      setAdminState("error");
      return;
    }
    setAdminState("loading");
    try {
      const result = await callSupabaseRpc<AdminListResponse>(
        "admin_list_accounts",
        { p_token: token },
      );
      if (!result.success) {
        if (result.error === "NOT_AUTHORIZED") clearSession();
        throw new Error(result.error ?? "Unable to load admin dashboard.");
      }
      setAdminAccounts(result.accounts ?? []);
      setAdminState("ready");
    } catch {
      setAdminState("error");
    }
  }

  const answers = answersByPeriod[activePeriod];
  const skills = useMemo(() => makeSkills(answers), [answers]);
  const comparisonLayers = useMemo<ComparisonLayer[]>(
    () => comparisonLayersFor(activePeriod, answersByPeriod),
    [activePeriod, answersByPeriod.april, answersByPeriod.october],
  );
  const responded = Object.values(answers).filter(Boolean).length;
  const total = Object.keys(answers).length;

  async function enter(event: React.FormEvent) {
    event.preventDefault();
    const name = teacherName.trim();
    if (!name) {
      setLoginError("이름을 입력해 주세요.");
      return;
    }
    if (!/^\d{3}$/.test(pin)) {
      setLoginError("비밀번호는 숫자 3자리로 입력해 주세요.");
      return;
    }

    setLoginState("loading");
    setLoginError("");
    try {
      const login = await callSupabaseRpc<LoginResponse>("teacher_login", {
        p_name: name,
        p_pin: pin,
      });

      if (!login.success || !login.session_token) {
        if (login.error === "LOGIN_LOCKED") {
          setLoginError(
            "입력 오류가 여러 번 발생했습니다. 15분 후 다시 시도해 주세요.",
          );
        } else if (login.error === "INVALID_CREDENTIALS") {
          setLoginError("이름 또는 비밀번호가 올바르지 않습니다.");
        } else {
          setLoginError("이름과 숫자 3자리 비밀번호를 확인해 주세요.");
        }
        return;
      }

      const loaded = await callSupabaseRpc<LoadResponse>("teacher_load", {
        p_token: login.session_token,
      });
      if (!loaded.success) throw new Error("Unable to load account records.");

      localStorage.setItem(SESSION_KEY, login.session_token);
      setSessionToken(login.session_token);
      setTeacherName(loaded.teacher_name ?? name);
      setIsAdmin(Boolean(loaded.is_admin));
      setAnswersByPeriod(answersFromRecords(loaded.records));
      if (loaded.is_admin) {
        await fetchAdminAccounts(login.session_token);
      }
      setPin("");
      setAuthenticated(true);
    } catch {
      setLoginError("로그인 연결을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoginState("idle");
    }
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
    setAuthenticated(false);
    setIsAdmin(false);
    setAdminAccounts([]);
    setAdminState("loading");
    setDeletingAccountId("");
    setSessionToken("");
    setTeacherName("");
    setPin("");
    setAnswersByPeriod(blankPeriods());
    setSaveState("idle");
  }

  async function logout() {
    const token = sessionToken;
    clearSession();
    if (token) {
      try {
        await callSupabaseRpc<void>("teacher_logout", { p_token: token });
      } catch {
        // The local session is already cleared.
      }
    }
  }

  async function deleteAdminAccount(accountId: string) {
    if (!sessionToken) return;
    setDeletingAccountId(accountId);
    try {
      const result = await callSupabaseRpc<AdminDeleteResponse>(
        "admin_delete_account",
        {
          p_token: sessionToken,
          p_account_id: accountId,
        },
      );
      if (!result.success) {
        if (result.error === "NOT_AUTHORIZED") clearSession();
        throw new Error(result.error ?? "Unable to delete account.");
      }
      setAdminAccounts((current) =>
        current.filter((account) => account.account_id !== accountId),
      );
    } catch {
      window.alert("계정을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setDeletingAccountId("");
    }
  }

  function setAnswer(
    dimensionId: string,
    itemIndex: number,
    score: number,
  ) {
    setAnswersByPeriod((current) => ({
      ...current,
      [activePeriod]: {
        ...current[activePeriod],
        [`${dimensionId}-${itemIndex}`]: score,
      },
    }));
    setSaveState("idle");
  }

  function resetPeriod() {
    setAnswersByPeriod((current) => ({
      ...current,
      [activePeriod]: blankAnswers(),
    }));
    setSaveState("idle");
  }

  async function saveToSupabase() {
    if (!sessionToken) {
      setSaveState("error");
      return;
    }
    setSaveState("saving");
    const averages = Object.fromEntries(
      skills.map((skill) => [skill.id, Number(skill.value.toFixed(2))]),
    );

    try {
      const result = await callSupabaseRpc<SaveResponse>("teacher_save", {
        p_token: sessionToken,
        p_period: activePeriod,
        p_answers: answers,
        p_learning: averages.learning,
        p_guidance: averages.guidance,
        p_professional: averages.professional,
        p_smart: averages.smart,
        p_culture: averages.culture,
        p_empathy: averages.empathy,
        p_whole: averages.whole,
      });
      if (!result.success) {
        if (result.error === "SESSION_EXPIRED") clearSession();
        throw new Error(result.error ?? "Unable to save assessment.");
      }
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  if (!authReady) return <div className="auth-loading" />;

  if (!authenticated) {
    return (
      <main className="auth-page">
        <div className="auth-shell">
          <section className="auth-intro">
            <p className="school-label">대전양지초등학교 · 교원 성장 지원</p>
            <div className="auth-title-row">
              <div className="brand-mark">Y</div>
              <div className="brand auth-brand">역량지도</div>
            </div>
            <p className="auth-eyebrow">YANGJI CARE GROWTH MAP</p>
            <h1>
              나의 역량을 살피고,
              <br />
              <em>성장의 변화를 잇습니다</em>
            </h1>
            <p className="auth-copy">
              맞춤형 CARE 지원 모델에 따라 문항으로 역량을 돌아보고,
              <br />
              4월·10월·1월의 변화를 한눈에 확인하세요.
            </p>
            <div className="care-strip" aria-label="맞춤형 CARE 지원 흐름">
              {careSteps.map((step, index) => (
                <div className={`care-step ${step.className}`} key={step.letter}>
                  <strong>{step.letter}</strong>
                  <span>{step.label}</span>
                  {index < careSteps.length - 1 && <i>→</i>}
                </div>
              ))}
            </div>
            <p className="research-theme">
              맞춤형 CARE 지원 모델 운영을 통한 교원역량개발지원
            </p>
          </section>
          <section className="auth-card">
            <div className="form-number">01</div>
            <p className="form-kicker">나의 성장 기록 불러오기</p>
            <h2>이름과 비밀번호를 입력해 주세요.</h2>
          <form onSubmit={enter} className="auth-form">
            <label>
              성함
              <input
                autoFocus
                value={teacherName}
                onChange={(event) => setTeacherName(event.target.value)}
                placeholder="예: 김교사"
              />
            </label>
            <label>
              비밀번호
              <input
                inputMode="numeric"
                maxLength={3}
                type="password"
                value={pin}
                onChange={(event) =>
                  setPin(event.target.value.replace(/\D/g, ""))
                }
                placeholder="숫자 3자리"
              />
            </label>
            {loginError && <p className="login-error">{loginError}</p>}
            <button
              type="submit"
              className="enter-button"
              disabled={loginState === "loading"}
            >
              {loginState === "loading"
                ? "성장 기록 불러오는 중..."
                : "나의 역량지도 열기"}{" "}
              <span>→</span>
            </button>
          </form>
          <small>
            처음 사용하는 이름은 입력한 비밀번호로 계정이 만들어집니다.
            이후 같은 이름과 비밀번호로 어느 기기에서나 기록을 불러옵니다.
          </small>
          </section>
        </div>
        <div className="developer-credit">앱개발자: 연구부장</div>
      </main>
    );
  }

  if (isAdmin) {
    return (
      <AdminDashboard
        accounts={adminAccounts}
        state={adminState}
        deletingAccountId={deletingAccountId}
        onRefresh={() => void fetchAdminAccounts()}
        onDelete={deleteAdminAccount}
        onLogout={() => void logout()}
      />
    );
  }

  return (
    <main>
      <header className="topbar">
        <div className="brand-mark">Y</div>
        <div className="brand">역량지도</div>
        <div className="brand-sub">대전양지초 · 맞춤형 CARE 교원 성장 기록</div>
        <div className="top-actions">
          <button className="ghost-button" onClick={() => window.print()}>
            인쇄하기 <span>↗</span>
          </button>
          <button
            className="profile-button"
            onClick={logout}
            title="로그아웃"
          >
            {teacherName} · 로그아웃
          </button>
        </div>
      </header>
      <section className="hero">
        <div>
          <div className="eyebrow">
            YANGJI CARE GROWTH MAP <span>●</span>
          </div>
          <h1>
            나의 강점을 발견하고,
            <br />
            <em>다음 성장을 설계하다</em>
          </h1>
          <p>
            5점 척도의 문항으로 역량을 돌아보면
            <br />
            4월부터 1월까지의 성장 변화가 7각형 지도에 이어집니다.
          </p>
        </div>
        <div className="hero-side">
          <div className="care-mini" aria-label="CARE 단계">
            {careSteps.map((step) => (
              <span className={step.className} key={step.letter}>
                <b>{step.letter}</b>
                {step.label}
              </span>
            ))}
          </div>
          <div className="hero-note">
            <span className="note-line" />
            {periodLabels[activePeriod]} 성장 점검
            <br />
            <strong>
              {responded} / {total} 문항 응답
            </strong>
          </div>
        </div>
      </section>

      <section className="workspace">
        <aside className="input-panel questionnaire">
          <div className="period-tabs" role="tablist">
            <button
              role="tab"
              aria-selected={activePeriod === "april"}
              className={activePeriod === "april" ? "active" : ""}
              onClick={() => {
                setActivePeriod("april");
                setSaveState("idle");
              }}
            >
              4월 평가
              <small>
                {Object.values(answersByPeriod.april).filter(Boolean).length}/
                {total}
              </small>
            </button>
            <button
              role="tab"
              aria-selected={activePeriod === "october"}
              className={activePeriod === "october" ? "active" : ""}
              onClick={() => {
                setActivePeriod("october");
                setSaveState("idle");
              }}
            >
              10월 평가
              <small>
                {Object.values(answersByPeriod.october).filter(Boolean).length}/
                {total}
              </small>
            </button>
            <button
              role="tab"
              aria-selected={activePeriod === "january"}
              className={activePeriod === "january" ? "active" : ""}
              onClick={() => {
                setActivePeriod("january");
                setSaveState("idle");
              }}
            >
              1월 평가
              <small>
                {Object.values(answersByPeriod.january).filter(Boolean).length}/
                {total}
              </small>
            </button>
          </div>
          <div className="section-kicker">
            01 <span>CARE CHECK · 역량 돌아보기</span>
          </div>
          <h2>
            {periodLabels[activePeriod]} 성장 점검 문항
          </h2>
          <p className="muted">현재의 나와 가장 가까운 응답을 선택하세요.</p>
          <div className="scale-guide">
            <span>1</span> 전혀 그렇지 않다 <i /> <span>5</span> 매우 그렇다
          </div>
          <div className="dimension-list">
            {dimensions.map((dimension) => (
              <div
                className={`dimension-card ${openDimension === dimension.id ? "is-open" : ""}`}
                key={dimension.id}
              >
                <button
                  className="dimension-toggle"
                  onClick={() =>
                    setOpenDimension(
                      openDimension === dimension.id ? "" : dimension.id,
                    )
                  }
                >
                  <span
                    className="color-dot"
                    style={{ background: dimension.color }}
                  />
                  <span>{dimension.label}</span>
                  <span className="chevron">⌄</span>
                </button>
                {openDimension === dimension.id && (
                  <div className="question-list">
                    {dimension.items.map((item, index) => {
                      const key = `${dimension.id}-${index}`;
                      return (
                        <div className="question" key={key}>
                          <p>
                            {index + 1}. {item}
                          </p>
                          <div
                            className="likert"
                            role="radiogroup"
                            aria-label={item}
                          >
                            {[1, 2, 3, 4, 5].map((score) => (
                              <label
                                key={score}
                                className={answers[key] === score ? "selected" : ""}
                              >
                                <input
                                  type="radio"
                                  name={`${activePeriod}-${key}`}
                                  value={score}
                                  checked={answers[key] === score}
                                  onChange={() =>
                                    setAnswer(dimension.id, index, score)
                                  }
                                />
                                <span>{score}</span>
                                <small>{likertLabels[score - 1]}</small>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
          <button className="reset-button" onClick={resetPeriod}>
            ↻ {periodLabels[activePeriod]} 응답 초기화
          </button>
          <button
            className="sheet-button"
            onClick={saveToSupabase}
            disabled={saveState === "saving"}
          >
            {saveState === "saving"
              ? "성장 기록 저장 중..."
              : "나의 성장 기록 저장하기 ↗"}
          </button>
          {saveState === "saved" && (
            <p className="save-message success">
              평가 기록이 저장되어 다른 기기에서도 불러올 수 있습니다.
            </p>
          )}
          {saveState === "error" && (
            <p className="save-message error">
              저장하지 못했습니다. 잠시 후 다시 시도해 주세요.
            </p>
          )}
        </aside>

        <section className="chart-panel">
          <div className="section-kicker">
            02 <span>GROWTH MAP · 변화 읽기</span>
          </div>
          <div className="chart-head">
            <div>
              <h2>{periodLabels[activePeriod]} 맞춤형 CARE 역량 지도</h2>
              <p className="muted">
                문항 평균을 5점 척도의 7각형 그래프로 표시합니다.
              </p>
            </div>
            <button
              className="png-button"
              onClick={() =>
                downloadRadarPng(skills, activePeriod, comparisonLayers)
              }
            >
              PNG로 받기 ↓
            </button>
          </div>
          {activePeriod !== "april" && (
            <p className="comparison-note">
              <i />
              {activePeriod === "october"
                ? "4월 평가를 가장 연한 점선 배경으로 표시합니다."
                : "4월은 가장 연한 점선, 10월은 중간 음영으로 겹쳐 성장 변화를 비교합니다."}
            </p>
          )}
          <Radar skills={skills} comparisons={comparisonLayers} />
          <div className="graph-caption">
            {comparisonLayers.map((comparison) => (
              <span className="comparison-caption" key={comparison.period}>
                <i className={`compare-chip ${comparison.className}`} />
                {comparison.label}
              </span>
            ))}
            <span className="color-dot" style={{ background: "#2657ae" }} />
            현재 {periodLabels[activePeriod]} 역량 지도
          </div>
        </section>
      </section>
      <footer>
        <span>대전양지초등학교 · 맞춤형 CARE 지원 모델</span>
        <span>C 역량 설계 · A 역량 연수 · R 역량 실현 · E 역량 변화</span>
      </footer>
      <div className="developer-credit">앱개발자: 연구부장</div>
    </main>
  );
}

