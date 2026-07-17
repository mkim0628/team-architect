# FTL 설계 과제 개요

Automotive 및 Humanoid 향 **고성능·고수명 SSD**를 위한 FTL(Flash Translation Layer) 아키텍처 설계 과제.

---

## 1. 프로젝트 배경

Automotive / Humanoid 도메인의 스토리지는 일반 Client/Enterprise SSD와 다른 요구사항을 가진다.

| 도메인 특성 | 스토리지 요구사항 |
|---|---|
| 실시간 센서/로그 데이터의 지속적 기록 | 높은 쓰기 처리량, 예측 가능한 지연시간 |
| 장기간 교체 없이 운용 (차량 수명 10년+) | 높은 내구성(Endurance), WAF 최소화 |
| 갑작스러운 전원 차단이 일상적 (시동 off, 배터리 분리) | 전원 차단 시 데이터 무결성 보장 |
| 원가/전력/공간 제약 | Partial DRAM, PLPless 하드웨어 구성 |
| 용도별 데이터 분리 (OS / 로그 / 센서 / AI 모델) | Namespace 기반 관리 및 수명 격리 |

## 2. 시스템 환경 및 제약사항

### 2.1 Partial DRAM

전체 L2P(Logical-to-Physical) 매핑 테이블을 DRAM에 올릴 수 없는 환경.

- 4KB 매핑 단위 기준, 통상 NAND 용량의 약 1/1000 크기의 DRAM이 필요 (1TB → 약 1GB). Partial DRAM 환경에서는 이 중 일부만 캐싱 가능.
- **설계에 미치는 영향**
  - L2P 전체를 NAND에 두고, DRAM에는 일부만 캐싱하는 **계층적 구조**가 필수.
  - Map cache miss 시 NAND에서 map을 읽어야 하므로 read latency가 증가 → 캐시 적중률이 성능을 좌우.
  - Dirty map의 NAND flush가 추가 쓰기를 유발 → **Map WAF**가 수명에 영향.

### 2.2 PLPless (Power Loss Protection Capacitor 없음)

전원 차단 시 대용량 커패시터에 의한 백업 전원이 없는 환경.

- **설계에 미치는 영향**
  - SPO(Sudden Power Off) 시 사용할 수 있는 에너지/시간이 극히 제한적 → **dump 가능한 데이터 양이 매우 작아야 함**.
  - DRAM에 있는 대량의 dirty map/데이터를 전원 차단 시점에 모두 내릴 수 없음 → 평상시부터 **영속화(journaling/checkpoint)를 상시 수행**하는 구조가 필요.
  - 부팅(open) 시 NAND 스캔/복구로 상태를 재구성해야 하므로 **복구 시간의 상한 관리**가 필요.

## 3. 과제 목표

| # | 목표 | 내용 |
|---|---|---|
| G1 | **고성능** | Read/Write throughput 극대화 |
| G2 | **고수명** | Namespace 단위 수명 관리, GC로 인한 WAF 증폭 완화 |
| G3 | **데이터 무결성** | 전원 차단 시 빠른 dump, 복구 시 dump된 내용을 빠짐없이 빠르게 복구 |

## 4. 품질 속성 (Quality Attributes)

| # | QA | 관련 목표 | 자극 (Stimulus) | 응답 측정 (Response Measure) |
|---|---|---|---|---|
| QA1 | R/W Throughput | G1 (성능) | Host가 sequential/random R/W workload 인가 | 목표 MB/s, KIOPS 달성 |
| QA2 | Namespace 수명 | G2 (수명) | Namespace별 상이한 workload가 장기간 인가 | Namespace별 WAF / P-E cycle 소모량, 수명 격리 보장 |
| QA3 | PLP Dump 시간 | G3 (무결성) | SPO 발생 | 잔여 에너지 내 dump 완료 (dump 데이터 양·시간 상한) |
| QA4 | Open Recovery 시간 | G3 (무결성) | SPO 후 재부팅 | 상한 시간 내 dump/journal 기반 상태 완전 복구 |
| QA5 | Host Flush 수명 영향 | G2 (수명) | Host가 flush command를 빈번히 발행 | Flush 1회당 추가 NAND write 양 최소화 (WAF 영향 상한) |

### QA 간 관계

- QA3 ↔ QA4: dump를 작게 만들수록(PLPless 제약) 복구 시 스캔/재구성할 양이 늘어날 수 있음 → **journaling으로 균형점 확보**가 핵심 trade-off.
- QA1 ↔ QA2: 성능을 위한 공격적 버퍼링은 flush/SPO 시 부담 증가. GC 정책은 성능(지연)과 WAF(수명) 모두에 영향.
- QA5 ↔ QA1: flush 처리 비용이 크면 write throughput도 저하 → flush 경량화는 성능·수명 양쪽에 기여.

## 5. 설계 포인트 (Architecture Design Points)

### DP1. Partial DRAM 환경을 고려한 계층적 L2P Cache 구조

**해결하려는 문제**: 전체 map을 DRAM에 둘 수 없는 상태에서 map 접근 성능과 map 쓰기 비용을 동시에 관리.

- **구조 방향**
  - NAND에 전체 L2P map(map block), DRAM에 map 일부 캐싱(CMT, Cached Mapping Table), map의 위치를 가리키는 상위 디렉토리(GTD 등)는 상주 — DFTL 계열 계층 구조.
  - SRAM(최상위 hot) → DRAM(partial cache) → NAND(full map)의 계층화.
- **주요 설계 이슈**
  - Map 캐싱 단위(segment/page 크기)와 교체 정책(LRU 등) — 적중률 vs 관리 오버헤드.
  - Dirty map 관리: dirty 비율이 곧 SPO 시 손실 위험량 → **dump/journal 부담과 직결** (DP2와 연계).
  - Clean/dirty eviction 비용 차이, dirty map의 batched flush로 map WAF 절감.
  - Namespace/워크로드 locality를 고려한 캐시 파티셔닝·프리페치.
- **기여 QA**: QA1 (map hit 시 1-read 경로 확보), QA3·QA4 (dirty map 총량 제한), QA2 (map flush WAF 절감)

### DP2. 쓰기 성능·복구 시간·고수명을 위한 저널링 메커니즘

**해결하려는 문제**: PLPless 환경에서 map 전체 flush 없이도 무결성을 보장하면서, flush/쓰기 비용을 최소화.

- **구조 방향**
  - L2P 변경분(delta)을 **journal에 순차 기록**하고, map page 자체의 flush는 지연/배치 처리.
  - 주기적 **checkpoint**(GTD·블록 상태 스냅샷) + checkpoint 이후 journal replay로 복구.
  - SPO 시 dump 대상 = 소량의 journal 버퍼 + 최소 메타데이터로 한정 → PLPless 에너지 예산 내 dump 가능.
- **주요 설계 이슈**
  - Journal 단위/버퍼 크기: 버퍼가 클수록 쓰기 효율↑, dump 부담↑ — QA3와 trade-off.
  - Checkpoint 주기: 길수록 평시 오버헤드↓, replay 양↑ — QA4와 trade-off. **복구 시간 상한으로부터 journal 최대 길이를 역산**하는 설계 필요.
  - Host flush 처리: map flush 대신 **journal 영속화만으로 flush 완료 처리** → flush당 NAND write를 소량·순차 쓰기로 한정 (QA5의 핵심 메커니즘).
  - Open recovery 절차: checkpoint 로드 → journal replay → open block 스캔(OOB/spare의 LPN 활용) → valid count 재구성.
- **기여 QA**: QA3, QA4, QA5 (직접), QA1·QA2 (map flush 감소로 간접 기여)

### DP3. 수명 보장을 위한 블록 관리 구조

**해결하려는 문제**: GC로 인한 WAF 증폭을 완화하고, namespace 단위로 수명을 관리·격리.

- **구조 방향**
  - **Namespace-aware 블록 할당**: namespace(또는 stream)별 open block 분리로 서로 다른 수명/온도의 데이터 혼합 방지.
  - Hot/Cold 데이터 분리 배치로 GC 시 valid page copy 최소화.
  - Namespace별 P-E cycle·WAF 집계 및 overprovisioning 관리 (endurance group 개념).
- **주요 설계 이슈**
  - GC victim 선정 정책(greedy vs cost-benefit)과 GC 스케줄링(idle 시간 활용) — WAF vs 성능 지연.
  - Wear leveling(dynamic + static)과 namespace 격리의 양립.
  - Open block 개수 관리: 많을수록 분리 효과↑, SPO 시 스캔 대상↑ → **QA4(open recovery)와 trade-off**.
- **기여 QA**: QA2 (직접), QA1 (GC 간섭 완화), QA4 (open block 수 제한 시)

## 6. QA ↔ 설계 포인트 추적성 매트릭스

| | DP1. 계층적 L2P Cache | DP2. 저널링 | DP3. 블록 관리 |
|---|:---:|:---:|:---:|
| QA1. R/W Throughput | ● 직접 | ○ 간접 | ○ 간접 |
| QA2. Namespace 수명 | ○ 간접 | ○ 간접 | ● 직접 |
| QA3. PLP Dump 시간 | ● 직접 (dirty 총량 제한) | ● 직접 (dump 대상 최소화) | — |
| QA4. Open Recovery 시간 | ○ 간접 | ● 직접 (checkpoint+replay) | ○ 간접 (open block 수) |
| QA5. Host Flush 수명 영향 | ○ 간접 | ● 직접 (journal 기반 flush) | — |

**핵심 관찰**: 세 설계 포인트는 독립적이지 않다.
- DP1의 *dirty map 총량*이 DP2의 dump/journal 설계 파라미터를 결정한다.
- DP2의 *checkpoint 주기와 journal 길이*가 QA3/QA4의 균형점을 정한다.
- DP3의 *open block 개수*가 QA2(분리 효과)와 QA4(스캔 시간)를 잇는 조절 변수다.

## 7. 향후 진행

1. QA별 정량 목표 수치 확정 (throughput 목표, dump 에너지 예산, 복구 시간 상한 등)
2. DP별 상세 설계: 자료구조, 알고리즘, 파라미터 결정 및 trade-off 분석 문서화
3. QA 시나리오 기반 설계 검증 (시뮬레이션 / 시나리오 walkthrough)
