# team-architect

Automotive 및 Humanoid 향 **고성능·고수명 SSD FTL(Flash Translation Layer) 아키텍처 설계** 과제.

## 시스템 환경

- **Partial DRAM** — 전체 L2P 매핑 테이블을 DRAM에 상주시킬 수 없는 환경
- **PLPless** — 전원 차단 보호용 대용량 커패시터가 없는 환경 (SPO 시 dump 가능량이 극히 제한적)

## 과제 목표

| # | 목표 | 내용 |
|---|---|---|
| G1 | 고성능 | Read/Write throughput 극대화 |
| G2 | 고수명 | Namespace 단위 수명 관리, GC로 인한 WAF 증폭 완화 |
| G3 | 데이터 무결성 | 전원 차단 시 빠른 dump, 부팅 시 빠르고 완전한 복구 |

## 품질 속성 (QA)

1. **R/W Throughput** (성능)
2. **Namespace 수명** (수명)
3. **PLP Dump 시간** (무결성)
4. **Open Recovery 시간** (무결성)
5. **Host Flush 수명 영향 최소화** (수명)

## 설계 포인트

1. **계층적 L2P Cache 구조** — Partial DRAM 환경에서 map 접근 성능과 map 쓰기 비용 관리
2. **저널링 메커니즘** — 쓰기 성능·복구 시간·수명을 위한 L2P delta 저널링 + checkpoint
3. **블록 관리 구조** — Namespace-aware 할당, hot/cold 분리, GC/WAF 완화로 수명 보장

## 문서

| 문서 | 내용 |
|---|---|
| [docs/01-project-overview.md](docs/01-project-overview.md) | 과제 개요: 배경, 환경 제약, 목표, QA 시나리오, 설계 포인트, QA↔DP 추적성 매트릭스 |
