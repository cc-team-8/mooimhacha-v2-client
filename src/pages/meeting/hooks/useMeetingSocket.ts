import { useCallback, useEffect } from "react";
import type { Dispatch, SetStateAction, MutableRefObject } from "react";
import type { Socket } from "socket.io-client";
import {
  connectMeetingSocket,
  joinMeeting,
  leaveMeeting,
  type ContributionScoreLive,
} from "@/lib/ws";
import { apiGet, tryRefresh } from "@/lib/api";
import type {
  Agenda,
  CurrentUser,
  Decision,
  ActionItem,
  Meeting,
  TeamMember,
} from "@/lib/types";

// 재동기화용 스냅샷 ∪ 현재 상태 병합 — 스냅샷에 없는 항목(스냅샷 SELECT 이후 broadcast 로
// 먼저 도착한 것)은 유지하고, 같은 id 는 스냅샷 값 우선(끊긴 동안의 변경은 스냅샷에만 있음).
// bigint id 는 런타임에 string 가능 → Number 정규화
function mergeById<T extends { id: number | string }>(
  snapshot: T[],
  current: T[],
): T[] {
  const ids = new Set(snapshot.map((s) => Number(s.id)));
  return [...snapshot, ...current.filter((c) => !ids.has(Number(c.id)))];
}

interface UseMeetingSocketParams {
  meetingId: number;
  teamId: number;
  socketRef: MutableRefObject<Socket | null>;
  t0Ref: MutableRefObject<number | null>;
  lateArrivalRef: MutableRefObject<{
    kind: "decision" | "action";
    text: string;
  } | null>;
  setError: Dispatch<SetStateAction<string | null>>;
  setMeeting: Dispatch<SetStateAction<Meeting | null>>;
  setAgendas: Dispatch<SetStateAction<Agenda[]>>;
  setMembers: Dispatch<SetStateAction<TeamMember[]>>;
  setDecisions: Dispatch<SetStateAction<Decision[]>>;
  setActions: Dispatch<SetStateAction<ActionItem[]>>;
  setMyUserId: Dispatch<SetStateAction<number | null>>;
  setT0ms: Dispatch<SetStateAction<number | null>>;
  setConnected: Dispatch<SetStateAction<boolean>>;
  setConnLost: Dispatch<SetStateAction<boolean>>;
  setWsIssue: Dispatch<SetStateAction<string | null>>;
  setScores: Dispatch<SetStateAction<ContributionScoreLive[]>>;
  setSummaries: Dispatch<SetStateAction<Record<number, string>>>;
  setSpeaking: Dispatch<SetStateAction<Set<number>>>;
  flushPending: (t0: number) => void;
  endLocally: () => void;
}

// MeetingRoom의 초기 데이터 로드 + 회의 소켓 연결/이벤트 구독을 캡슐화한다.
// 상태·refs는 MeetingRoom이 소유하고 setter/ref/콜백으로 주입받으므로, 이펙트 본문은
// 기존과 동일하게 실행된다(동작 보존). STT를 만지는 endLocally/flushPending은 주입.
export function useMeetingSocket(params: UseMeetingSocketParams) {
  const {
    meetingId,
    teamId,
    socketRef,
    t0Ref,
    lateArrivalRef,
    setError,
    setMeeting,
    setAgendas,
    setMembers,
    setDecisions,
    setActions,
    setMyUserId,
    setT0ms,
    setConnected,
    setConnLost,
    setWsIssue,
    setScores,
    setSummaries,
    setSpeaking,
    flushPending,
    endLocally,
  } = params;

  // 재연결 후 끊긴 동안의 결정·액션·아젠다(요약 포함)을 REST 스냅샷으로 재동기화.
  // (서버 join 응답은 t0·presence·기여도 스냅샷만 — 기여도는 join 시 서버가 다시 broadcast)
  const resyncSnapshots = useCallback(async () => {
    try {
      const [ag, dec, act] = await Promise.all([
        apiGet<Agenda[]>(`/meetings/${meetingId}/agendas`),
        apiGet<Decision[]>(`/decisions?meeting_id=${meetingId}`),
        apiGet<ActionItem[]>(`/action-items?team_id=${teamId}`),
      ]);
      // 전체 교체가 아닌 id 기준 병합 — fetch 중 broadcast 로 먼저 도착한 항목(스냅샷
      // SELECT 이후 저장분)을 더 오래된 스냅샷이 덮어써 유실시키지 않도록 한다
      setAgendas((prev) => mergeById(ag, prev));
      setDecisions((prev) => mergeById(dec, prev));
      setActions((prev) => mergeById(act, prev));
    } catch {
      // 재동기화 실패는 치명적이지 않음 — 이후 브로드캐스트·새로고침으로 복구 가능
    }
  }, [meetingId, teamId, setAgendas, setDecisions, setActions]);

  // 초기 데이터 로드 + 소켓 연결
  useEffect(() => {
    if (!meetingId) {
      setError("회의 정보가 없습니다.");
      return;
    }
    let mounted = true;

    void (async () => {
      try {
        const [m, ag, team, dec, act, me] = await Promise.all([
          apiGet<Meeting>(`/meetings/${meetingId}`),
          apiGet<Agenda[]>(`/meetings/${meetingId}/agendas`),
          apiGet<{ members: TeamMember[] }>(`/teams/${teamId}`),
          apiGet<Decision[]>(`/decisions?meeting_id=${meetingId}`),
          apiGet<ActionItem[]>(`/action-items?team_id=${teamId}`),
          apiGet<CurrentUser>("/auth/me"),
        ]);
        if (!mounted) return;
        setMeeting(m);
        setAgendas(ag);
        setMembers(team.members);
        setDecisions(dec);
        setActions(act);
        setMyUserId(me.id);
        if (m.t0_timestamp) {
          const t = new Date(m.t0_timestamp).getTime();
          setT0ms(t);
          t0Ref.current = t;
        }
        // 이미 종료된 회의에 재접속한 경우 — 곧바로 ended 전이
        if (m.status === "ended") endLocally();
      } catch (e) {
        if (mounted) setError((e as Error).message);
      }
    })();

    const socket = connectMeetingSocket();
    socketRef.current = socket;

    // 첫 연결인지 추적 — 재연결일 때만 REST 스냅샷 재동기화(마운트 로드와 이중 호출 방지)
    let hadConnected = false;
    socket.on("connect", () => {
      setConnected(true);
      setConnLost(false);
      joinMeeting(socket, meetingId);
      if (hadConnected) void resyncSnapshots();
      hadConnected = true;
    });
    // 서버 강제 종료 후 토큰 갱신 재시도는 1회만 — 만료가 아닌 이유로 계속 거부되면
    // 갱신·재연결을 반복하지 않고 새로고침 안내로 전환 (강제 종료 루프 방지)
    let kickRetried = false;
    socket.on("disconnect", (reason) => {
      setConnected(false);
      // 서버 강제 종료('io server disconnect')는 자동 재연결이 없다. 게이트웨이가
      // 만료 토큰을 거부한 경로일 수 있으므로 tryRefresh 1회 후 수동 재연결하고,
      // 그래도 실패하면 connLost 로 — '접속 중' 거짓 안내 금지
      if (reason === "io server disconnect") {
        if (kickRetried) {
          setConnLost(true);
          return;
        }
        kickRetried = true;
        void tryRefresh()
          .then((ok) => {
            if (!mounted) return;
            if (ok) socket.connect();
            else setConnLost(true);
          })
          .catch(() => {
            if (mounted) setConnLost(true);
          });
      }
    });
    socket.on("connect_error", () => setConnected(false));
    // 재연결 시도 상한 초과 — 새로고침 안내로 전환
    const onReconnectFailed = () => setConnLost(true);
    socket.io.on("reconnect_failed", onReconnectFailed);
    socket.on(
      "meeting:t0",
      (p: { t0_timestamp: string | null; status?: Meeting["status"] }) => {
        if (p.t0_timestamp) {
          const t = new Date(p.t0_timestamp).getTime();
          setT0ms(t);
          t0Ref.current = t;
          flushPending(t);
        }
        // join 응답에 status 포함 — 재접속 시 이미 종료된 회의면 ended 전이
        if (p.status === "ended") endLocally();
      },
    );
    // 회의 종료 broadcast — 모든 참가자 보조 창에서 STT 정지 + ended 전이 (멱등)
    socket.on("meeting:ended", () => endLocally());
    // 서버 WsException(검증 실패 등)은 ack 없이 'exception' 이벤트로만 도착 — 배너로 표면화
    socket.on("exception", (e: { message?: string }) => {
      setWsIssue(
        typeof e?.message === "string" && e.message
          ? e.message
          : "요청을 처리하지 못했어요.",
      );
    });
    socket.on("contribution:update", (p: { scores: ContributionScoreLive[] }) =>
      setScores(p.scores),
    );
    socket.on("agenda:status-change", (p: { agenda: Agenda }) =>
      setAgendas((prev) =>
        prev.map((a) => (a.id === p.agenda.id ? p.agenda : a)),
      ),
    );
    socket.on("agenda:summary", (p: { agenda_id: number; summary: string }) =>
      setSummaries((prev) => ({ ...prev, [p.agenda_id]: p.summary })),
    );
    socket.on("decision:new", (p: { decision: Decision }) => {
      // 재동기화 스냅샷 병합과 경합할 수 있으므로 id 기준 dedupe (bigint id 는 런타임에 string 가능 → Number 정규화)
      setDecisions((prev) =>
        prev.some((d) => Number(d.id) === Number(p.decision.id))
          ? prev
          : [...prev, p.decision],
      );
      // ack 타임아웃 직후 같은 내용이 브로드캐스트로 도착 → 성공 간주, 실패 배너 닫기
      if (
        lateArrivalRef.current?.kind === "decision" &&
        lateArrivalRef.current.text === p.decision.content
      ) {
        lateArrivalRef.current = null;
        setWsIssue(null);
      }
    });
    socket.on("action:new", (p: { action: ActionItem }) => {
      setActions((prev) =>
        prev.some((a) => Number(a.id) === Number(p.action.id))
          ? prev
          : [...prev, p.action],
      );
      if (
        lateArrivalRef.current?.kind === "action" &&
        lateArrivalRef.current.text === p.action.description
      ) {
        lateArrivalRef.current = null;
        setWsIssue(null);
      }
    });
    socket.on("user:speaking-start", (p: { user_id: number }) =>
      setSpeaking((prev) => new Set(prev).add(p.user_id)),
    );
    socket.on("user:speaking-end", (p: { user_id: number }) =>
      setSpeaking((prev) => {
        const next = new Set(prev);
        next.delete(p.user_id);
        return next;
      }),
    );

    return () => {
      mounted = false;
      // Manager 는 동일 URL 소켓 간 공유될 수 있어 리스너를 명시적으로 해제
      socket.io.off("reconnect_failed", onReconnectFailed);
      leaveMeeting(socket, meetingId);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [meetingId, teamId, flushPending, endLocally, resyncSnapshots]);
}
