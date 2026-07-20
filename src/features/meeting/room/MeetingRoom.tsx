import { useCallback, useEffect, useRef, useState } from "react";
import { useMeetingRoomStatus } from "./hooks/useMeetingRoomStatus";
import { useMeetingSocket } from "./hooks/useMeetingSocket";
import { useSttEngine } from "./hooks/useSttEngine";
import type { Socket } from "socket.io-client";
import {
  changeAgendaStatus,
  addDecision,
  addAction,
  type ContributionScoreLive,
} from "@/lib/ws";
import { apiGet, apiPost } from "@/lib/api";
import { createCompanionChannel } from "@/features/meeting/model/companion";
import type {
  Agenda,
  Decision,
  ActionItem,
  Meeting,
  TeamMember,
} from "@/lib/types";
import AgendaTracker from "./components/AgendaTracker";
import ContributionBar from "./components/ContributionBar";
import QuickInput from "./components/QuickInput";
import RoomHeader from "./components/RoomHeader";
import RoomBanners from "./components/RoomBanners";
import RecentItems from "./components/RecentItems";

interface Props {
  meetingId: number;
  teamId: number;
}

export default function MeetingRoom({ meetingId, teamId }: Props) {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [scores, setScores] = useState<ContributionScoreLive[]>([]);
  const [speaking, setSpeaking] = useState<Set<number>>(new Set());
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [summaries, setSummaries] = useState<Record<number, string>>({});
  const [t0ms, setT0ms] = useState<number | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  const [ended, setEnded] = useState(false);
  const {
    error,
    setError,
    wsIssue,
    setWsIssue,
    silentHint,
    setSilentHint,
    micError,
    setMicError,
    sttIssue,
    setSttIssue,
    connected,
    setConnected,
    connLost,
    setConnLost,
  } = useMeetingRoomStatus();
  const [ending, setEnding] = useState(false);
  const [myUserId, setMyUserId] = useState<number | null>(null);
  const [recentCollapsed, setRecentCollapsed] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const t0Ref = useRef<number | null>(null);
  // ack 타임아웃 직후 브로드캐스트로 같은 항목이 도착하면 성공 간주하고 실패 배너를 닫기 위한 추적
  const lateArrivalRef = useRef<{
    kind: "decision" | "action";
    text: string;
  } | null>(null);

  // 매초 갱신 (시간 초과 시각화용)
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // 마이크/STT 라이프사이클은 useSttEngine 훅으로 분리 (상태·refs 소유, socketRef·t0Ref 주입).
  const { micOn, speakingSelf, partialText, toggleMic, flushPending, endMic } =
    useSttEngine({
      meetingId,
      socketRef,
      t0Ref,
      setMicError,
      setSttIssue,
      setSilentHint,
    });

  // 회의 종료 전이 — 멱등(종료자 본인도 meeting:ended 를 다시 받음).
  // ended 는 렌더 분기(언마운트 아님)라 STT 엔진을 명시적으로 정지(endMic)해야 한다.
  const endLocally = useCallback(() => {
    endMic();
    setEnded(true);
  }, [endMic]);

  // 초기 데이터 로드 + 소켓 연결/이벤트 구독 — 소켓 로직은 useMeetingSocket 훅으로 분리.
  // 상태·refs는 여기서 소유하고 주입하므로 동작은 동일(특성화 테스트로 보증).
  useMeetingSocket({
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
  });

  // 쓰기 실패는 토스트가 아닌 인라인 배너로 — companion.html 에는 #toast 엘리먼트가 없다.
  // ack 타임아웃 시 자동 재전송 금지(서버 성공 + ack 지연과 구분 불가 → 중복 저장 위험).
  const handleActivate = (id: number) => {
    const s = socketRef.current;
    if (!s) return;
    const active = agendas.find((a) => a.status === "active");
    const doActivate = () =>
      changeAgendaStatus(s, {
        meeting_id: meetingId,
        agenda_id: id,
        activate: true,
      }).catch(() => {
        setWsIssue(
          "아젠다 상태 변경이 확인되지 않았어요. 잠시 후 다시 시도해 주세요.",
        );
      });
    if (active && Number(active.id) !== Number(id)) {
      changeAgendaStatus(s, {
        meeting_id: meetingId,
        agenda_id: Number(active.id),
        status: "done",
      })
        .then(doActivate)
        .catch(() => {
          setWsIssue(
            "아젠다 상태 변경이 확인되지 않았어요. 잠시 후 다시 시도해 주세요.",
          );
        });
    } else {
      doActivate();
    }
  };
  // 완료 = 자동 스위칭: 완료 ack 후 목록 순서상 첫 대기 아젠다을 이어서 시작한다.
  // activate 한 번으로 합치지 않는 이유 — 서버 activate 의 기존 아젠다 자동 완료는
  // broadcast 되지 않아 다른 참가자 화면에 이전 아젠다이 active 로 남고, 완료 시
  // LLM 요약 트리거도 done 경로에만 있다.
  const handleDone = (id: number) => {
    const s = socketRef.current;
    if (!s) return;
    changeAgendaStatus(s, {
      meeting_id: meetingId,
      agenda_id: id,
      status: "done",
    })
      .then(() => {
        const next = agendas.find(
          (a) => a.status === "pending" && Number(a.id) !== Number(id),
        );
        if (!next) return;
        return changeAgendaStatus(s, {
          meeting_id: meetingId,
          agenda_id: Number(next.id),
          activate: true,
        });
      })
      .catch(() => {
        setWsIssue(
          "아젠다 상태 변경이 확인되지 않았어요. 잠시 후 다시 시도해 주세요.",
        );
      });
  };
  const broadcast = (
    type: "agenda:added" | "decision:added" | "action:added",
  ) => {
    const ch = createCompanionChannel();
    ch.postMessage({ type, meeting_id: meetingId });
    ch.close();
  };

  const handleAddAgenda = async (title: string) => {
    try {
      const created = await apiPost<Agenda>(`/meetings/${meetingId}/agendas`, {
        title,
        source: "ad_hoc",
      });
      setAgendas((prev) => [...prev, created]);
      broadcast("agenda:added");
    } catch {
      // 회의 중 사소한 쓰기 실패 — 풀스크린 에러 대신 인라인 배너로 회의 화면 보존
      setWsIssue("아젠다을 추가하지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
  };

  // 실패 시 false 반환 → QuickInput 이 비운 입력을 복원한다
  const handleDecision = async (content: string): Promise<boolean> => {
    const s = socketRef.current;
    if (!s) return false;
    try {
      await addDecision(s, { meeting_id: meetingId, content });
      broadcast("decision:added");
      return true;
    } catch {
      lateArrivalRef.current = { kind: "decision", text: content };
      setWsIssue(
        "결정 사항 저장이 확인되지 않았어요. 입력을 복원했어요 — 다시 시도해 주세요.",
      );
      return false;
    }
  };
  const handleAction = async (payload: {
    description: string;
    assignee_id?: number;
    due_date?: string;
    difficulty?: number;
  }): Promise<boolean> => {
    const s = socketRef.current;
    if (!s) return false;
    try {
      await addAction(s, {
        meeting_id: meetingId,
        team_id: teamId,
        ...payload,
      });
      broadcast("action:added");
      return true;
    } catch {
      lateArrivalRef.current = { kind: "action", text: payload.description };
      setWsIssue(
        "액션 저장이 확인되지 않았어요. 입력을 복원했어요 — 다시 시도해 주세요.",
      );
      return false;
    }
  };

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const [m, ag, dec, act] = await Promise.all([
        apiGet<Meeting>(`/meetings/${meetingId}`),
        apiGet<Agenda[]>(`/meetings/${meetingId}/agendas`),
        apiGet<Decision[]>(`/decisions?meeting_id=${meetingId}`),
        apiGet<ActionItem[]>(`/action-items?team_id=${teamId}`),
      ]);
      setMeeting(m);
      setAgendas(ag);
      setDecisions(dec);
      setActions(act);
    } catch {
      // 실패는 조용히 무시
    } finally {
      setRefreshing(false);
    }
  }, [meetingId, teamId, refreshing]);

  const handleEnd = async () => {
    if (ending) return;
    if (
      !confirm(
        "회의를 종료하면 다시 시작할 수 없어요. 지금 기여도를 확정할까요?",
      )
    )
      return;
    setEnding(true);
    try {
      await apiPost(`/meetings/${meetingId}/end`);
      // 종료자 메인 탭의 리포트 자동 이동 경로 — meeting:ended broadcast 와 별개로 유지
      const ch = createCompanionChannel();
      ch.postMessage({ type: "meeting:ended", meeting_id: meetingId });
      ch.close();
      endLocally();
    } catch {
      // 종료 실패는 풀스크린 에러가 아닌 인라인 배너로 — 종료 버튼 재활성화 유지
      setWsIssue("회의 종료에 실패했어요. 잠시 후 다시 시도해 주세요.");
      setEnding(false);
    }
  };

  if (error) {
    return (
      <div className="cmp-error">
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>다시 불러오기</button>
      </div>
    );
  }
  if (ended) {
    return (
      <div className="cmp-ended">
        <p>회의가 종료됐어요. 리포트는 메인 화면에서 확인할 수 있어요.</p>
        <button onClick={() => window.close()}>창 닫기</button>
      </div>
    );
  }

  const elapsedSec =
    t0ms !== null ? Math.max(0, Math.floor((now - t0ms) / 1000)) : 0;
  const totalSec = (meeting?.total_minutes ?? 0) * 60;
  const recentDecisions = decisions.slice(-3).reverse();
  const recentActions = actions.slice(-3).reverse();
  // 회의 시작 5분 경과 & 모든 아젠다 미착수 → 아젠다 힌트
  const showAgendaHint =
    elapsedSec >= 300 && agendas.every((a) => a.status === "pending");
  const agendaHint = showAgendaHint
    ? `회의 시작 5분이 지났어요. ${agendas.length === 0 ? "아젠다을 추가해 보세요!" : "아젠다을 시작해 보세요!"}`
    : null;

  return (
    <div className="companion">
      <RoomHeader
        topic={meeting?.topic}
        elapsedSec={elapsedSec}
        totalSec={totalSec}
        refreshing={refreshing}
        micOn={micOn}
        ending={ending}
        onRefresh={() => void handleRefresh()}
        onToggleMic={() => void toggleMic()}
        onEnd={handleEnd}
      />

      <RoomBanners
        connected={connected}
        connLost={connLost}
        agendaHint={agendaHint}
        wsIssue={wsIssue}
        onDismissWsIssue={() => {
          setWsIssue(null);
          lateArrivalRef.current = null;
        }}
        micError={micError}
        onRetryMic={() => {
          setMicError(null);
          void toggleMic();
        }}
        micOn={micOn}
        onToggleMic={() => void toggleMic()}
        sttIssue={sttIssue}
        silentHint={silentHint}
        speakingSelf={speakingSelf}
        partialText={partialText}
      />

      <AgendaTracker
        agendas={agendas}
        t0ms={t0ms}
        now={now}
        summaries={summaries}
        onActivate={handleActivate}
        onDone={handleDone}
        onAdd={handleAddAgenda}
        hintActive={showAgendaHint}
      />

      <ContributionBar
        scores={scores}
        members={members}
        speaking={speaking}
        myUserId={myUserId}
      />

      <QuickInput
        members={members}
        onDecision={handleDecision}
        onAction={handleAction}
      />

      <RecentItems
        collapsed={recentCollapsed}
        onToggle={() => setRecentCollapsed((c) => !c)}
        decisions={recentDecisions}
        actions={recentActions}
      />
    </div>
  );
}
