# FTL 후보 구조 카탈로그

DP별 대표 구조 계열의 목록. **출발점**으로만 사용할 것 — 각 계열을 본 과제의 제약(Partial DRAM, PLPless, automotive/humanoid)에 맞게 각색해서 후보로 구체화한다. 여기 없는 구조를 후보로 세워도 된다.

## DP1. 계층적 L2P Cache 구조

| 계열 | 핵심 메커니즘 | 특징 |
|---|---|---|
| Demand-based map caching (DFTL 계열) | 전체 map은 NAND(map block), DRAM에 CMT(Cached Mapping Table), map page 위치는 GTD로 추적. miss 시 demand loading | 표준적 출발점. miss penalty(+1 NAND read)와 dirty eviction 비용이 관건 |
| Translation-page 단위 캐싱 + 공간 지역성 활용 (SFTL 계열) | 연속 LPN 구간을 run-length 형태로 압축 캐싱 | sequential 지역성이 강한 워크로드(로그/센서 기록)에서 캐시 적중률·메모리 효율 우수 |
| 2-level 캐싱 (TPFTL 계열) | translation page 단위 + entry 단위의 2단 LRU | 세밀한 hot entry 유지와 페이지 단위 효율의 절충 |
| Pinned + demand 혼합 | 특정 영역(hot namespace, 메타데이터 영역) map은 상주(pinned), 나머지는 demand | Namespace별 QoS/수명 격리와 궁합. pinning 예산 산정 필요 |
| Dirty 관리 변형 | dirty bitmap의 세분화(sub-page dirty), batched/merged flush, background flush로 dirty 총량 상한 유지 | PLPless에서 dirty 총량 = SPO 손실 위험량이므로 본 과제에서는 사실상 필수 검토 요소 |

**본 과제 특이사항**: dirty map 총량 상한이 DP2의 저널/dump 예산과 직결된다. 캐시 구조 후보를 평가할 때 "dirty 총량을 상한 이하로 강제할 수 있는가"를 기준에 포함할 것.

## DP2. 저널링 메커니즘

| 계열 | 핵심 메커니즘 | 특징 |
|---|---|---|
| Logical delta journaling | L2P 변경분(LPN→PPN delta)을 journal 영역에 순차 기록, map page flush는 지연·배치. checkpoint + replay로 복구 | flush 비용을 소량 순차 쓰기로 한정. journal 길이가 복구 시간을 결정 |
| Physical journaling (shadow map) | dirty map page 자체를 새 위치에 기록 후 GTD 원자 갱신 | replay 불필요(map이 항상 최신에 가까움), 대신 map WAF가 큼 |
| Implicit journaling (OOB 기반) | 명시적 journal 없음. data page의 spare(OOB)에 LPN을 남기고, 복구 시 open/최근 block 스캔으로 L2P 재구성 | 평시 오버헤드 최소, dump 거의 0. 복구 시간이 스캔 범위에 비례해 길어짐 |
| Hybrid (journal + bounded scan) | 소량 journal로 최근 상태 커버 + 복구 시 제한된 open block 스캔 병용 | dump 예산과 복구 상한을 독립적으로 튜닝 가능. 구현 복잡도는 최고 |
| Checkpoint 전략 변형 | full snapshot vs incremental checkpoint, 주기 고정 vs dirty량 기반 트리거 | checkpoint 주기가 QA3(dump)·QA4(recovery)의 균형점을 정함 |

**본 과제 특이사항**: PLPless이므로 "SPO 시 dump 대상"이 무엇이고 몇 바이트인지 후보마다 반드시 산정할 것. host flush 의미론(무엇을 영속화해야 flush 완료인가)도 후보별로 명시할 것 — QA5의 핵심.

## DP3. 블록 관리 구조

| 계열 | 핵심 메커니즘 | 특징 |
|---|---|---|
| Namespace별 물리 분리 (dedicated superblock/endurance group) | namespace마다 전용 block pool·open block. P-E cycle·OP를 namespace 단위로 관리 | 수명 격리 확실, GC 간섭 없음. 반면 pool 간 공간 융통성 저하 |
| 공유 pool + 논리 격리 | block pool은 공유하되 namespace별 open block(stream)만 분리, 수명은 회계(accounting)로 관리 | 공간 효율 우수. 수명 격리는 회계·정책 정밀도에 의존 |
| Hot/Cold 분리 (온도 기반 stream) | update 빈도 기반으로 데이터 온도를 추정해 open block을 온도별로 분리 | GC valid copy 감소로 WAF 개선. 온도 추정 정확도가 관건 |
| GC victim 정책 | greedy(최소 valid) vs cost-benefit(age 가중) vs 윈도우 기반 | WAF vs GC 지연 특성이 다름. 워크로드 의존성 큼 |
| Wear leveling | dynamic(할당 시 낮은 P-E 우선) + static(cold block 주기 재배치) | namespace 격리와 static WL의 충돌(경계 넘는 이동) 조정 필요 |

**본 과제 특이사항**: open block 개수는 분리 효과(QA2)와 open recovery 스캔량(QA4)을 잇는 조절 변수다. 후보마다 open block 수 상한과 그때의 복구 스캔량을 산정할 것.

## 공통 평가 시 유의점

- 성능(QA1) 평가는 read/write 경로에 추가되는 NAND 접근 횟수로 환산해 비교하면 근거가 명확해진다.
- 수명(QA2, QA5) 평가는 WAF 기여분(host write 대비 추가 NAND write)으로 환산한다.
- 무결성(QA3, QA4) 평가는 dump 바이트 수와 복구 시 읽어야 할 NAND 양으로 환산한다.
