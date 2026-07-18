/**
 * architect_deck.js — reusable generator for the "Architect 과제" slide format.
 *
 * Reproduces the Korean corporate deck style captured in reference/design-tokens.md:
 *   - 16:9 canvas (13.333" x 7.5")
 *   - Full-width title band (navy for content, green for lead/section slides)
 *   - 5-step nav stepper in the top-right, active step highlighted yellow
 *   - Green / navy section-header bars
 *   - Navy label + white content info tables
 *   - Navy diamond bullets, "N / M" page footer
 *
 * Usage:
 *   const A = require("./lib/architect_deck");
 *   const pptx = A.newDeck();
 *   const s = A.slide(pptx, { title: "과제 배경", active: 0, band: "navy", page: 2 });
 *   A.sectionHeader(s, { x: 0.35, y: A.CONTENT_TOP, w: 3, text: "배경", color: "green" });
 *   await pptx.writeFile({ fileName: "out.pptx" });
 */

const PptxGenJS = require("pptxgenjs");
const fs = require("fs");

const PAGE = { w: 13.333, h: 7.5 }; // 16:9. Switch to { w: 10, h: 7.5 } for 4:3.

const COLORS = {
  navy:       "1F3864",
  navyLight:  "2E4C7E",
  green:      "4E7C3A",
  greenDark:  "3C5F2C",
  yellow:     "FFC000",
  grayBox:    "E9E9E9",
  grayBorder: "A6A6A6",
  grayArrow:  "9AA0A6",
  panelFill:  "F5F6F8",
  ink:        "262626",
  white:      "FFFFFF",
  muted:      "7F7F7F",
  // 요구사항/설계 챕터 페이지용 확장 토큰
  cream:      "FFF2CC",   // 선정(selected) 행 하이라이트
  brown:      "843C0C",   // Constraints 태그바 / C-배지
  gray70:     "404040",   // DP 카드 타이틀 배경
  dp: {                    // 설계 Point(DP) 카드 헤더 색
    "DP-01": "00B0F0",     // cyan   — 실행 구조
    "DP-02": "00B050",     // green  — 스케줄링
    "DP-03": "ED7D31",     // orange — 중간 표현
    "DP-04": "E91E8C",     // magenta— HW 정보
    "DP-05": "7030A0",     // purple — 분산 동작
  },
};

const FONT = { head: "Malgun Gothic", body: "Malgun Gothic" };

// Nav-stepper labels. Override by reassigning A.SECTIONS before building.
let SECTIONS = ["과제 개요", "요구사항", "설계", "검증", "결론"];

const BAND_H = 1.0;
const MARGIN = 0.35;
const CONTENT_TOP = BAND_H + 0.18;
const CONTENT_BOTTOM = PAGE.h - 0.45;

function newDeck() {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "ARCH_16x9", width: PAGE.w, height: PAGE.h });
  pptx.layout = "ARCH_16x9";
  pptx.theme = { headFontFace: FONT.head, bodyFontFace: FONT.body };
  return pptx;
}

/**
 * Write the deck AND repackage it into a canonical OPC zip.
 *
 * pptxgenjs's zip writer emits bare directory entries (ppt/, _rels/, …) and
 * does not place [Content_Types].xml first. Real .pptx files have neither
 * trait, and some PowerPoint/OS configurations then refuse the file and treat
 * it as a plain .zip. This rewrites the archive with no directory entries and
 * [Content_Types].xml first. ALWAYS use this instead of pptx.writeFile().
 */
async function writeDeck(pptx, fileName) {
  await pptx.writeFile({ fileName });
  repackClean(fileName);
  return fileName;
}

// Rewrite the archive with Python's zipfile: writes exactly the given entries
// (no auto-created directory entries) with [Content_Types].xml first.
function repackClean(file) {
  const { execFileSync } = require("child_process");
  const py = [
    "import sys, os, zipfile",
    "src=sys.argv[1]; tmp=src+'.tmp'",
    "zin=zipfile.ZipFile(src)",
    "names=[n for n in zin.namelist() if not n.endswith('/')]",
    "names.sort(key=lambda n: (0 if n=='[Content_Types].xml' else 1))",
    "zout=zipfile.ZipFile(tmp,'w',zipfile.ZIP_DEFLATED)",
    "[zout.writestr(n, zin.read(n)) for n in names]",
    "zout.close(); zin.close(); os.replace(tmp, src)",
  ].join("\n");
  execFileSync("python3", ["-c", py, file], { stdio: "ignore" });
}

/** Add a slide and paint the chrome (title band + nav stepper + footer). Returns the slide. */
function slide(pptx, opts) {
  const s = pptx.addSlide();
  chrome(s, opts);
  return s;
}

function chrome(s, opts) {
  const { title, active = 0, band = "navy", page, total = 33 } = opts;
  const bandColor = band === "green" ? COLORS.green : COLORS.navy;

  s.addShape("rect", { x: 0, y: 0, w: PAGE.w, h: BAND_H, fill: { color: bandColor }, line: { type: "none" } });
  s.addText(title, {
    x: MARGIN, y: 0.12, w: 5.0, h: BAND_H - 0.24, margin: 0,
    fontFace: FONT.head, fontSize: 30, bold: true, color: COLORS.white,
    align: "left", valign: "middle",
  });

  const boxW = 0.86, boxH = 0.30, arrowW = 0.17, gap = 0.03, unit = boxW + arrowW + gap;
  const totalW = SECTIONS.length * boxW + (SECTIONS.length - 1) * (arrowW + gap);
  const startX = PAGE.w - MARGIN - totalW;
  const y = (BAND_H - boxH) / 2;
  SECTIONS.forEach((label, i) => {
    const x = startX + i * unit;
    const isActive = i === active;
    s.addShape("rect", {
      x, y, w: boxW, h: boxH,
      fill: { color: isActive ? COLORS.yellow : COLORS.grayBox },
      line: { color: isActive ? COLORS.yellow : COLORS.grayBorder, width: 0.75 },
    });
    s.addText(label, {
      x, y, w: boxW, h: boxH, margin: 0,
      fontFace: FONT.body, fontSize: 9, bold: isActive,
      color: isActive ? COLORS.navy : "595959", align: "center", valign: "middle",
    });
    if (i < SECTIONS.length - 1) {
      s.addShape("chevron", {
        x: x + boxW + gap / 2, y: y + 0.02, w: arrowW, h: boxH - 0.04,
        fill: { color: COLORS.grayArrow }, line: { type: "none" },
      });
    }
  });

  if (page != null) {
    s.addText(`${page} / ${total}`, {
      x: PAGE.w - 1.6, y: PAGE.h - 0.4, w: 1.4, h: 0.28, margin: 0,
      fontFace: FONT.body, fontSize: 10, color: COLORS.muted, align: "right", valign: "middle",
    });
  }
}

/** Colored section-header bar. Returns the y just below the bar. */
function sectionHeader(s, { x, y, w, text, color = "green", h = 0.34, fontSize = 13 }) {
  const c = color === "navy" ? COLORS.navy : COLORS.green;
  s.addShape("rect", { x, y, w, h, fill: { color: c }, line: { type: "none" } });
  s.addText(text, {
    x: x + 0.05, y, w: w - 0.1, h, margin: 0,
    fontFace: FONT.head, fontSize, bold: true, color: COLORS.white, align: "center", valign: "middle",
  });
  return y + h;
}

/**
 * Info table: navy label column + white content column.
 * rows: [{ label, lines: [ "text" | {text, bold, color, fontSize, bullet:false} ] }]
 */
function infoTable(s, { x, y, w, h, labelW = 1.35, rows }) {
  const tRows = rows.map((r) => {
    const runs = r.lines.map((ln) => {
      const o = typeof ln === "string" ? { text: ln } : ln;
      return {
        text: o.text,
        options: {
          bullet: o.bullet === false ? false : { characterCode: "2022", indent: 12 },
          bold: !!o.bold, color: o.color || COLORS.ink,
          fontFace: FONT.body, fontSize: o.fontSize || 11, breakLine: true, paraSpaceAfter: 2,
        },
      };
    });
    return [
      { text: r.label, options: { fill: { color: COLORS.navy }, color: COLORS.white, bold: true, align: "center", valign: "middle", fontFace: FONT.head, fontSize: 11 } },
      { text: runs, options: { fill: { color: COLORS.white }, valign: "middle", align: "left", margin: [3, 6, 3, 6] } },
    ];
  });
  s.addTable(tRows, {
    x, y, w, h, colW: [labelW, w - labelW],
    border: { type: "solid", color: COLORS.grayBorder, pt: 0.75 },
    fontFace: FONT.body, fontSize: 11, valign: "middle", autoPage: false,
  });
}

/**
 * Bulleted list. items: [ "text" | {text, bold, color, level, fontSize} ]
 * level 0 → navy diamond (◆); level 1 → en-dash (–).
 */
function bulletList(s, { x, y, w, h, items, fontSize = 12 }) {
  const runs = items.map((it) => {
    const o = typeof it === "string" ? { text: it } : it;
    return {
      text: o.text,
      options: {
        bullet: o.bullet === false ? false : { characterCode: o.level ? "2013" : "25C6", indent: o.level ? 12 : 14 },
        indentLevel: o.level || 0, bold: !!o.bold, color: o.color || COLORS.ink,
        fontFace: FONT.body, fontSize: o.fontSize || fontSize, breakLine: true, paraSpaceAfter: 6,
      },
    };
  });
  s.addText(runs, { x, y, w, h, valign: "top", align: "left", margin: 0 });
}

/** Compute evenly-spaced column boxes. Returns [{x, w}, ...]. */
function columns(n, { x = MARGIN, w = PAGE.w - 2 * MARGIN, gap = 0.22 } = {}) {
  const colW = (w - gap * (n - 1)) / n;
  return Array.from({ length: n }, (_, i) => ({ x: x + i * (colW + gap), w: colW }));
}

/** Light bordered content box (use for diagrams / grouped content). */
function panel(s, { x, y, w, h, fill = COLORS.panelFill, border = COLORS.grayBorder }) {
  s.addShape("rect", { x, y, w, h, fill: { color: fill }, line: { color: border, width: 1 } });
}

/** Dashed placeholder box with a caption — mark where an image/diagram will go. */
function placeholder(s, { x, y, w, h, label = "[ 이미지 / 다이어그램 ]" }) {
  s.addShape("rect", { x, y, w, h, fill: { color: COLORS.panelFill }, line: { color: COLORS.grayBorder, width: 1, dashType: "dash" } });
  s.addText(label, { x, y, w, h, align: "center", valign: "middle", color: "9AA0A6", fontFace: FONT.body, fontSize: 11 });
}

/**
 * A single content column: green/navy header bar, then `items` stacked evenly.
 * Each item = a short text block (top) + a matching image (below).
 *   items: [{ text: string | [runs], image?: "/local/path.png" }]
 * If `image` is omitted the image area is left BLANK (empty bordered box).
 */
function itemColumn(s, { x, w, header, headerColor = "green", items, top = CONTENT_TOP, bottom = CONTENT_BOTTOM, textFrac = 0.30, gap = 0.18, showImages = true }) {
  const below = sectionHeader(s, { x, y: top, w, text: header, color: headerColor });
  const areaTop = below + 0.15;
  const areaH = bottom - areaTop;
  const n = items.length || 1;
  const slotH = (areaH - gap * (n - 1)) / n;
  items.forEach((it, i) => {
    const iy = areaTop + i * (slotH + gap);
    const textItems = Array.isArray(it.text) ? it.text : [it.text];
    if (!showImages) {
      // Text-only column (e.g. 과제 범위 scope lists) — no image box.
      bulletList(s, { x: x + 0.05, y: iy, w: w - 0.1, h: slotH, items: textItems, fontSize: 11 });
      return;
    }
    const textH = Math.max(0.45, slotH * textFrac);
    const imgY = iy + textH + 0.05;
    const imgH = slotH - textH - 0.05;
    bulletList(s, { x: x + 0.05, y: iy, w: w - 0.1, h: textH, items: textItems, fontSize: 11 });
    if (it.image) {
      s.addImage({ path: it.image, x, y: imgY, w, h: imgH, sizing: { type: "contain", w, h: imgH } });
    } else {
      panel(s, { x, y: imgY, w, h: imgH }); // BLANK per "web 없으면 빈칸" rule
    }
  });
}

/**
 * Multi-column content page (used by 과제 배경 / 과제 필요성 / 과제 범위).
 *   cols: [{ header, headerColor?, items: [{text, image?}] }]
 * Column count is cols.length — 배경/범위 = 3, 필요성 = 2. Each column
 * conventionally holds 2 items, each with its own matching image.
 */
function pageColumns(pptx, { title, page, active = 0, band = "navy", headerColor = "green", cols }) {
  const s = slide(pptx, { title, active, band, page });
  const boxes = columns(cols.length);
  cols.forEach((c, i) => itemColumn(s, {
    x: boxes[i].x, w: boxes[i].w, header: c.header,
    headerColor: c.headerColor || headerColor, items: c.items,
    showImages: c.images !== false,
  }));
  return s;
}

/**
 * 과제 개요 page: 2 columns.
 *   left  = info table (과제명 / 과제목표 / 참여인력 / 일정 …) via `table` rows
 *   right = overall architecture image (`architecture` path); BLANK if omitted
 *           (only filled when the user explicitly supplies the architecture).
 */
function pageOverview(pptx, { title, page, active = 0, band = "green", table, architecture, labelW = 1.7 }) {
  const s = slide(pptx, { title, active, band, page });
  const [L, R] = columns(2);
  infoTable(s, { x: L.x, y: CONTENT_TOP, w: L.w, h: CONTENT_BOTTOM - CONTENT_TOP, labelW, rows: table });
  const ry = CONTENT_TOP, rh = CONTENT_BOTTOM - CONTENT_TOP;
  if (architecture) {
    s.addImage({ path: architecture, x: R.x, y: ry, w: R.w, h: rh, sizing: { type: "contain", w: R.w, h: rh } });
  } else {
    panel(s, { x: R.x, y: ry, w: R.w, h: rh }); // BLANK until architecture is given
    s.addText("Overall Architecture", { x: R.x, y: ry + rh / 2 - 0.2, w: R.w, h: 0.4, align: "center", color: "9AA0A6", fontFace: FONT.body, fontSize: 12 });
  }
  return s;
}

/** Big-number stat callout. */
function statCallout(s, { x, y, w, value, label, color = COLORS.navy }) {
  s.addText(String(value), { x, y, w, h: 0.7, margin: 0, fontFace: FONT.head, fontSize: 40, bold: true, color, align: "center", valign: "middle" });
  s.addText(label, { x, y: y + 0.7, w, h: 0.3, margin: 0, fontFace: FONT.body, fontSize: 11, color: COLORS.ink, align: "center", valign: "top" });
}

// ───────────────────────── 요구사항/설계 챕터용 빌더 ─────────────────────────

/** Arrow/pentagon-shaped process banner (Architecture Design Process 컬럼 헤더). */
function chevronHeader(s, { x, y, w, text, color = "green", h = 0.42, fontSize = 12.5 }) {
  const c = color === "navy" ? COLORS.navy : COLORS.green;
  s.addShape("homePlate", { x, y, w, h, fill: { color: c }, line: { type: "none" } });
  s.addText(text, {
    x: x + 0.05, y, w: w - 0.28, h, margin: 0,
    align: "center", valign: "middle", color: COLORS.white, bold: true, fontFace: FONT.head, fontSize,
  });
  return y + h;
}

/**
 * Rounded tag bar: "FR-01 [시스템 지원] 다양한 시스템 구조 지원".
 * color: "navy" (FR) | "green" (QA) | "brown" (C).
 */
function tagBar(s, { x, y, w, h = 0.34, id, tag, text, color = "navy", fontSize = 10 }) {
  const c = color === "green" ? COLORS.green : color === "brown" ? COLORS.brown : COLORS.navy;
  s.addShape("roundRect", { x, y, w, h, rectRadius: 0.05, fill: { color: c }, line: { type: "none" } });
  const runs = [{ text: `${id} `, options: { bold: true, color: COLORS.white, fontSize } }];
  if (tag) runs.push({ text: `[${tag}] `, options: { bold: true, color: COLORS.white, fontSize } });
  runs.push({ text, options: { color: COLORS.white, fontSize } });
  s.addText(runs, { x: x + 0.12, y, w: w - 0.22, h, valign: "middle", align: "left", margin: 0, fontFace: FONT.body });
  return y + h;
}

/** Small colored circle badge (F1/Q3/C2 markers on diagrams). color = hex. */
function badge(s, { x, y, d = 0.3, text, color = COLORS.navy, fontSize = 9 }) {
  s.addShape("ellipse", { x, y, w: d, h: d, fill: { color }, line: { color: "FFFFFF", width: 0.75 } });
  s.addText(text, { x: x - 0.06, y: y - 0.02, w: d + 0.12, h: d + 0.04, align: "center", valign: "middle", color: COLORS.white, bold: true, fontSize, margin: 0, fontFace: FONT.head });
}

/**
 * DP(Design Point) card: [DP-ID colored box | dark title bar] + bordered bullet body.
 * items: [ "…" | {text, color, bold} ]  (관례: "(1안)…", "(2안)…", "QA: …")
 * Returns bottom y.
 */
function dpCard(s, { x, y, w, id, title, items, idColor, bodyH, fontSize = 8.5 }) {
  const headH = 0.3, idW = 0.72;
  const c = idColor || (COLORS.dp[id] || COLORS.navy);
  s.addShape("rect", { x, y, w: idW, h: headH, fill: { color: c }, line: { type: "none" } });
  s.addText(id, { x, y, w: idW, h: headH, align: "center", valign: "middle", color: COLORS.white, bold: true, fontSize: 9.5, margin: 0, fontFace: FONT.head });
  s.addShape("rect", { x: x + idW, y, w: w - idW, h: headH, fill: { color: COLORS.gray70 }, line: { type: "none" } });
  s.addText(title, { x: x + idW + 0.07, y, w: w - idW - 0.12, h: headH, align: "left", valign: "middle", color: COLORS.white, bold: true, fontSize: 10, margin: 0, fontFace: FONT.head });
  const bh = bodyH || (0.21 * items.length + 0.12);
  s.addShape("rect", { x, y: y + headH, w, h: bh, fill: { color: COLORS.white }, line: { color: COLORS.grayBorder, width: 0.75 } });
  const runs = items.map((it) => {
    const o = typeof it === "string" ? { text: it } : it;
    return { text: o.text, options: { bullet: { characterCode: "2022", indent: 8 }, color: o.color || COLORS.ink, bold: !!o.bold, fontSize: o.fontSize || fontSize, breakLine: true, paraSpaceAfter: 2, fontFace: FONT.body } };
  });
  s.addText(runs, { x: x + 0.08, y: y + headH + 0.06, w: w - 0.16, h: bh - 0.12, valign: "top", align: "left", margin: 0 });
  return y + headH + bh;
}

/**
 * Spec table: dark-green header row + bordered body (요구사항/ASR/Stakeholder 표).
 * header: ["번호","QA",…]; rows: [[cell,…]] where cell = "…" | {text|runs, bold, color, align, fontSize}.
 * highlightRows: 0-based body row indices filled cream (선정 행).
 */
function specTable(s, { x, y, w, colW, header, rows, highlightRows = [], fontSize = 9, headerColor = COLORS.greenDark, headerFontSize }) {
  const head = header.map((t) => ({ text: t, options: { fill: { color: headerColor }, color: COLORS.white, bold: true, align: "center", valign: "middle", fontFace: FONT.head, fontSize: headerFontSize || fontSize + 1 } }));
  const body = rows.map((r, ri) => r.map((cell) => {
    const o = typeof cell === "string" ? { text: cell } : { ...cell };
    return { text: o.text, options: {
      fill: { color: highlightRows.includes(ri) ? COLORS.cream : COLORS.white },
      color: o.color || COLORS.ink, bold: !!o.bold, align: o.align || "left", valign: "middle",
      fontFace: FONT.body, fontSize: o.fontSize || fontSize, margin: [2, 4, 2, 4],
    } };
  }));
  s.addTable([head, ...body], { x, y, w, colW, border: { type: "solid", color: COLORS.grayBorder, pt: 0.5 }, autoPage: false });
}

/**
 * Link/jump label with yellow ▶ (밴드 우하단 "전체 수집된 요구사항 :" 등).
 * Default position: inside the title band, bottom-right. For a below-band
 * variant pass y ≈ BAND_H + 0.05 and textColor: COLORS.ink.
 */
function linkButton(s, { label, x, y, w = 3.2, h = 0.28, textColor = COLORS.white, fontSize = 10 }) {
  const bx = x != null ? x : PAGE.w - MARGIN - w;
  const by = y != null ? y : BAND_H - h - 0.03;
  s.addText([
    { text: label + "  ", options: { color: textColor, fontSize, bold: true } },
    { text: "▶", options: { color: COLORS.yellow, fontSize: fontSize + 1, bold: true } },
  ], { x: bx, y: by, w, h, align: "right", valign: "middle", margin: 0, fontFace: FONT.body });
}

module.exports = {
  PAGE, COLORS, FONT, MARGIN, BAND_H, CONTENT_TOP, CONTENT_BOTTOM,
  get SECTIONS() { return SECTIONS; },
  set SECTIONS(v) { SECTIONS = v; },
  newDeck, writeDeck, repackClean, slide, chrome, sectionHeader, infoTable, bulletList, columns, panel, placeholder, statCallout,
  itemColumn, pageColumns, pageOverview,
  chevronHeader, tagBar, badge, dpCard, specTable, linkButton,
};
