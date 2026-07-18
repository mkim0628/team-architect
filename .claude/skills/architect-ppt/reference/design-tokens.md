# Architect 과제 Deck — Design Tokens

Design system extracted from screenshots of the source deck
(*Architect 양성과정 개인과제*). These are the exact values used by
`lib/architect_deck.js`. Tune them here if the source style shifts.

## Canvas

| Property | Value |
|----------|-------|
| Aspect ratio | **16:9** |
| Size | 13.333″ × 7.5″ |
| Background | white `#FFFFFF` |

> For a 4:3 variant, set `PAGE = { w: 10, h: 7.5 }` in the library.
> All helpers are inch-based and reflow off `PAGE.w`.

## Colors

| Token | Hex | Use |
|-------|-----|-----|
| `navy` | `#1F3864` | Content title band, table label cells, navy section bars, emphasis text, bullets |
| `navyLight` | `#2E4C7E` | Secondary navy accents |
| `green` | `#4E7C3A` | Lead-slide title band, green section-header bars |
| `greenDark` | `#3C5F2C` | Green accents / edges |
| `yellow` | `#FFC000` | Active nav-stepper step |
| `grayBox` | `#E9E9E9` | Inactive nav-stepper steps |
| `grayBorder` | `#A6A6A6` | Box / table borders |
| `grayArrow` | `#9AA0A6` | Nav chevrons between steps |
| `panelFill` | `#F5F6F8` | Diagram / image placeholder fill |
| `ink` | `#262626` | Body text |
| `muted` | `#7F7F7F` | Footer page number |

**Dominance:** navy is the primary (title bands + tables), green the supporting
accent (section headers + lead slides), yellow the single sharp accent (active step).

### Extended tokens (요구사항/설계 chapter pages)

| Token | Hex | Use |
|-------|-----|-----|
| `cream` | `#FFF2CC` | Selected(선정) row highlight in ASR/spec tables |
| `brown` | `#843C0C` | Constraints tag bars, C-badges |
| `gray70` | `#404040` | DP card title bar background |
| `dp["DP-01"]` | `#00B0F0` | DP-01 실행 구조 (cyan) |
| `dp["DP-02"]` | `#00B050` | DP-02 스케줄링 (green) |
| `dp["DP-03"]` | `#ED7D31` | DP-03 중간 표현 (orange) |
| `dp["DP-04"]` | `#E91E8C` | DP-04 HW 정보 (magenta) |
| `dp["DP-05"]` | `#7030A0` | DP-05 분산 동작 (purple) |

DP colors must match between the DP cards (P9 right rail) and the DP-area
highlights drawn on the module diagram. Badge colors: F=navy, Q=greenDark,
C=brown. Use-case ovals in generated UML: fill `#F5E6C8`, brown outline.

## Typography

Font family: **Malgun Gothic (맑은 고딕)** for both headings and body
(the standard Korean corporate face; falls back to system sans if unavailable).

| Element | Size | Weight |
|---------|------|--------|
| Slide title (in band) | 30pt | bold, white |
| Nav-stepper label | 9pt | bold if active |
| Section-header bar | 13pt | bold, white |
| Table label cell | 11pt | bold, white |
| Body / list | 11–12pt | regular |
| Footer page number | 10pt | regular, muted |

## Layout geometry (inches)

| Element | Value |
|---------|-------|
| Title band height | 1.0 |
| Content margin (l/r) | 0.35 |
| Content top | 1.18 (band + 0.18) |
| Content bottom | 7.05 (page − 0.45) |
| Nav box | 0.86 w × 0.30 h |
| Nav chevron | 0.17 w |
| Section-header bar height | 0.34 |
| Column gap | 0.22 |

## Recurring chrome

Every content slide carries three fixed elements ("the master"):

1. **Title band** — full-width rectangle at the top; title text left-aligned,
   white bold. Navy by default; **green** for lead / section-opener slides.
2. **Nav stepper** — top-right, 5 boxes `과제 개요 → 요구사항 → 설계 → 검증 → 결론`
   joined by gray chevrons; the current section is filled yellow.
3. **Footer** — `N / M` page number, bottom-right, muted gray.

## Bullets

- Level 0: navy diamond `◆` (`characterCode 25C6`)
- Level 1: en-dash `–` (`characterCode 2013`)
- Never use Unicode bullet glyphs typed into the text itself; use the bullet property.

## Per-page rules (see `examples/build_deck.js`)

These are the standard slide types and their fixed structure. Each is a
builder in `lib/architect_deck.js`.

Standard page order: **1 과제 배경 · 2 과제 필요성 · 3 과제 범위 · 4 과제 개요.**

| # | Page | Columns | Per column | Builder |
|---|------|---------|-----------|---------|
| 1 | **과제 배경** | 3 | 2 content items, each with a matching image (chart/그림/구조도/설계도) | `pageColumns` |
| 2 | **과제 필요성** | 2 | 2 content items, each with a matching image (same as 배경) | `pageColumns` |
| 3 | **과제 범위** | 3 | text-only lists (목적 / In Scope / Out of Scope), `images:false` | `pageColumns` |
| 4 | **과제 개요** | 2 | left = info table (과제명·과제목표·참여인력·일정); right = **overall architecture** (BLANK unless user provides it) | `pageOverview` |

**Image sourcing rule:** find a matching image from the web (`item.image =
localPath`). If the web is blocked or no fitting image exists, **generate a
matching diagram/chart locally** (see `docs/mcr_assets/make_assets.py`) rather
than leaving it blank. Leave the box blank only as a last resort; never
fabricate captions or measured numbers. The overall-architecture box on 과제
개요 stays blank until the user supplies it.
