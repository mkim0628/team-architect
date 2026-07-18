/**
 * Example: build a starter "Architect 과제" deck / master template (16:9).
 * Run:  node examples/build_deck.js  (writes assets/architect_template.pptx)
 *
 * Standard page order: 1 과제 배경 · 2 과제 필요성 · 3 과제 범위 · 4 과제 개요.
 * Images are left BLANK here; at real generation time give each item an
 * `image` path (found from the web, or a diagram generated locally when the
 * web is unavailable).
 */
const path = require("path");
const A = require("./../lib/architect_deck");

const pptx = A.newDeck();
const OUT = process.argv[2] || path.join(__dirname, "..", "assets", "architect_template.pptx");

// ── 1. 과제 배경 · 3단, 각 단 2개 콘텐츠 + 매칭 이미지 ───────────────────────
A.pageColumns(pptx, {
  title: "과제 배경", page: 1, band: "navy",
  cols: [
    { header: "섹션 헤더 1", items: [
      { text: "핵심 메시지 A" /*, image: "/tmp/bg1a.png" */ },
      { text: "핵심 메시지 B" /*, image: "/tmp/bg1b.png" */ },
    ]},
    { header: "섹션 헤더 2", items: [{ text: "핵심 메시지 A" }, { text: "핵심 메시지 B" }] },
    { header: "섹션 헤더 3", items: [{ text: "핵심 메시지 A" }, { text: "핵심 메시지 B" }] },
  ],
});

// ── 2. 과제 필요성 · 2단, 배경과 동일 포맷 ──────────────────────────────────
A.pageColumns(pptx, {
  title: "과제 필요성", page: 2, band: "navy",
  cols: [
    { header: "필요성 헤더 1", items: [{ text: "핵심 메시지 A" }, { text: "핵심 메시지 B" }] },
    { header: "필요성 헤더 2", items: [{ text: "핵심 메시지 A" }, { text: "핵심 메시지 B" }] },
  ],
});

// ── 3. 과제 범위 · 3단 (텍스트 전용: 목적 / In Scope / Out of Scope) ─────────
A.pageColumns(pptx, {
  title: "과제 범위", page: 3, band: "navy",
  cols: [
    { header: "목적", headerColor: "green", images: false, items: [{ text: ["목적 문장 1", "목적 문장 2"] }] },
    { header: "범위 (In Scope)", images: false, items: [{ text: ["항목 1", "항목 2", "항목 3"] }] },
    { header: "범위 외 (Out of Scope)", images: false, items: [{ text: ["항목 1", "항목 2", "항목 3"] }] },
  ],
});

// ── 4. 과제 개요 · 2단 (좌: 표 / 우: overall architecture — 지시 없으면 공란) ──
A.pageOverview(pptx, {
  title: "과제 개요", page: 4, band: "green",
  table: [
    { label: "과제 명",  lines: [{ text: "과제 제목 (한글)", bullet: false, bold: true }, { text: "(English subtitle)", bullet: false, fontSize: 9, color: "595959" }] },
    { label: "과제 목표", lines: ["목표 문장 1", "목표 문장 2"] },
    { label: "참여 인력", lines: [{ text: "국내: N명", color: A.COLORS.navy, bold: true }, { text: "해외: N명", color: A.COLORS.navy, bold: true }] },
    { label: "일정",      lines: ["YY년 M월 ~ YY년 M월 (총 N개월)"] },
  ],
  // architecture: "/tmp/overall_arch.png",   // 사용자가 명시할 때만
});

A.writeDeck(pptx, OUT).then((f) => console.log("wrote", f));
