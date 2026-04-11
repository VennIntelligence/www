export const chart_core = `
graph TB
    TS["TimeSource<br/>(Live / Backtest)"]
    TM["TimeManager<br/>heap[Schedule...]"]
    S["Strategies<br/>(@on_interval)"]
    SVC["Services<br/>(Backend / Monitoring)"]

    TS -- "now() / sleep_until()" --> TM
    TM -- "Tick(interval, ts, seq)" --> S
    TM -- "Tick(interval, ts, seq)" --> SVC
`;

export const chart_frozen = `
sequenceDiagram
    participant TM as TimeManager.run()
    participant Heap as Schedule Heap
    participant TS as BacktestTimeSource
    participant Trig as Trigger / LLM
    participant LB as LocalBackend

    TM->>Heap: heappop(1m@10:01)
    TM->>TS: sleep_until(10:01)
    Note over TS: current = 10:01
    TM->>Trig: _on_tick(10:01)
    Trig->>TS: enter_barrier()
    Note over TS: pending_count = 1<br/>barrier_event.clear()

    rect rgb(30, 10, 10)
        Note over Trig: LLM executes 3 min<br/>now() always returns 10:01 ❌
        Trig->>TS: now()?
        TS-->>Trig: 10:01 (frozen)
        Note over LB: Blocked — waiting for<br/>main loop to advance ❌
    end

    Trig->>TS: exit_barrier()
    Note over TS: pending_count = 0<br/>barrier_event.set()
    TM->>Heap: _schedule_next → push 10:02
    Note over TM: Resume at 10:02<br/>(3 min late)
`;

export const chart_pump1 = `
sequenceDiagram
    participant ML as Main Loop
    participant Heap as Schedule Heap
    participant Pump as Background Pump

    ML->>Heap: pop(1m@10:01)
    ML->>ML: execute_schedules → Trigger enters barrier
    Note over ML: Blocked for 3 min...

    Pump->>Pump: Started (enter_barrier callback)
    Pump->>Heap: scan → pop 10:02 → execute
    Pump->>Heap: scan → pop 10:03 → execute
    Pump->>Pump: Stopped (exit_barrier callback)

    ML->>ML: Resume → skip already-processed
`;

export const chart_pump2 = `
sequenceDiagram
    participant ML as Main Loop
    participant Heap as Schedule Heap
    participant Pump as Background Pump

    Note over Heap: [1m@10:00]
    ML->>Heap: pop(1m@10:00)
    Note over Heap: [ ] (empty!)
    ML->>ML: execute(10:00)
    ML->>ML: Trigger enters barrier → blocked...

    Pump->>Pump: Started!
    Pump->>Heap: scan → empty ❌
    Pump->>Pump: sleep 1s...
    Pump->>Heap: scan → empty ❌
    Pump->>Pump: sleep 1s...
    Note over Pump: 10:01 / 10:02 / 10:03<br/>schedules don't exist yet

    ML->>ML: Trigger exits barrier
    ML->>Heap: _schedule_next → push(1m@10:01)
    Note over Pump: Too late — pump already stopped
`;

export const chart_hybrid_seq = `
sequenceDiagram
    participant TM as TimeManager
    participant TS as BacktestTimeSource
    participant Trig as Trigger / LLM
    participant LB as LocalBackend

    Note over TM: pop(1m@10:01)
    TM->>TS: sleep_until(10:01)
    Note over TS: current = 10:01
    TM->>Trig: execute(1m handlers)

    rect rgb(10, 20, 30)
        Note right of TS: 🔵 Realtime Mode
        Trig->>TS: enter_barrier()
        Note over TS: anchor_virtual = 10:01<br/>anchor_real = monotonic()

        Trig->>TS: now()
        TS-->>Trig: 10:01 + 0s
        Note over Trig: LLM call started

        Trig->>TS: now()
        TS-->>Trig: 10:01 + 30s
        Note over Trig: Query K-line → fresh data ✅

        Trig->>TS: now()
        TS-->>Trig: 10:03 + 8s
        Note over Trig: Place order → ts=10:03 ✅

        Note over Trig: LLM call finished
        Trig->>TS: exit_barrier()
        Note over TS: elapsed = 3m<br/>current = max(10:01, min(10:04, end))<br/>= 10:04
    end

    Note over TM: Main loop resumes

    rect rgb(30, 25, 10)
        Note right of TM: 🟡 CatchUp Mode
        TM->>TM: peek → 10:02 (overdue!)
        TM->>TM: pop 10:02, 10:03, 10:04
        TM->>TM: coalesce 1m: keep 10:04 only
        TM->>LB: execute 1m@10:04
        Note over LB: _on_1m_tick ✅<br/>SL/TP check ✅<br/>Limit order match ✅
        TM->>TM: reschedule → push 10:05
    end

    Note over TM: 🟢 Back to FastForward
    TM->>TS: sleep_until(10:05)
`;

export const chart_compare = `
graph LR
    subgraph Compare["TimeManager: Old vs New"]
        direction LR
        subgraph Old["Old (Frozen Time)"]
            direction TB
            O1["10:01 Enter Barrier"] --> O2["3 min LLM<br/>now() = 10:01 (frozen) ❌"] --> O3["10:01 Exit Barrier"] --> O4["Resume<br/>(3 min late)"]
        end

        Old ==> New

        subgraph New["New (Hybrid Engine)"]
            direction TB
            N1["10:01 Enter Barrier"] --> N2["3 min LLM<br/>now() = 10:01→10:04 ✅"] --> N3["10:04 Exit Barrier"] --> N4["CatchUp: coalesce ✅"]
        end
    end
`;

export const chart_overall = `
graph TB
    subgraph TimeSource["TimeSource"]
        Live["LiveTimeSource<br/>now() = real time<br/>barrier = noop"]
        BT["BacktestTimeSource<br/>FastForward: now() = static<br/>Realtime: now() = anchor + mono - pause"]
    end

    subgraph TM["TimeManager"]
        Heap["_schedule (min-heap)<br/>[1m@10:05, 5m@10:05, 1h@11:00]"]
        MainLoop["Main Loop:<br/>Normal: pop → sleep → exec<br/>CatchUp: pop all → coalesce → exec latest"]
        LST["_last_schedule_time<br/>(always grid-aligned)"]
    end

    subgraph Consumers["Consumers"]
        Strategy["Strategy<br/>@on_interval<br/>Trigger dispatch<br/>enter/exit barrier"]
        Backend["LocalBackend<br/>_on_1m_tick<br/>matching / SL / TP<br/>tm.now() for pricing"]
        Web["WebService<br/>/api/time/now"]
    end

    TimeSource -- "now() / sleep_until() / barrier" --> TM
    TM -- "Tick(interval, timestamp, sequence)" --> Strategy
    TM -- "Tick(interval, timestamp, sequence)" --> Backend
    TM -- "Tick(interval, timestamp, sequence)" --> Web
`;
