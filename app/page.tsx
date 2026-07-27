"use client";

import { useMemo, useState } from "react";

type Skill = { label: string; short: string; value: number; color: string };

const presets: Record<string, Skill[]> = {
  "교사 역량 6각": [
    { label: "수업 설계", short: "수업\n설계", value: 82, color: "#e86a33" },
    { label: "디지털 활용", short: "디지털\n활용", value: 68, color: "#f1b64a" },
    { label: "학생 이해", short: "학생\n이해", value: 76, color: "#71a981" },
    { label: "평가·피드백", short: "평가·\n피드백", value: 61, color: "#4d8db5" },
    { label: "협업·소통", short: "협업·\n소통", value: 88, color: "#7568ae" },
    { label: "성찰·성장", short: "성찰·\n성장", value: 73, color: "#d4779b" },
  ],
  "핵심 역량 5각": [
    { label: "전문성", short: "전문성", value: 84, color: "#e86a33" },
    { label: "수업 혁신", short: "수업\n혁신", value: 68, color: "#f1b64a" },
    { label: "관계 형성", short: "관계\n형성", value: 78, color: "#71a981" },
    { label: "교육 실천", short: "교육\n실천", value: 65, color: "#4d8db5" },
    { label: "자기 계발", short: "자기\n계발", value: 72, color: "#7568ae" },
  ],
};

function points(count: number, values: number[], radius = 42, center = 50) {
  return values.map((value, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / count;
    const r = (radius * value) / 100;
    return `${center + Math.cos(angle) * r},${center + Math.sin(angle) * r}`;
  }).join(" ");
}

function Radar({ skills }: { skills: Skill[] }) {
  const count = skills.length;
  const outer = points(count, skills.map(() => 100));
  const rings = [25, 50, 75, 100];
  return (
    <div className="radar-wrap" aria-label="역량 레이더 그래프">
      <svg viewBox="0 0 100 100" role="img">
        {rings.map((ring) => <polygon key={ring} points={points(count, skills.map(() => ring))} className="grid-ring" />)}
        {skills.map((_, i) => {
          const angle = -Math.PI / 2 + (Math.PI * 2 * i) / count;
          return <line key={i} x1="50" y1="50" x2={50 + Math.cos(angle) * 42} y2={50 + Math.sin(angle) * 42} className="grid-line" />;
        })}
        <polygon points={outer} className="data-area" />
        <polyline points={`${points(count, skills.map((s) => s.value))} ${points(count, [skills[0].value])}`} className="data-line" />
        {skills.map((skill, i) => {
          const angle = -Math.PI / 2 + (Math.PI * 2 * i) / count;
          const r = 42 * skill.value / 100;
          return <circle key={skill.label} cx={50 + Math.cos(angle) * r} cy={50 + Math.sin(angle) * r} r="1.65" className="data-dot" />;
        })}
      </svg>
      {skills.map((skill, i) => {
        const angle = -Math.PI / 2 + (Math.PI * 2 * i) / count;
        const x = 50 + Math.cos(angle) * 49;
        const y = 50 + Math.sin(angle) * 49;
        return <div key={skill.label} className="axis-label" style={{ left: `${x}%`, top: `${y}%` }}>{skill.short.split("\n").map((line) => <span key={line}>{line}</span>)}</div>;
      })}
    </div>
  );
}

export default function Home() {
  const [mode, setMode] = useState<keyof typeof presets>("교사 역량 6각");
  const [skills, setSkills] = useState(presets[mode]);
  const average = Math.round(skills.reduce((sum, skill) => sum + skill.value, 0) / skills.length);
  const top = useMemo(() => [...skills].sort((a, b) => b.value - a.value)[0], [skills]);

  function changeMode(next: keyof typeof presets) {
    setMode(next);
    setSkills(presets[next]);
  }

  function update(index: number, value: string) {
    const next = [...skills];
    next[index] = { ...next[index], value: Math.max(0, Math.min(100, Number(value) || 0)) };
    setSkills(next);
  }

  return (
    <main>
      <header className="topbar"><div className="brand-mark">+</div><div className="brand">역량<span>나침반</span></div><div className="brand-sub">교원용 성장 기록 도구</div><div className="top-actions"><button className="ghost-button" onClick={() => window.print()}>인쇄하기 <span>↗</span></button><button className="icon-button" aria-label="도움말">?</button><button className="profile-button">김교사 <span>⌄</span></button></div></header>
      <section className="hero"><div><div className="eyebrow">MY GROWTH PROFILE <span>●</span></div><h1>나의 교원 역량,<br /><em>한눈에 읽기</em></h1><p>숫자로 기록하고, 다각도로 살펴보세요.<br />작은 변화가 성장의 방향을 만듭니다.</p></div><div className="hero-note"><span className="note-line" />이번 학기 자기 점검<br /><strong>2025 · 2학기</strong></div></section>
      <section className="workspace">
        <aside className="input-panel"><div className="section-kicker">01 <span>INPUT</span></div><h2>역량 점수 입력</h2><p className="muted">각 항목을 0–100점 사이로 입력하세요.</p><div className="segmented"><button className={mode === "교사 역량 6각" ? "active" : ""} onClick={() => changeMode("교사 역량 6각")}>교사 역량 6각</button><button className={mode === "핵심 역량 5각" ? "active" : ""} onClick={() => changeMode("핵심 역량 5각")}>핵심 역량 5각</button></div><div className="input-list">{skills.map((skill, index) => <label className="score-row" key={skill.label}><span className="color-dot" style={{ background: skill.color }} /><span className="score-name">{skill.label}</span><input aria-label={`${skill.label} 점수`} type="number" min="0" max="100" value={skill.value} onChange={(e) => update(index, e.target.value)} /><span className="score-unit">점</span></label>)}</div><button className="reset-button" onClick={() => setSkills(presets[mode])}>↻ 기본값으로 돌아가기</button></aside>
        <section className="chart-panel"><div className="section-kicker">02 <span>VISUALIZE</span></div><div className="chart-head"><div><h2>나의 역량 지도</h2><p className="muted">현재 입력된 점수를 그래프로 확인합니다.</p></div><div className="average"><span>종합 점수</span><strong>{average}</strong><small>/ 100</small></div></div><Radar skills={skills} /><div className="insight"><div className="insight-icon">✦</div><div><strong>지금 가장 빛나는 역량은 ‘{top.label}’</strong><p>{top.value}점으로 가장 높은 점수를 기록했어요. 이 강점을 동료와 나누어 보세요.</p></div></div></section>
      </section>
      <footer><span>역량나침반 · 교원의 성장을 기록하고 연결합니다.</span><span>입력한 데이터는 이 기기에만 저장됩니다.</span></footer>
    </main>
  );
}
