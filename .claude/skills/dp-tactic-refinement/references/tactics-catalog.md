# Tactic 카탈로그

단점 보완 브레인스토밍용 체크리스트. **여기 있는 것만 쓰라는 뜻이 아니다** — 계열을 훑으며 "이 계열의 접근을 이 단점에 적용하면 뭐가 되나"를 자문하는 용도다.

## 일반 아키텍처 tactic (SEI 분류 기반, FTL 맥락으로 각색)

### 성능 (Performance)
| 계열 | Tactic | FTL 적용 예 |
|---|---|---|
| 자원 수요 줄이기 | 연산/접근 자체 감소 | map entry 압축(run-length), 요청 병합(merge), 중복 쓰기 제거 |
| 자원 수요 줄이기 | 배치·지연 처리 | dirty map batched flush, journal group commit, lazy GC |
| 자원 관리 | 캐싱·프리페칭 | hot map pinning, sequential 감지 시 map prefetch, read-ahead |
| 자원 관리 | 동시성 도입 | plane/channel 병렬화, map load와 data read 파이프라이닝 |
| 자원 중재 | 스케줄링·우선순위 | host I/O 우선 GC 양보, flush 우선순위 큐, QoS별 credit |

### 가용성·복구성 (Availability / Recoverability)
| 계열 | Tactic | FTL 적용 예 |
|---|---|---|
| 결함 탐지 | 무결성 검사 | journal CRC/seq 번호, map page checksum, commit marker |
| 결함 복구 — 준비 | 체크포인트 | incremental checkpoint, dirty량 기반 checkpoint 트리거 |
| 결함 복구 — 준비 | 중복화 | GTD 이중화, 핵심 메타데이터 다중 copy |
| 결함 복구 — 재도입 | 재구성 | OOB(spare) LPN 기반 open block 스캔, replay 병렬화 |
| 결함 예방 | 원자적 갱신 | shadow update 후 포인터 원자 전환(CoW), 트랜잭션화 |

### 수명 (Endurance — FTL 도메인 고유)
| 계열 | Tactic | FTL 적용 예 |
|---|---|---|
| 쓰기 줄이기 | WAF 절감 | delta 기록(전체 page 대신 변경분), 압축, TRIM 활용 |
| 쓰기 분산 | wear leveling 강화 | static WL 주기 조정, namespace 간 P-E 편차 상한 |
| 분리 | 데이터 배치 | hot/cold stream 세분화, namespace별 OP 재배분 |
| 소거 줄이기 | GC 최적화 | victim 정책 전환(cost-benefit), GC 시점 지연/idle 활용 |

## Tactic 탐색 시 자문 목록

단점 하나를 놓고 아래를 순서대로 자문하면 계열이 다른 tactic이 나온다:

1. **없앨 수 있나?** — 그 작업 자체를 안 하게 만들 수 있는가 (구조 변경, 조건 회피)
2. **줄일 수 있나?** — 양을 줄일 수 있는가 (압축, 필터링, 세분화)
3. **미룰 수 있나?** — 나중에/모아서 할 수 있는가 (배치, 지연, idle 활용)
4. **겹칠 수 있나?** — 다른 작업과 병렬로 숨길 수 있는가 (파이프라이닝, 백그라운드화)
5. **자원을 더 쓸 수 있나?** — SRAM/DRAM/OP를 더 배정하면 풀리는가 (예산 확인 필수)
6. **미리 할 수 있나?** — 예측해서 선행할 수 있는가 (prefetch, 사전 checkpoint)
7. **한도를 걸 수 있나?** — 최악 상황만 막으면 되는가 (상한/throttle, admission control)

## 부작용 점검 체크리스트

tactic마다 최소한 다음을 점검한다:

- QA1: read/write 경로에 NAND 접근이나 지연이 추가되는가
- QA2/QA5: NAND write(WAF)가 추가되는가
- QA3: SPO 시 dump해야 할 상태가 늘어나는가 (PLPless 예산 초과 여부)
- QA4: 복구 시 재구성할 것이 늘어나는가
- 제약: SRAM/DRAM 상주 메모리가 늘어나는가 (Partial DRAM 예산), 구현·검증 복잡도
