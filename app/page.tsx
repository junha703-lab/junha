"use client";

import { useEffect, useMemo, useState } from "react";

type Period = "october" | "january";
type Dimension = {
  id: string;
  label: string;
  short: string;
  color: string;
  items: string[];
};
type RadarSkill = Dimension & { value: number };
type AnswersByPeriod = Record<Period, Record<string, number>>;

const dimensions: Dimension[] = [
  {
    id: "learning",
    label: "학습지도 역량",
    short: "학습지도",
    color: "#e86a33",
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
    color: "#f1b64a",
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
    short: "전문성 개발",
    color: "#71a981",
    items: [
      "교사 연구회 혹은 연구 모임에 적극적으로 참여하여 새롭게 학습한 지식이나 경험을 수업과 생활지도에 적극적으로 반영하는가?",
      "다양한 교사 연수에 적극적으로 참여하여 급변하는 교육환경 변화에 맞춰 교육 자료를 재구성하는가?",
    ],
  },
  {
    id: "smart",
    label: "미래스마트형 역량",
    short: "미래스마트",
    color: "#4d8db5",
    items: [
      "학생 특성과 요구에 적합한 수업자료 및 매체(에듀테크, AI 등)를 적극적으로 활용하는가?",
    ],
  },
  {
    id: "culture",
    label: "예술문화형 역량",
    short: "예술문화",
    color: "#7568ae",
    items: [
      "학생의 적성과 특기를 고려하여 예술·문화·진로 및 창의적인 표현 활동의 기회를 제공하는가?",
    ],
  },
  {
    id: "empathy",
    label: "소통공감형 역량",
    short: "소통공감",
    color: "#d4779b",
    items: [
      "독서, 토의·토론, 협동학습 등으로 상호작용을 촉진하고, 공감적 상담을 통해 학생의 당면 문제를 원만히 지원하는가?",
    ],
  },
  {
    id: "whole",
    label: "전인적 성장 역량",
    short: "전인적 성장",
    color: "#8b9b63",
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

function blankAnswers() {
  return Object.fromEntries(
    dimensions.flatMap((dimension) =>
      dimension.items.map((_, index) => [`${dimension.id}-${index}`, 0]),
    ),
  );
}

function blankPeriods(): AnswersByPeriod {
  return { october: blankAnswers(), january: blankAnswers() };
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

function Radar({
  skills,
  comparison,
}: {
  skills: RadarSkill[];
  comparison?: RadarSkill[];
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
        {comparison && (
          <polygon
            points={radarPoints(comparison.map((skill) => skill.value))}
            className="comparison-line"
          />
        )}
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

function downloadRadarPng(skills: RadarSkill[], comparison?: RadarSkill[]) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 900;
  const context = canvas.getContext("2d");
  if (!context) return;

  context.fillStyle = "#fbfaf6";
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
    drawPolygon(skills.map(() => ring), "transparent", "#dce3dc", 1),
  );
  skills.forEach((_, index) => {
    const [x, y] = point(5, index);
    context.beginPath();
    context.moveTo(centerX, centerY);
    context.lineTo(x, y);
    context.strokeStyle = "#e5e9e2";
    context.lineWidth = 1;
    context.stroke();
  });
  if (comparison) {
    drawPolygon(
      comparison.map((skill) => skill.value),
      "rgba(150,160,155,.13)",
      "#aeb8b1",
      3,
      [8, 7],
    );
  }
  drawPolygon(
    skills.map((skill) => skill.value),
    "rgba(232,106,51,.18)",
    "#e86a33",
    4,
  );
  skills.forEach((skill, index) => {
    const [x, y] = point(skill.value, index);
    context.beginPath();
    context.arc(x, y, 7, 0, Math.PI * 2);
    context.fillStyle = "#fff";
    context.fill();
    context.strokeStyle = "#e86a33";
    context.lineWidth = 3;
    context.stroke();
    const [labelX, labelY] = point(5.85, index);
    context.fillStyle = "#53615d";
    context.font = "22px Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(skill.short, labelX, labelY);
  });
  context.fillStyle = "#253b3a";
  context.font = "700 28px Arial";
  context.textAlign = "left";
  context.fillText(
    comparison ? "1월 역량 지도 · 10월 비교" : "10월 역량 지도",
    55,
    65,
  );
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = comparison
      ? "1월-역량지도-10월비교.png"
      : "10월-역량지도.png";
    link.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

export default function Home() {
  const [authReady, setAuthReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [teacherName, setTeacherName] = useState("");
  const [pin, setPin] = useState("");
  const [loginError, setLoginError] = useState("");
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [activePeriod, setActivePeriod] = useState<Period>("october");
  const [openDimension, setOpenDimension] = useState("learning");
  const [answersByPeriod, setAnswersByPeriod] =
    useState<AnswersByPeriod>(blankPeriods);

  useEffect(() => {
    const savedName = sessionStorage.getItem("competency-auth");
    if (savedName) {
      setAuthenticated(true);
      setTeacherName(savedName);
      const savedAnswers = localStorage.getItem(
        `competency-period-answers:${savedName}`,
      );
      if (savedAnswers) {
        try {
          setAnswersByPeriod(JSON.parse(savedAnswers));
        } catch {
          setAnswersByPeriod(blankPeriods());
        }
      }
    }
    setAuthReady(true);
  }, []);

  useEffect(() => {
    if (authReady && authenticated && teacherName.trim()) {
      localStorage.setItem(
        `competency-period-answers:${teacherName.trim()}`,
        JSON.stringify(answersByPeriod),
      );
    }
  }, [answersByPeriod, authReady, authenticated, teacherName]);

  const answers = answersByPeriod[activePeriod];
  const skills = useMemo(() => makeSkills(answers), [answers]);
  const comparisonSkills = useMemo(
    () =>
      activePeriod === "january"
        ? makeSkills(answersByPeriod.october)
        : undefined,
    [activePeriod, answersByPeriod.october],
  );
  const responded = Object.values(answers).filter(Boolean).length;
  const total = Object.keys(answers).length;

  function enter(event: React.FormEvent) {
    event.preventDefault();
    const name = teacherName.trim();
    if (!name) {
      setLoginError("이름을 입력해 주세요.");
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setLoginError("비밀번호는 숫자 4자리로 입력해 주세요.");
      return;
    }
    const savedAnswers = localStorage.getItem(
      `competency-period-answers:${name}`,
    );
    if (savedAnswers) {
      try {
        setAnswersByPeriod(JSON.parse(savedAnswers));
      } catch {
        setAnswersByPeriod(blankPeriods());
      }
    }
    sessionStorage.setItem("competency-auth", name);
    setTeacherName(name);
    setAuthenticated(true);
    setLoginError("");
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
    if (!teacherName.trim() || !SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      setSaveState("error");
      return;
    }
    setSaveState("saving");
    const averages = Object.fromEntries(
      skills.map((skill) => [skill.id, Number(skill.value.toFixed(2))]),
    );
    const payload = {
      teacher_name: teacherName.trim(),
      period: activePeriod,
      learning: averages.learning,
      guidance: averages.guidance,
      professional: averages.professional,
      smart: averages.smart,
      culture: averages.culture,
      empathy: averages.empathy,
      whole: averages.whole,
      answers,
    };

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/assessments`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(await response.text());
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  if (!authReady) return <div className="auth-loading" />;

  if (!authenticated) {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <div className="brand-mark">+</div>
          <div className="brand auth-brand">역량지도</div>
          <p className="auth-eyebrow">TEACHER GROWTH PROFILE</p>
          <h1>
            교원 역량 기록에
            <br />
            <em>입장해 주세요</em>
          </h1>
          <p className="auth-copy">
            이름과 숫자 4자리 비밀번호를 입력하면
            <br />
            나의 문항 기반 성장 기록을 시작할 수 있습니다.
          </p>
          <form onSubmit={enter} className="auth-form">
            <label>
              이름
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
                maxLength={4}
                type="password"
                value={pin}
                onChange={(event) =>
                  setPin(event.target.value.replace(/\D/g, ""))
                }
                placeholder="숫자 4자리"
              />
            </label>
            {loginError && <p className="login-error">{loginError}</p>}
            <button type="submit" className="enter-button">
              평가 시작하기 <span>→</span>
            </button>
          </form>
          <small>
            이름은 평가 기록의 식별 정보로 사용되며 비밀번호는 저장되지
            않습니다.
          </small>
        </div>
      </main>
    );
  }

  return (
    <main>
      <header className="topbar">
        <div className="brand-mark">+</div>
        <div className="brand">역량지도</div>
        <div className="brand-sub">교원용 성장 기록 도구</div>
        <div className="top-actions">
          <button className="ghost-button" onClick={() => window.print()}>
            인쇄하기 <span>↗</span>
          </button>
          <button className="profile-button">{teacherName}</button>
        </div>
      </header>
      <section className="hero">
        <div>
          <div className="eyebrow">
            MY GROWTH PROFILE <span>●</span>
          </div>
          <h1>
            문항으로 돌아보고,
            <br />
            <em>성장 방향을 읽기</em>
          </h1>
          <p>
            각 문항을 5점 리커트 척도로 체크하면
            <br />
            영역별 응답 평균이 7각형으로 나타납니다.
          </p>
        </div>
        <div className="hero-note">
          <span className="note-line" />
          {activePeriod === "october" ? "10월 평가" : "1월 평가"}
          <br />
          <strong>
            {responded} / {total} 문항 응답
          </strong>
        </div>
      </section>

      <section className="workspace">
        <aside className="input-panel questionnaire">
          <div className="period-tabs" role="tablist">
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
            01 <span>CHECKLIST</span>
          </div>
          <h2>
            {activePeriod === "october" ? "10월 역량 문항" : "1월 역량 문항"}
          </h2>
          <p className="muted">각 문항에 가장 가까운 응답을 선택하세요.</p>
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
            ↻ {activePeriod === "october" ? "10월" : "1월"} 응답 초기화
          </button>
          <button
            className="sheet-button"
            onClick={saveToSupabase}
            disabled={saveState === "saving"}
          >
            {saveState === "saving"
              ? "평가 기록 저장 중..."
              : "평가 기록 저장하기 ↗"}
          </button>
          {saveState === "saved" && (
            <p className="save-message success">
              Supabase에 평가 기록이 저장되었습니다.
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
            02 <span>VISUALIZE</span>
          </div>
          <div className="chart-head">
            <div>
              <h2>{activePeriod === "october" ? "10월" : "1월"} 역량 지도</h2>
              <p className="muted">
                문항 평균을 5점 척도의 7각형 그래프로 표시합니다.
              </p>
            </div>
            <button
              className="png-button"
              onClick={() => downloadRadarPng(skills, comparisonSkills)}
            >
              PNG로 받기 ↓
            </button>
          </div>
          {activePeriod === "january" && (
            <p className="comparison-note">
              <i />
              10월 평가를 연한 배경으로 표시해 성장 변화를 비교합니다.
            </p>
          )}
          <Radar skills={skills} comparison={comparisonSkills} />
          <div className="graph-caption">
            <span className="color-dot" style={{ background: "#e86a33" }} />
            현재 {activePeriod === "october" ? "10월" : "1월"} 역량 지도
            {activePeriod === "january" && (
              <>
                <span className="compare-chip" />
                10월 비교
              </>
            )}
          </div>
          <div className="legend-grid">
            {skills.map((skill) => (
              <span key={skill.id}>
                <i className="color-dot" style={{ background: skill.color }} />
                {skill.short}
              </span>
            ))}
          </div>
        </section>
      </section>
      <footer>
        <span>역량지도 · 교원의 성장을 기록하고 연결합니다.</span>
        <span>10월·1월 평가를 각각 따로 기록할 수 있습니다.</span>
      </footer>
    </main>
  );
}

