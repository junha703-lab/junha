"use client";

import { useEffect, useMemo, useState } from "react";

type Period = "october" | "january";
type Dimension = { id: string; label: string; short: string; color: string; items: string[] };

const dimensions: Dimension[] = [
  { id: "learning", label: "?숈뒿吏????웾", short: "?숈뒿吏??, color: "#e86a33", items: ["?섏뾽援먯옱 ?곌뎄瑜?異⑹떎???섎뒗媛?", "?숈깮 ?섏????곹빀???섏뾽怨꾪쉷???섎┰?섎뒗媛?", "?숈깮???λ젰怨??섏????곹빀??吏덈Ц???쒖떆?섎뒗媛?", "?숈깮?ㅼ쓣 ?숈뒿?쒕룞?대굹 怨쇱젣 ?섑뻾???곸젅??李몄뿬?쒗궎?붽??", "?숈깮???댄빐?꾩? 李몄뿬?꾨? ?섏떆濡??먭??섎뒗媛?", "?됯? 寃곌낵瑜??섏뾽媛쒖꽑???꾪븳 ?먮즺濡??곴레 ?쒖슜?섎뒗媛?"] },
  { id: "guidance", label: "?앺솢吏????웾", short: "?앺솢吏??, color: "#f1b64a", items: ["?숈깮 媛쒓컻?몄쓽 ?뱀꽦???뚯븙?섍린 ?꾪븯???몃젰?섎뒗媛?", "?숈깮?ㅼ씠 ?숆툒?먯꽌 移쒓뎄?ㅺ낵 ???댁슱???앺솢?섎룄濡?吏?꾪븯?붽??", "?덉쟾?ш퀬 諛??숆탳??젰???덈갑?섍린 ?꾪븳 援먯쑁???ㅼ떆?섎뒗媛?", "?숈깮?ㅼ씠 ?щ컮瑜?湲곕낯?앺솢?듦???湲곕Ⅴ?꾨줉 吏?꾪븯?붽??"] },
  { id: "professional", label: "?꾨Ц??媛쒕컻 ??웾", short: "?꾨Ц??媛쒕컻", color: "#71a981", items: ["援먯궗 ?곌뎄???뱀? ?곌뎄 紐⑥엫???곴레?곸쑝濡?李몄뿬?섏뿬 ?덈∼寃??숈뒿??吏?앹씠??寃쏀뿕???섏뾽怨??앺솢吏?꾩뿉 諛섏쁺?섎뒗媛?", "?ㅼ뼇??援먯궗 ?곗닔???곴레?곸쑝濡?李몄뿬?섏뿬 援먯쑁?섍꼍 蹂?붿뿉 留욎떠 援먯쑁 ?먮즺瑜??ш뎄?깊븯?붽??"] },
  { id: "smart", label: "誘몃옒?ㅻ쭏?명삎 ??웾", short: "誘몃옒?ㅻ쭏??, color: "#4d8db5", items: ["?숈깮 ?뱀꽦怨??붽뎄???곹빀???섏뾽?먮즺 諛?留ㅼ껜(?먮??뚰겕, AI ??瑜??곴레?곸쑝濡??쒖슜?섎뒗媛?"] },
  { id: "culture", label: "?덉닠臾명솕????웾", short: "?덉닠臾명솕", color: "#7568ae", items: ["?숈깮???곸꽦怨??밴린瑜?怨좊젮?섏뿬 ?덉닠쨌臾명솕쨌吏꾨줈 諛?李쎌쓽?곸씤 ?쒗쁽 ?쒕룞??湲고쉶瑜??쒓났?섎뒗媛?"] },
  { id: "empathy", label: "?뚰넻怨듦컧????웾", short: "?뚰넻怨듦컧", color: "#d4779b", items: ["?낆꽌, ?좎쓽쨌?좊줎, ?묐룞?숈뒿 ?깆쑝濡??곹샇?묒슜??珥됱쭊?섍퀬, 怨듦컧???곷떞???듯빐 ?숈깮???밸㈃ 臾몄젣瑜?吏?먰븯?붽??"] },
  { id: "whole", label: "?꾩씤???깆옣 ??웾", short: "?꾩씤???깆옣", color: "#8b9b63", items: ["泥댁쑁, ??????ㅼ뼇???쒕룞??諛뷀깢?쇰줈 嫄댁쟾??媛移섍?怨??꾨뜒?깆쓣 媛뽰텣 ?꾩씤???깆옣??吏?꾪븯?붽??"] },
];

const likertLabels = ["?꾪? 洹몃젃吏 ?딅떎", "洹몃젃吏 ?딅떎", "蹂댄넻?대떎", "洹몃젃??, "留ㅼ슦 洹몃젃??];
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const blankAnswers = () => Object.fromEntries(dimensions.flatMap((dimension) => dimension.items.map((_, index) => [`${dimension.id}-${index}`, 0])));
const radarPoints = (values: number[], radius = 42) => values.map((value, index) => { const angle = -Math.PI / 2 + (Math.PI * 2 * index) / values.length; const r = radius * value / 100; return `${50 + Math.cos(angle) * r},${50 + Math.sin(angle) * r}`; }).join(" ");

type RadarSkill = Dimension & { value: number };

function Radar({ skills, comparison }: { skills: RadarSkill[]; comparison?: RadarSkill[] }) {
  const values = skills.map((skill) => skill.value);
  return <div className="radar-wrap" aria-label="7媛?援먯썝 ??웾 ?덉씠??洹몃옒??><svg viewBox="0 0 100 100" role="img">{[20, 40, 60, 80, 100].map((ring) => <polygon key={ring} points={radarPoints(values.map(() => ring))} className="grid-ring" />)}{values.map((_, index) => { const angle = -Math.PI / 2 + (Math.PI * 2 * index) / values.length; return <line key={index} x1="50" y1="50" x2={50 + Math.cos(angle) * 42} y2={50 + Math.sin(angle) * 42} className="grid-line" />; })}{comparison && <polygon points={radarPoints(comparison.map((skill) => skill.value))} className="comparison-line" />}{comparison && <polygon points={radarPoints(comparison.map((skill) => skill.value))} className="comparison-area" />}<polygon points={radarPoints(values.map(() => 100))} className="data-area" /><polygon points={radarPoints(values)} className="data-line" />{values.map((value, index) => { const angle = -Math.PI / 2 + (Math.PI * 2 * index) / values.length; const r = 42 * value / 100; return <circle key={skills[index].id} cx={50 + Math.cos(angle) * r} cy={50 + Math.sin(angle) * r} r="1.65" className="data-dot" />; })}</svg>{skills.map((skill, index) => { const angle = -Math.PI / 2 + (Math.PI * 2 * index) / skills.length; return <div key={skill.id} className="axis-label" style={{ left: `${50 + Math.cos(angle) * 49}%`, top: `${50 + Math.sin(angle) * 49}%` }}>{skill.short}</div>; })}</div>;
}

function makeSkills(answerSet: Record<string, number>): RadarSkill[] {
  return dimensions.map((dimension) => { const scores = dimension.items.map((_, index) => answerSet[`${dimension.id}-${index}`] ?? 0); const average = scores.reduce((sum, score) => sum + score, 0) / scores.length; return { ...dimension, value: average ? average / 5 * 100 : 0 }; });
}

function downloadRadarPng(skills: RadarSkill[], comparison?: RadarSkill[]) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200; canvas.height = 900;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.fillStyle = "#fbfaf6"; context.fillRect(0, 0, canvas.width, canvas.height);
  const centerX = 600; const centerY = 410; const radius = 275;
  const point = (value: number, index: number) => { const angle = -Math.PI / 2 + (Math.PI * 2 * index) / skills.length; const distance = radius * value / 100; return [centerX + Math.cos(angle) * distance, centerY + Math.sin(angle) * distance] as const; };
  const drawPolygon = (values: number[], fill: string, stroke: string, lineWidth: number, dash: number[] = []) => { context.beginPath(); values.forEach((value, index) => { const [x, y] = point(value, index); if (index === 0) context.moveTo(x, y); else context.lineTo(x, y); }); context.closePath(); context.setLineDash(dash); context.fillStyle = fill; context.fill(); context.strokeStyle = stroke; context.lineWidth = lineWidth; context.stroke(); context.setLineDash([]); };
  [20, 40, 60, 80, 100].forEach((ring) => drawPolygon(skills.map(() => ring), "transparent", "#dce3dc", 1));
  skills.forEach((_, index) => { const [x, y] = point(100, index); context.beginPath(); context.moveTo(centerX, centerY); context.lineTo(x, y); context.strokeStyle = "#e5e9e2"; context.lineWidth = 1; context.stroke(); });
  if (comparison) drawPolygon(comparison.map((skill) => skill.value), "rgba(150,160,155,.13)", "#aeb8b1", 3, [8, 7]);
  drawPolygon(skills.map((skill) => skill.value), "rgba(232,106,51,.18)", "#e86a33", 4);
  skills.forEach((skill, index) => { const [x, y] = point(skill.value, index); context.beginPath(); context.arc(x, y, 7, 0, Math.PI * 2); context.fillStyle = "#fff"; context.fill(); context.strokeStyle = "#e86a33"; context.lineWidth = 3; context.stroke(); const [lx, ly] = point(117, index); context.fillStyle = "#53615d"; context.font = "22px Arial"; context.textAlign = "center"; context.textBaseline = "middle"; context.fillText(skill.short, lx, ly); });
  context.fillStyle = "#253b3a"; context.font = "700 28px Arial"; context.textAlign = "left"; context.fillText(comparison ? "1????웾 吏??쨌 10??鍮꾧탳" : "10????웾 吏??, 55, 65);
  canvas.toBlob((blob) => { if (!blob) return; const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = comparison ? "1????웾吏??10?붾퉬援?png" : "10????웾吏??png"; link.click(); URL.revokeObjectURL(url); }, "image/png");
}

export default function Home() {
  const [authReady, setAuthReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [teacherName, setTeacherName] = useState("");
  const [pin, setPin] = useState("");
  const [loginError, setLoginError] = useState("");
  const [recordName, setRecordName] = useState("");
  const [school, setSchool] = useState("");
  const [position, setPosition] = useState("");
  const [memo, setMemo] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [activePeriod, setActivePeriod] = useState<Period>("october");
  const [openDimension, setOpenDimension] = useState("learning");
  const [answersByPeriod, setAnswersByPeriod] = useState<Record<Period, Record<string, number>>>({ october: blankAnswers(), january: blankAnswers() });

  useEffect(() => {
    const savedAuth = sessionStorage.getItem("competency-auth");
    const savedAnswers = localStorage.getItem("competency-period-answers");
    if (savedAuth) { setAuthenticated(true); setTeacherName(savedAuth); setRecordName(savedAuth); }
    if (savedAnswers) { try { setAnswersByPeriod(JSON.parse(savedAnswers)); } catch { /* ignore malformed local data */ } }
    setAuthReady(true);
  }, []);

  useEffect(() => { if (authReady) localStorage.setItem("competency-period-answers", JSON.stringify(answersByPeriod)); }, [answersByPeriod, authReady]);

  const answers = answersByPeriod[activePeriod];
  const skills = useMemo(() => makeSkills(answers), [answers]);
  const comparisonSkills = useMemo(() => activePeriod === "january" ? makeSkills(answersByPeriod.october) : undefined, [activePeriod, answersByPeriod.october]);
  const responded = Object.values(answers).filter(Boolean).length;
  const total = Object.keys(answers).length;

  function enter(event: React.FormEvent) { event.preventDefault(); if (!teacherName.trim()) return setLoginError("?대쫫???낅젰??二쇱꽭??"); if (!/^\d{4}$/.test(pin)) return setLoginError("鍮꾨?踰덊샇???レ옄 4?먮━濡??낅젰??二쇱꽭??"); sessionStorage.setItem("competency-auth", teacherName.trim()); setAuthenticated(true); setLoginError(""); }
  function setAnswer(dimensionId: string, itemIndex: number, score: number) { setAnswersByPeriod((current) => ({ ...current, [activePeriod]: { ...current[activePeriod], [`${dimensionId}-${itemIndex}`]: score } })); }
  function resetPeriod() { setAnswersByPeriod((current) => ({ ...current, [activePeriod]: blankAnswers() })); }
  async function saveToSupabase() {
    if (
      !teacherName.trim() ||
      !SUPABASE_URL ||
      !SUPABASE_PUBLISHABLE_KEY
    ) {
      setSaveState("error");
      return;
    }
    setSaveState("saving");
    const averages = Object.fromEntries(skills.map((skill) => [skill.id, Number((skill.value / 20).toFixed(2))]));
    const payload = {
      teacher_name: teacherName.trim(),
      period: activePeriod,
      ...averages,
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
      if (!response.ok) throw new Error("Supabase insert failed");
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  if (!authReady) return <div className="auth-loading" />;
  if (!authenticated) return <main className="auth-page"><div className="auth-card"><div className="brand-mark">+</div><div className="brand auth-brand">??웾<span>?섏묠諛?/span></div><p className="auth-eyebrow">TEACHER GROWTH PROFILE</p><h1>援먯썝 ??웾 湲곕줉??br /><em>?낆옣??二쇱꽭??/em></h1><p className="auth-copy">?대쫫怨??レ옄 4?먮━ 鍮꾨?踰덊샇瑜??낅젰?섎㈃<br />?섏쓽 臾명빆 湲곕컲 ?깆옣 湲곕줉???쒖옉?????덉뒿?덈떎.</p><form onSubmit={enter} className="auth-form"><label>?대쫫<input autoFocus value={teacherName} onChange={(event) => setTeacherName(event.target.value)} placeholder="?? 源援먯궗" /></label><label>鍮꾨?踰덊샇<input inputMode="numeric" maxLength={4} type="password" value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))} placeholder="?レ옄 4?먮━" /></label>{loginError && <p className="login-error">{loginError}</p>}<button type="submit" className="enter-button">?됯? ?쒖옉?섍린 <span>??/span></button></form><small>?낅젰???뺣낫? ?묐떟? ??釉뚮씪?곗??먮쭔 ??λ맗?덈떎.</small></div></main>;

  return <main><header className="topbar"><div className="brand-mark">+</div><div className="brand">??웾<span>?섏묠諛?/span></div><div className="brand-sub">援먯썝???깆옣 湲곕줉 ?꾧뎄</div><div className="top-actions"><button className="ghost-button" onClick={() => window.print()}>?몄뇙?섍린 <span>??/span></button><button className="profile-button">{teacherName} <span>??/span></button></div></header><section className="hero"><div><div className="eyebrow">MY GROWTH PROFILE <span>??/span></div><h1>臾명빆?쇰줈 ?뚯븘蹂닿퀬,<br /><em>?깆옣 諛⑺뼢???쎄린</em></h1><p>媛?臾명빆??5??由ъ빱??泥숇룄濡?泥댄겕?섎㈃<br />?곸뿭蹂??묐떟 ?됯퇏??7媛곹삎?쇰줈 ?섑??⑸땲??</p></div><div className="hero-note"><span className="note-line" />{activePeriod === "october" ? "10???됯?" : "1???됯?"}<br /><strong>{responded} / {total} 臾명빆 ?묐떟</strong></div></section><section className="workspace"><aside className="input-panel questionnaire"><div className="record-box"><div className="section-kicker">湲곕줉 ?뺣낫 <span>RECORD</span></div><div className="record-grid"><label>?대쫫<input value={recordName} onChange={(event) => setRecordName(event.target.value)} placeholder="?대쫫" /></label><label>?숆탳쨌湲곌?<input value={school} onChange={(event) => setSchool(event.target.value)} placeholder="?숆탳 ?먮뒗 湲곌?紐? /></label><label>吏곸쐞쨌?대떦<input value={position} onChange={(event) => setPosition(event.target.value)} placeholder="?? ?댁엫 / 援?뼱" /></label><label className="record-wide">?됯? 硫붾え<textarea value={memo} onChange={(event) => setMemo(event.target.value)} placeholder="?대쾲 ?됯????④만 硫붾え" rows={2} /></label></div></div><div className="period-tabs" role="tablist"><button role="tab" aria-selected={activePeriod === "october"} className={activePeriod === "october" ? "active" : ""} onClick={() => setActivePeriod("october")}>10???됯? <small>{Object.values(answersByPeriod.october).filter(Boolean).length}/{total}</small></button><button role="tab" aria-selected={activePeriod === "january"} className={activePeriod === "january" ? "active" : ""} onClick={() => setActivePeriod("january")}>1???됯? <small>{Object.values(answersByPeriod.january).filter(Boolean).length}/{total}</small></button></div><div className="section-kicker">01 <span>CHECKLIST</span></div><h2>{activePeriod === "october" ? "10????웾 臾명빆" : "1????웾 臾명빆"}</h2><p className="muted">媛?臾명빆??媛??媛源뚯슫 ?묐떟???좏깮?섏꽭??</p><div className="scale-guide"><span>1</span> ?꾪? 洹몃젃吏 ?딅떎 <i /> <span>5</span> 留ㅼ슦 洹몃젃??/div><div className="dimension-list">{dimensions.map((dimension) => <div className={`dimension-card ${openDimension === dimension.id ? "is-open" : ""}`} key={dimension.id}><button className="dimension-toggle" onClick={() => setOpenDimension(openDimension === dimension.id ? "" : dimension.id)}><span className="color-dot" style={{ background: dimension.color }} /><span>{dimension.label}</span><span className="chevron">??/span></button>{openDimension === dimension.id && <div className="question-list">{dimension.items.map((item, index) => { const key = `${dimension.id}-${index}`; return <div className="question" key={key}><p>{index + 1}. {item}</p><div className="likert" role="radiogroup" aria-label={item}>{[1, 2, 3, 4, 5].map((score) => <label key={score} className={answers[key] === score ? "selected" : ""}><input type="radio" name={`${activePeriod}-${key}`} value={score} checked={answers[key] === score} onChange={() => setAnswer(dimension.id, index, score)} /><span>{score}</span><small>{likertLabels[score - 1]}</small></label>)}</div></div>; })}</div>}</div>)}</div><button className="reset-button" onClick={resetPeriod}>??{activePeriod === "october" ? "10?? : "1??} ?묐떟 珥덇린??/button><button className="sheet-button" onClick={saveToSupabase} disabled={saveState === "saving"}>{saveState === "saving" ? "Supabase?????以?.." : "Supabase??湲곕줉?섍린 ??}</button>{saveState === "saved" && <p className="save-message success">湲곕줉???꾩넚?섏뿀?듬땲??</p>}{saveState === "error" && <p className="save-message error">?대쫫???낅젰?섍굅??Supabase ?곌껐???뺤씤??二쇱꽭??</p>}</aside><section className="chart-panel"><div className="section-kicker">02 <span>VISUALIZE</span></div><div className="chart-head"><div><h2>{activePeriod === "october" ? "10?? : "1??} ??웾 吏??/h2><p className="muted">臾명빆 ?됯퇏??7媛곹삎 洹몃옒?꾨줈留??쒖떆?⑸땲??</p></div><button className="png-button" onClick={() => downloadRadarPng(skills, comparisonSkills)}>PNG濡?諛쏄린 ??/button></div>{activePeriod === "january" && <p className="comparison-note"><i />10???됯?瑜??고븳 諛곌꼍?쇰줈 ?쒖떆???깆옣 蹂?붾? 鍮꾧탳?⑸땲??</p>}<Radar skills={skills} comparison={comparisonSkills} /><div className="graph-caption"><span className="color-dot" style={{ background: "#e86a33" }} /> ?꾩옱 {activePeriod === "october" ? "10?? : "1??} ??웾 吏??activePeriod === "january" && <><span className="compare-chip" />10??鍮꾧탳</>}</div><div className="legend-grid">{skills.map((skill) => <span key={skill.id}><i className="color-dot" style={{ background: skill.color }} />{skill.short}</span>)}</div></section></section><footer><span>??웾?섏묠諛?쨌 援먯썝???깆옣??湲곕줉?섍퀬 ?곌껐?⑸땲??</span><span>10?붋????됯?瑜?媛곴컖 ?곕줈 湲곕줉?????덉뒿?덈떎.</span></footer></main>;
}

