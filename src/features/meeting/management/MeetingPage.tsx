import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { Socket } from "socket.io-client";
import { useOutletContext } from "react-router-dom";
import { useToast } from "@/hooks/useToast";
import ConfirmModal from "@/components/ConfirmModal";
import HeadsetGateModal from "@/components/HeadsetGateModal";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import {
  openCompanion,
  createCompanionChannel,
} from "@/features/meeting/model/companion";
import { connectTeamSocket, joinTeam, leaveTeam } from "@/lib/ws";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  useNewMeetingForm,
  useQuickStartForm,
  useConfirmTaskForm,
  useEditMeetingForm,
} from "./hooks/useMeetingForms";
import AgendaTab from "./tabs/AgendaTab";
import SpeakTab from "./tabs/SpeakTab";
import DecisionTab from "./tabs/DecisionTab";
import AttendanceTab from "./tabs/AttendanceTab";
import SummaryTab from "./tabs/SummaryTab";
import SettingsTab from "./tabs/SettingsTab";
import NewMeetingModal from "./modals/NewMeetingModal";
import QuickStartModal from "./modals/QuickStartModal";
import ConfirmTaskModal from "./modals/ConfirmTaskModal";
import DecisionModal from "./modals/DecisionModal";
import AbsenceModal from "./modals/AbsenceModal";
import DeleteMeetingModal from "./modals/DeleteMeetingModal";
import AgendaModal from "./modals/AgendaModal";
import { ATT_BADGE } from "@/features/meeting/model/attendanceBadge";
import type {
  ActionItem,
  Agenda,
  Decision,
  Meeting,
  MeetingContribution,
  TeamContribution,
  MeetingAttendance,
  AttendanceSummary,
  Transcript,
  TeamSettings,
} from "@/lib/types";
import type { TeamContext } from "@/pages/dashboard/DashboardPage";
import { todayStr, nowTimeStr } from "@/lib/dateUtils";

type Tab =
  "agenda" | "speak" | "attendance" | "decision" | "summary" | "settings";
type Status = "할 일" | "진행 중" | "완료";

const STATUS_TO_API: Record<Status, string> = {
  "할 일": "todo",
  "진행 중": "in_progress",
  완료: "done",
};

import { avatarBg } from "@/lib/avatarColor";

function meetingMeta(
  m: Meeting,
  memberCount: number,
  attendedCount?: number,
): string {
  const d = new Date(m.scheduled_at);
  const today = new Date();
  const day =
    d.toDateString() === today.toDateString()
      ? "오늘"
      : `${d.getMonth() + 1}월 ${d.getDate()}일`;
  if (m.status === "ended" && m.t0_timestamp && m.ended_at) {
    const start = new Date(m.t0_timestamp);
    const end = new Date(m.ended_at);
    const timeFmt = (t: Date) =>
      t.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
    const startDay =
      start.toDateString() === today.toDateString()
        ? "오늘"
        : `${start.getMonth() + 1}월 ${start.getDate()}일`;
    const sameDay = start.toDateString() === end.toDateString();
    const endStr = sameDay
      ? timeFmt(end)
      : `${end.getMonth() + 1}/${end.getDate()} ${timeFmt(end)}`;
    const countStr = attendedCount !== undefined ? ` · ${attendedCount}명` : "";
    return `${startDay} · ${timeFmt(start)} ~ ${endStr}${countStr}`;
  }
  return `${day} · ${memberCount}명`;
}

export default function MeetingPage() {
  const { showToast } = useToast();
  const team = useOutletContext<TeamContext | null>();
  const me = useCurrentUser();
  const [tab, setTab] = useState<Tab>("agenda");
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [speak, setSpeak] = useState<MeetingContribution[]>([]);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [attendance, setAttendance] = useState<MeetingAttendance | null>(null);
  const [teamSettings, setTeamSettings] = useState<TeamSettings | null>(null);
  const [hasJoined, setHasJoined] = useState<boolean | null>(null);
  const [joinedCount, setJoinedCount] = useState(0);
  const [joiningMeeting, setJoiningMeeting] = useState(false);
  const [absenceInput, setAbsenceInput] = useState("");
  // 회의별 출결 요약 (목록 배지·미처리 표시용)
  const [summaries, setSummaries] = useState<Map<number, AttendanceSummary>>(
    new Map(),
  );
  // elapsed: 초 단위 정수. fmt()로 MM:SS 포맷 변환.
  const [elapsed, setElapsed] = useState(0);
  const [decInput, setDecInput] = useState("");
  // 세 모달을 하나의 state로 관리. null이면 모두 닫힘.
  const [modalOpen, setModalOpen] = useState<
    | "meeting"
    | "decision"
    | "agenda"
    | "absence"
    | "headset"
    | "quickstart"
    | null
  >(null);
  const [headsetAction, setHeadsetAction] = useState<
    "start" | "attend" | "quickstart"
  >("start");
  // 결정 수정/삭제 대상 — 수정은 결정 모달을 재사용, 삭제는 확인 모달을 띄운다.
  const [editingDecision, setEditingDecision] = useState<Decision | null>(null);
  const [deletingDecision, setDeletingDecision] = useState<Decision | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingTasks, setPendingTasks] = useState<ActionItem[]>([]);
  const [members, setMembers] = useState<TeamContribution[]>([]);
  const [prevDecisions, setPrevDecisions] = useState<Decision[]>([]);

  const teamSocketRef = useRef<Socket | null>(null);

  // AI 태스크 확정 모달
  const {
    confirmTask,
    setConfirmTask,
    confirmDesc,
    setConfirmDesc,
    confirmAssignee,
    setConfirmAssignee,
    confirmDue,
    setConfirmDue,
    confirmTime,
    setConfirmTime,
    confirmStatus,
    setConfirmStatus,
    confirmDifficulty,
    setConfirmDifficulty,
    confirmSaving,
    setConfirmSaving,
  } = useConfirmTaskForm();

  // 새 회의 만들기 모달 입력값
  const {
    newTopic,
    setNewTopic,
    newMeetingType,
    setNewMeetingType,
    newDate,
    setNewDate,
    newTime,
    setNewTime,
    newMinutes,
    setNewMinutes,
    newAgendaList,
    setNewAgendaList,
    newAgendaInput,
    setNewAgendaInput,
    newAgendaMinutes,
    setNewAgendaMinutes,
    addAgendaToList,
    removeAgendaFromList,
  } = useNewMeetingForm();

  // 지금 바로 시작 모달 입력값
  const {
    quickTopic,
    setQuickTopic,
    quickMeetingType,
    setQuickMeetingType,
    quickMinutes,
    setQuickMinutes,
    quickStarting,
    setQuickStarting,
    quickAgendaList,
    setQuickAgendaList,
    quickAgendaInput,
    setQuickAgendaInput,
    quickAgendaMinutes,
    setQuickAgendaMinutes,
    addQuickAgendaToList,
    removeQuickAgendaFromList,
  } = useQuickStartForm();

  // 회의 정보 수정(설정 탭) + 삭제 확인
  const {
    editTopic,
    setEditTopic,
    editDate,
    setEditDate,
    editTime,
    setEditTime,
    editMinutes,
    setEditMinutes,
    editMeetingType,
    setEditMeetingType,
    editSaving,
    setEditSaving,
    deletingMeeting,
    setDeletingMeeting,
    deleteConfirmInput,
    setDeleteConfirmInput,
  } = useEditMeetingForm();

  // 아젠다 모달 입력값
  const [agTitle, setAgTitle] = useState("");
  const [agMinutes, setAgMinutes] = useState<number | "">(10);

  const selected = meetings.find((m) => m.id === selectedId) ?? null;

  const nicknameMap = useMemo(
    () =>
      new Map(
        (team?.members ?? []).map((m) => [m.user_id, m.nickname ?? m.name]),
      ),
    [team],
  );
  const memberIdx = (userId: number) => {
    const i = (team?.members ?? []).findIndex((m) => m.user_id === userId);
    return i < 0 ? userId % 32 : i;
  };

  // 가장 최근에 종료된 회의 (선택 회의 제외)
  const prevMeeting = useMemo(() => {
    if (!selected) return null;
    return (
      [...meetings]
        .filter((m) => m.status === "ended" && m.id !== selected.id)
        .sort((a, b) => {
          const ta = a.ended_at ?? a.scheduled_at;
          const tb = b.ended_at ?? b.scheduled_at;
          return new Date(tb).getTime() - new Date(ta).getTime();
        })[0] ?? null
    );
  }, [meetings, selected]);

  useEffect(() => {
    setPrevDecisions([]);
    if (!prevMeeting || selected?.status === "ended") return;
    apiGet<Decision[]>(`/decisions?meeting_id=${prevMeeting.id}`)
      .then(setPrevDecisions)
      .catch(() => {});
  }, [prevMeeting?.id, selected?.status]);

  const loadMeetings = useCallback(async () => {
    if (!team) return;
    try {
      const ms = await apiGet<Meeting[]>(`/meetings?team_id=${team.id}`);
      setMeetings(ms);
      // 선택 유지, 없으면 진행 중 → 예정 → 최근 종료 순으로 기본 선택
      setSelectedId((cur) => {
        if (cur && ms.some((m) => m.id === cur)) return cur;
        const active = ms.find((m) => m.status === "active");
        const scheduled = [...ms]
          .filter((m) => m.status === "scheduled")
          .sort(
            (a, b) =>
              new Date(a.scheduled_at).getTime() -
              new Date(b.scheduled_at).getTime(),
          )[0];
        const ended = [...ms]
          .filter((m) => m.status === "ended")
          .sort(
            (a, b) =>
              new Date(b.scheduled_at).getTime() -
              new Date(a.scheduled_at).getTime(),
          )[0];
        return (active ?? scheduled ?? ended)?.id ?? null;
      });
    } catch (e) {
      showToast((e as Error).message, "error");
    }
  }, [team, showToast]);

  useEffect(() => {
    void loadMeetings();
  }, [loadMeetings]);

  useEffect(() => {
    if (!team) return;
    const socket = connectTeamSocket();
    teamSocketRef.current = socket;
    socket.on("connect", () => joinTeam(socket, team.id));
    socket.on("task:update", (p: { action: ActionItem }) => {
      setPendingTasks((prev) => {
        // 확정/취소된 태스크는 미확정 목록에서 제거
        if (p.action.confirmed || p.action.status === "cancelled") {
          return prev.filter((t) => Number(t.id) !== Number(p.action.id));
        }
        const idx = prev.findIndex((t) => Number(t.id) === Number(p.action.id));
        if (idx === -1) return prev;
        const next = [...prev];
        next[idx] = p.action;
        return next;
      });
    });
    socket.on("task:delete", (p: { id: number }) => {
      setPendingTasks((prev) =>
        prev.filter((t) => Number(t.id) !== Number(p.id)),
      );
    });
    return () => {
      leaveTeam(socket, team.id);
      socket.disconnect();
      teamSocketRef.current = null;
    };
  }, [team]);

  const loadPendingTasks = useCallback(async () => {
    if (!team || !selectedId) return;
    try {
      const all = await apiGet<ActionItem[]>(
        `/action-items?team_id=${team.id}&meeting_id=${selectedId}&confirmed=false`,
      );
      setPendingTasks(all.filter((t) => t.source === "ai_extracted"));
    } catch {
      // 실패는 무시 — 요약 탭 부가 기능
    }
  }, [team, selectedId]);

  // 요약 탭 + 종료된 회의일 때 미확정 AI 태스크 로드
  useEffect(() => {
    if (tab === "summary" && selected?.status === "ended") {
      void loadPendingTasks();
    }
  }, [tab, selected?.status, loadPendingTasks]);

  // 설정 탭 진입 시 현재 값으로 초기화
  useEffect(() => {
    if (tab === "settings" && selected) {
      setEditTopic(selected.topic ?? "");
      const d = new Date(selected.scheduled_at);
      setEditDate(d.toLocaleDateString("sv-SE"));
      setEditTime(
        d.toLocaleTimeString("ko-KR", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
      );
      setEditMinutes(selected.total_minutes ?? 30);
      setEditMeetingType(selected.meeting_type ?? "regular");
    }
  }, [tab, selected?.id]);

  async function saveMeetingSettings() {
    if (!selectedId || editSaving) return;
    if (selected?.status === "scheduled") {
      if (!editDate || !editTime) {
        showToast("날짜와 시간을 입력해 주세요", "error");
        return;
      }
      if (new Date(`${editDate}T${editTime}:00`) <= new Date()) {
        showToast("현재 시각 이후로 설정해 주세요", "error");
        return;
      }
    }
    setEditSaving(true);
    try {
      const patch: Record<string, unknown> = {
        topic: editTopic.trim() || undefined,
      };
      if (selected?.status !== "ended") {
        patch.meeting_type = editMeetingType;
      }
      if (selected?.status === "scheduled") {
        patch.scheduled_at = new Date(
          `${editDate}T${editTime}:00`,
        ).toISOString();
        patch.total_minutes = editMinutes || undefined;
      }
      await apiPatch(`/meetings/${selectedId}`, patch);
      await loadMeetings();
      showToast("회의 정보가 수정되었습니다.");
    } catch (e) {
      showToast((e as Error).message, "error");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDeleteMeeting() {
    if (!selectedId || busy) return;
    setBusy(true);
    try {
      await apiDelete(`/meetings/${selectedId}`);
      setSelectedId(null);
      setDeletingMeeting(false);
      setDeleteConfirmInput("");
      showToast("회의가 삭제되었습니다.");
      await loadMeetings();
    } catch (e) {
      showToast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  // 팀 멤버 목록 (확정 모달 담당자 선택용)
  useEffect(() => {
    if (!team) return;
    apiGet<{ members: TeamContribution[] }>(`/teams/${team.id}/contributions`)
      .then((r) => setMembers(r.members))
      .catch(() => {});
  }, [team]);

  // companion 창 이벤트 → 대시보드 즉시 갱신
  useEffect(() => {
    const ch = createCompanionChannel();
    ch.onmessage = (e: MessageEvent) => {
      const msg = e.data as { type?: string };
      if (msg.type === "meeting:ended") {
        void loadMeetings();
      } else if (msg.type === "agenda:added" && selectedId) {
        void apiGet<Agenda[]>(`/meetings/${selectedId}/agendas`)
          .then(setAgendas)
          .catch(() => {});
      } else if (msg.type === "decision:added" && selectedId) {
        void apiGet<Decision[]>(`/decisions?meeting_id=${selectedId}`)
          .then(setDecisions)
          .catch(() => {});
      } else if (msg.type === "action:added") {
        // 회의 탭에 실시간 액션 목록 없음 — Tasks 페이지에서 확인
      }
    };
    return () => ch.close();
  }, [loadMeetings, selectedId]);

  // 회의 목록 출결 요약 — 카드 배지·미처리 표시용 (부가 정보라 실패는 조용히 무시)
  const loadSummaries = useCallback(async () => {
    if (!team) return;
    try {
      const list = await apiGet<AttendanceSummary[]>(
        `/teams/${team.id}/attendance-summary`,
      );
      setSummaries(new Map(list.map((s) => [s.meeting_id, s])));
    } catch {
      /* 무시 */
    }
  }, [team]);

  useEffect(() => {
    void loadSummaries();
  }, [loadSummaries]);

  // 선택 회의의 상세(아젠다·발언·결정) 로드
  useEffect(() => {
    if (!selectedId) {
      setAgendas([]);
      setSpeak([]);
      setTranscript(null);
      setDecisions([]);
      return;
    }
    let alive = true;
    setTranscript(null);
    void Promise.allSettled([
      apiGet<Agenda[]>(`/meetings/${selectedId}/agendas`),
      apiGet<{ scores: MeetingContribution[] }>(
        `/meetings/${selectedId}/contributions`,
      ),
      apiGet<Decision[]>(`/decisions?meeting_id=${selectedId}`),
    ]).then(([ag, sp, dc]) => {
      if (!alive) return;
      if (ag.status === "fulfilled") setAgendas(ag.value);
      if (sp.status === "fulfilled") setSpeak(sp.value.scores);
      if (dc.status === "fulfilled") setDecisions(dc.value);
    });
    return () => {
      alive = false;
    };
  }, [selectedId]);

  // 출결: 종료된 회의의 출결 탭 진입 시 로드 (재사용 위해 useCallback)
  const loadAttendance = useCallback(
    async (meetingId: number) => {
      try {
        setAttendance(
          await apiGet<MeetingAttendance>(`/meetings/${meetingId}/attendance`),
        );
      } catch (e) {
        showToast((e as Error).message, "error");
      }
    },
    [showToast],
  );

  useEffect(() => {
    setAttendance(null);
    if (tab === "attendance" && selected?.status === "ended" && selectedId) {
      void loadAttendance(selectedId);
      if (!teamSettings && team) {
        void apiGet<TeamSettings>(`/teams/${team.id}/settings`)
          .then(setTeamSettings)
          .catch(() => null);
      }
    }
  }, [tab, selectedId, selected?.status, loadAttendance]);

  useEffect(() => {
    setHasJoined(null);
    setJoinedCount(0);
    if (!selectedId || selected?.status === "ended") return;
    void apiGet<{ count: number; hasJoined: boolean }>(
      `/meetings/${selectedId}/joined-count`,
    )
      .then(({ count, hasJoined: hj }) => {
        setJoinedCount(count);
        setHasJoined(hj);
      })
      .catch(() => null);
  }, [selectedId, selected?.status]);

  useEffect(() => {
    if (
      tab === "speak" &&
      selected?.status === "ended" &&
      selectedId &&
      !transcript
    ) {
      void apiGet<Transcript>(`/meetings/${selectedId}/transcript`)
        .then(setTranscript)
        .catch(() => null);
    }
  }, [tab, selectedId, selected?.status, transcript]);

  // 진행 중 회의 경과 시간 — t0 기준 실측, 1초 틱
  useEffect(() => {
    if (!selected || selected.status !== "active" || !selected.t0_timestamp) {
      setElapsed(0);
      return;
    }
    const t0 = new Date(selected.t0_timestamp).getTime();
    const tick = () =>
      setElapsed(Math.max(0, Math.floor((Date.now() - t0) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [selected]);

  useEffect(() => {
    if (tab === "speak") {
      requestAnimationFrame(() => {
        document
          .querySelectorAll<HTMLElement>(".speak-bar i[data-w]")
          .forEach((b) => {
            b.style.width = b.dataset.w + "%";
          });
      });
    }
  }, [tab, speak]);

  const fmt = (s: number) =>
    String(Math.floor(s / 60)).padStart(2, "0") +
    ":" +
    String(s % 60).padStart(2, "0");

  const fmtAgTime = (ag: Agenda) => {
    if (ag.started_at_offset_ms != null && ag.ended_at_offset_ms != null) {
      const totalSec = Math.round(
        (ag.ended_at_offset_ms - ag.started_at_offset_ms) / 1000,
      );
      const m = Math.floor(totalSec / 60);
      const s = totalSec % 60;
      return s > 0 ? `${m}분 ${s}초` : `${m}분`;
    }
    return `${ag.actual_minutes ?? ag.estimated_minutes}분`;
  };

  async function saveConfirmTask() {
    if (!confirmTask || confirmSaving) return;
    if (!confirmDesc.trim()) {
      showToast("태스크 이름을 입력해 주세요", "error");
      return;
    }
    setConfirmSaving(true);
    try {
      await apiPatch(`/action-items/${confirmTask.id}`, {
        description: confirmDesc.trim(),
        confirmed: true,
        assignee_id: confirmAssignee ? Number(confirmAssignee) : null,
        due_date: confirmDue
          ? new Date(`${confirmDue}T${confirmTime || "23:59"}`).toISOString()
          : undefined,
        status: STATUS_TO_API[confirmStatus],
        difficulty: confirmDifficulty,
      });
      setPendingTasks((prev) => prev.filter((t) => t.id !== confirmTask.id));
      setConfirmTask(null);
      showToast("태스크가 확정됐습니다.");
    } catch (e) {
      showToast((e as Error).message, "error");
    } finally {
      setConfirmSaving(false);
    }
  }

  // 추가/수정 겸용 — editingDecision이 있으면 PATCH, 없으면 POST
  async function saveDecision() {
    if (!decInput.trim()) {
      showToast("결정 내용을 입력해주세요");
      return;
    }
    if (!selectedId || busy) return;
    setBusy(true);
    try {
      if (editingDecision) {
        await apiPatch(`/decisions/${editingDecision.id}`, {
          content: decInput.trim(),
        });
      } else {
        await apiPost("/decisions", {
          meeting_id: selectedId,
          content: decInput.trim(),
        });
      }
      setDecisions(
        await apiGet<Decision[]>(`/decisions?meeting_id=${selectedId}`),
      );
      if (!editingDecision) {
        const ch = createCompanionChannel();
        ch.postMessage({ type: "decision:added", meeting_id: selectedId });
        ch.close();
      }
      setDecInput("");
      setModalOpen(null);
      showToast(
        editingDecision
          ? "결정 사항이 수정되었습니다"
          : "결정 사항이 추가되었습니다",
      );
      setEditingDecision(null);
    } catch (e) {
      showToast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function deleteDecision() {
    if (!deletingDecision || busy) return;
    setBusy(true);
    try {
      await apiDelete(`/decisions/${deletingDecision.id}`);
      setDecisions((prev) => prev.filter((d) => d.id !== deletingDecision.id));
      setDeletingDecision(null);
      showToast("결정 사항이 삭제되었습니다");
    } catch (e) {
      showToast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  // 본인 결석 사유 입력
  async function saveAbsence() {
    if (!absenceInput.trim()) {
      showToast("결석 사유를 입력해주세요");
      return;
    }
    if (!selectedId || busy) return;
    setBusy(true);
    try {
      await apiPost(`/meetings/${selectedId}/absences`, {
        reason: absenceInput.trim(),
      });
      setModalOpen(null);
      setAbsenceInput("");
      showToast("사유가 등록됐습니다");
      await Promise.all([loadAttendance(selectedId), loadSummaries()]);
    } catch (e) {
      showToast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  // 다른 멤버의 결석 사유에 동의 — 정족수 도달 시 출석 인정으로 자동 전환
  async function consentAbsence(absenceId: number) {
    if (!selectedId || busy) return;
    setBusy(true);
    try {
      const r = await apiPost<{ status: string }>(
        `/absences/${absenceId}/consent`,
      );
      await Promise.all([loadAttendance(selectedId), loadSummaries()]);
      showToast(
        r.status === "approved"
          ? "출석 인정으로 처리되었습니다"
          : "동의했습니다",
      );
    } catch (e) {
      showToast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function cancelConsent(absenceId: number) {
    if (!selectedId || busy) return;
    setBusy(true);
    try {
      await apiDelete(`/absences/${absenceId}/consent`);
      await Promise.all([loadAttendance(selectedId), loadSummaries()]);
      showToast("동의를 취소했습니다");
    } catch (e) {
      showToast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  // 새 회의 모달 닫기 — 아젠다 입력 잔존 방지
  function closeMeetingModal() {
    setModalOpen(null);
    setNewMeetingType("regular");
    setNewAgendaList([]);
    setNewAgendaInput("");
    setNewAgendaMinutes("");
  }

  // "지금 바로 시작" 모달 닫기 — 입력 잔존 방지
  function closeQuickstartModal() {
    setModalOpen(null);
    setQuickTopic("");
    setQuickMeetingType("regular");
    setQuickMinutes(30);
    setQuickAgendaList([]);
    setQuickAgendaInput("");
    setQuickAgendaMinutes("");
  }

  async function createMeeting() {
    if (!team || busy) return;
    if (!newDate) {
      showToast("날짜를 선택해 주세요", "error");
      return;
    }
    if (!newTime) {
      showToast("시간을 입력해 주세요", "error");
      return;
    }
    if (new Date(`${newDate}T${newTime}:00`) <= new Date()) {
      showToast("현재 시각 이후로 설정해 주세요", "error");
      return;
    }
    if (!newMinutes) {
      showToast("예상 소요 시간을 입력해 주세요", "error");
      return;
    }
    setBusy(true);
    try {
      const created = await apiPost<Meeting>("/meetings", {
        team_id: team.id,
        scheduled_at: new Date(`${newDate}T${newTime}:00`).toISOString(),
        total_minutes: newMinutes,
        topic: newTopic.trim() || undefined,
        meeting_type: newMeetingType,
      });
      // 추가한 아젠다를 순서대로 등록 — 예상 시간은 입력한 경우에만 전송(선택)
      for (const ag of newAgendaList) {
        await apiPost(`/meetings/${created.id}/agendas`, {
          title: ag.title,
          ...(ag.minutes !== "" ? { estimated_minutes: ag.minutes } : {}),
        });
      }
      setModalOpen(null);
      setNewTopic("");
      setNewMeetingType("regular");
      setNewDate(todayStr());
      setNewTime(nowTimeStr());
      setNewAgendaList([]);
      setNewAgendaInput("");
      setNewAgendaMinutes("");
      showToast("새 회의가 생성되었습니다");
      await loadMeetings();
      setSelectedId(created.id);
    } catch (e) {
      showToast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  // "지금 바로 시작" — 날짜/시간 입력 없이 현재 시각으로 생성 후 곧바로 시작하고
  // 회의 창(보조 창)을 연다. 헤드셋 안내 모달 확인 후 호출된다.
  async function startMeetingNow() {
    if (!team || quickStarting) return;
    if (!quickMinutes) {
      showToast("예상 소요 시간을 입력해 주세요", "error");
      return;
    }
    setQuickStarting(true);
    try {
      const created = await apiPost<Meeting>("/meetings", {
        team_id: team.id,
        scheduled_at: new Date().toISOString(),
        total_minutes: quickMinutes,
        topic: quickTopic.trim() || undefined,
        meeting_type: quickMeetingType,
      });
      for (const ag of quickAgendaList) {
        await apiPost(`/meetings/${created.id}/agendas`, {
          title: ag.title,
          ...(ag.minutes !== "" ? { estimated_minutes: ag.minutes } : {}),
        });
      }
      await apiPost(`/meetings/${created.id}/start`);
      closeQuickstartModal();
      await loadMeetings();
      setSelectedId(created.id);
      const win = openCompanion(created.id, team.id);
      if (!window.mooimhacha?.isElectron && win === null) {
        showToast(
          "회의는 시작됐지만 팝업이 차단됐어요. 회의실 탭에서 회의 창을 다시 열어주세요.",
          "error",
        );
      } else {
        showToast("회의가 시작되었습니다");
      }
    } catch (e) {
      showToast((e as Error).message, "error");
    } finally {
      setQuickStarting(false);
    }
  }

  async function addAgenda() {
    if (!selectedId || busy) return;
    if (!agTitle.trim()) {
      showToast("아젠다 내용을 입력해 주세요", "error");
      return;
    }
    setBusy(true);
    try {
      await apiPost(`/meetings/${selectedId}/agendas`, {
        title: agTitle.trim(),
        estimated_minutes: agMinutes || 10,
      });
      setAgendas(await apiGet<Agenda[]>(`/meetings/${selectedId}/agendas`));
      setModalOpen(null);
      setAgTitle("");
      showToast("아젠다가 추가되었습니다");
      const ch = createCompanionChannel();
      ch.postMessage({ type: "agenda:added", meeting_id: selectedId });
      ch.close();
    } catch (e) {
      showToast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  // 회의 시작 — 서버가 호출 시점을 t0_timestamp(시각 동기화 기준점)로 저장한다
  async function startMeeting() {
    if (!selected || !team || busy) return;
    setBusy(true);
    try {
      await apiPost(`/meetings/${selected.id}/start`);
      // 시작자도 바로 참여(출석)되도록 회의 창을 즉시 연다 — 런처와 동일 동작.
      // 출석은 회의 창이 WS meeting:join 을 보내는 시점에 기록된다.
      const win = openCompanion(selected.id, team.id);
      if (!window.mooimhacha?.isElectron && win === null) {
        showToast(
          "회의는 시작됐지만 팝업이 차단됐어요. 회의실 탭에서 회의 창을 다시 열어주세요.",
          "error",
        );
      } else {
        showToast("회의가 시작되었습니다");
      }
      await loadMeetings();
    } catch (e) {
      showToast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function endMeeting() {
    if (!selected || busy) return;
    setBusy(true);
    try {
      await apiPost(`/meetings/${selected.id}/end`);
      showToast("회의가 종료되었습니다. 기여도가 산정돼요");
      await loadMeetings();
    } catch (e) {
      showToast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function attendMeeting() {
    if (!selected || !team || joiningMeeting) return;
    setJoiningMeeting(true);
    try {
      const res = await apiPost<{ ok: true; alreadyJoined: boolean }>(
        `/meetings/${selected.id}/attend`,
        {},
      );
      setHasJoined(true);
      const win = openCompanion(selected.id, team.id);
      if (!window.mooimhacha?.isElectron && win === null) {
        showToast(
          "참가는 완료됐지만 팝업이 차단됐어요. 회의실 탭에서 회의 창을 다시 열어주세요.",
          "error",
        );
      } else if (!res.alreadyJoined) {
        showToast("참가 완료!");
      }
      if (!res.alreadyJoined) {
        setJoinedCount((c) => c + 1);
      }
    } catch (e) {
      showToast((e as Error).message, "error");
    } finally {
      setJoiningMeeting(false);
    }
  }

  async function refreshDetail() {
    if (!selectedId || refreshing) return;
    setRefreshing(true);
    try {
      await loadMeetings();
      const [ag, sp, dc] = await Promise.allSettled([
        apiGet<Agenda[]>(`/meetings/${selectedId}/agendas`),
        apiGet<{ scores: MeetingContribution[] }>(
          `/meetings/${selectedId}/contributions`,
        ),
        apiGet<Decision[]>(`/decisions?meeting_id=${selectedId}`),
      ]);
      if (ag.status === "fulfilled") setAgendas(ag.value);
      if (sp.status === "fulfilled") setSpeak(sp.value.scores);
      if (dc.status === "fulfilled") setDecisions(dc.value);
      setTranscript(null);
      if (selected?.status === "ended") {
        await loadAttendance(selectedId);
        await loadPendingTasks();
      }
    } finally {
      setRefreshing(false);
    }
  }

  // status → CSS 클래스/레이블 매핑. as const로 유니온 키 타입 접근 보장.
  const spillCls = {
    active: "spill-live",
    scheduled: "spill-soon",
    ended: "spill-done",
  } as const;
  const spillLabel = {
    active: "진행",
    scheduled: "예정",
    ended: "완료",
  } as const;
  const groups = useMemo(
    () => [
      {
        label: "진행 중",
        items: meetings.filter((m) => m.status === "active"),
      },
      {
        label: "예정",
        items: meetings.filter((m) => m.status === "scheduled"),
      },
      {
        label: "완료",
        items: [...meetings]
          .filter((m) => m.status === "ended")
          .sort((a, b) => {
            const ta = a.ended_at ?? a.scheduled_at;
            const tb = b.ended_at ?? b.scheduled_at;
            return new Date(tb).getTime() - new Date(ta).getTime();
          }),
      },
    ],
    [meetings],
  );

  const [speakDistOpen, setSpeakDistOpen] = useState(true);

  // 발언 경고: 비중 10% 미만 멤버 (전체)
  const lowSpeakers = speak.filter(
    (s) => s.speech_ratio != null && s.speech_ratio < 0.1,
  );

  // 요약 탭 — AI 제안 태스크 확정 모달 열기 (입력값 초기화)
  function openConfirmTask(task: ActionItem) {
    setConfirmTask(task);
    setConfirmDesc(task.description);
    setConfirmAssignee("");
    setConfirmDue(todayStr());
    setConfirmTime(nowTimeStr());
    setConfirmStatus("할 일");
    setConfirmDifficulty(2);
  }

  // 요약 탭 — AI 제안 태스크 제거 (낙관적, 실패 시 롤백)
  async function removePendingTask(task: ActionItem) {
    setPendingTasks((prev) => prev.filter((t) => t.id !== task.id));
    try {
      await apiDelete(`/action-items/${task.id}`);
    } catch (e) {
      setPendingTasks((prev) => [...prev, task]);
      showToast((e as Error).message, "error");
    }
  }

  // 요약 탭 — AI 회의록 생성/재생성
  async function summarizeMeeting() {
    setBusy(true);
    try {
      const res = await apiPost<{ summarized: boolean; reason?: string }>(
        `/meetings/${selectedId}/summarize`,
      );
      if (!res.summarized) {
        showToast(
          res.reason === "llm_not_configured"
            ? "API 키가 설정되지 않았습니다."
            : "요약에 실패했어요. 다시 시도해 주세요.",
          "error",
        );
      } else {
        await loadMeetings();
        await loadPendingTasks();
        showToast("회의가 요약됐습니다.");
      }
    } catch (e) {
      showToast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="meeting-layout" data-tour="mt-layout">
        {/* 사이드바 */}
        <div className="msidebar" data-tour="mt-sidebar">
          <div className="msb-head">
            <span>회의 목록</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setModalOpen("quickstart")}
                title="지금 바로 회의 시작"
              >
                <i className="ti ti-bolt" /> 바로 시작
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setModalOpen("meeting")}
                data-tour="mt-new"
              >
                <i className="ti ti-plus" />
              </button>
            </div>
          </div>
          <div className="msb-list scroll">
            {meetings.length === 0 && (
              <div
                style={{
                  padding: 14,
                  fontSize: 12.5,
                  color: "var(--text-soft)",
                }}
              >
                아직 회의가 없습니다. + 버튼으로 만들어 보세요.
              </div>
            )}
            {groups.map(
              ({ label, items }) =>
                items.length > 0 && (
                  <div key={label}>
                    <div className="msb-group">{label}</div>
                    {items.map((m) => {
                      const sum =
                        m.status === "ended" ? summaries.get(m.id) : undefined;
                      const attBadge = sum ? ATT_BADGE[sum.my_status] : null;
                      // 내가 아직 동의 안 한 결석 사유가 있으면 카드에 ! 표시
                      // (사이드바 '회의' 메뉴의 ! 와 동일 기준 = pending_count)
                      const hasTodo =
                        (summaries.get(m.id)?.pending_count ?? 0) > 0;
                      return (
                        <div
                          key={m.id}
                          className={`mcard ${m.id === selectedId ? "sel" : ""}`}
                          onClick={() => setSelectedId(m.id)}
                          style={{ cursor: "pointer" }}
                        >
                          <div className="mcard-top">
                            <div className="mcard-name">
                              {m.topic ?? "제목 없는 회의"}
                            </div>
                            {/* 처리할 일(미처리 결석 동의) 있는 회의 표시 */}
                            {hasTodo && (
                              <span
                                className="nav-alert"
                                title="처리할 일이 있어요"
                              >
                                !
                              </span>
                            )}
                            {/* 완료 옆에 내 출결 표시 */}
                            {attBadge && (
                              <span
                                className="mcard-att"
                                style={{
                                  color: attBadge.color,
                                  background: attBadge.bg,
                                }}
                              >
                                {attBadge.label}
                              </span>
                            )}
                            <span className={`spill ${spillCls[m.status]}`}>
                              {spillLabel[m.status]}
                            </span>
                          </div>
                          <div className="mcard-meta">
                            {meetingMeta(
                              m,
                              team?.member_count ?? 0,
                              summaries.get(m.id)?.attended_count,
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ),
            )}
          </div>
        </div>

        {/* 상세 */}
        <div className="mdetail">
          {!selected ? (
            <div
              style={{ padding: 24, fontSize: 12.5, color: "var(--text-soft)" }}
            >
              왼쪽에서 회의를 선택하거나 새 회의를 만들어 보세요.
            </div>
          ) : (
            <>
              <div className="mdetail-head">
                <div className="mdh-top">
                  <div className="mdh-top-left">
                    <div className="mdh-title">
                      {selected.topic ?? "제목 없는 회의"}
                    </div>
                    <div className="mdh-badges">
                      <span className={`spill ${spillCls[selected.status]}`}>
                        {spillLabel[selected.status]}
                      </span>
                      <span
                        className={`mdh-type-badge mdh-type-${selected.meeting_type}`}
                      >
                        {selected.meeting_type === "regular"
                          ? "전체 회의"
                          : "부분 회의"}
                      </span>
                      {selected.status === "ended" &&
                        summaries.get(selected.id)?.attended_count != null && (
                          <span className="mdh-attended-count">
                            <i className="ti ti-user" />
                            {summaries.get(selected.id)!.attended_count}명
                          </span>
                        )}
                    </div>
                  </div>
                  <div
                    style={{ display: "flex", gap: 8, alignItems: "center" }}
                  >
                    <button
                      className="btn btn-sm"
                      onClick={() => void refreshDetail()}
                      disabled={refreshing}
                      title="새로고침"
                    >
                      <i
                        className={`ti ${refreshing ? "ti-loader-2" : "ti-refresh"}`}
                      />
                    </button>
                    {selected.status === "scheduled" && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                          setHeadsetAction("start");
                          setModalOpen("headset");
                        }}
                        disabled={busy}
                      >
                        <i className="ti ti-player-play" /> 회의 시작
                      </button>
                    )}
                    {selected.status === "active" && hasJoined === true && (
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => void endMeeting()}
                        disabled={busy}
                      >
                        <i className="ti ti-player-stop" /> 회의 종료
                      </button>
                    )}
                    {selected.status === "active" && hasJoined !== true && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                          setHeadsetAction("attend");
                          setModalOpen("headset");
                        }}
                        disabled={joiningMeeting || hasJoined === null}
                      >
                        <i className="ti ti-login" />{" "}
                        {joiningMeeting ? "참가 중…" : "회의 참여"}
                      </button>
                    )}
                  </div>
                </div>
                <div className="mdh-meta">
                  <div className="mdh-meta-dates">
                    <i className="ti ti-calendar" />
                    <span>
                      {(() => {
                        const d = new Date(selected.scheduled_at);
                        const today = new Date();
                        const day =
                          d.toDateString() === today.toDateString()
                            ? "오늘"
                            : `${d.getMonth() + 1}월 ${d.getDate()}일`;
                        const t = d.toLocaleTimeString("ko-KR", {
                          hour: "numeric",
                          minute: "2-digit",
                        });
                        return `${day} ${t} 예정`;
                      })()}
                    </span>
                    {selected.status === "ended" &&
                      selected.t0_timestamp &&
                      selected.ended_at && (
                        <>
                          <span />
                          <span>
                            {(() => {
                              const tf = (d: Date) =>
                                d.toLocaleTimeString("ko-KR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                });
                              const s = new Date(selected.t0_timestamp!);
                              const e = new Date(selected.ended_at!);
                              const today = new Date();
                              const day =
                                s.toDateString() === today.toDateString()
                                  ? "오늘"
                                  : `${s.getMonth() + 1}월 ${s.getDate()}일`;
                              const min = Math.round(
                                (e.getTime() - s.getTime()) / 60000,
                              );
                              const dur =
                                min >= 60
                                  ? `${Math.floor(min / 60)}시간${min % 60 ? ` ${min % 60}분` : ""}`
                                  : `${min}분`;
                              return `${day} ${tf(s)} ~ ${tf(e)} (${dur})`;
                            })()}
                          </span>
                        </>
                      )}
                  </div>
                  {selected.status !== "ended" && (
                    <span>
                      <i className="ti ti-users" /> {joinedCount}명
                    </span>
                  )}
                  {selected.status === "active" && (
                    <span style={{ color: "var(--coral)", fontWeight: 700 }}>
                      <i className="ti ti-clock" /> {fmt(elapsed)}
                    </span>
                  )}
                  {selected.status === "active" && (
                    <span
                      className="mdh-companion-link"
                      onClick={() => openCompanion(selected.id, team!.id)}
                    >
                      <i className="ti ti-external-link" /> 회의 창 열기
                    </span>
                  )}
                </div>
                <div className="tabs">
                  {(
                    [
                      "agenda",
                      "speak",
                      "attendance",
                      "decision",
                      "summary",
                    ] as Tab[]
                  ).map((t) => (
                    <div
                      key={t}
                      className={`tab ${tab === t ? "active" : ""}`}
                      onClick={() => setTab(t)}
                    >
                      {
                        (
                          {
                            agenda: "아젠다",
                            speak: "발언 기록",
                            attendance: "출결",
                            decision: "결정 사항",
                            summary: "회의 요약",
                          } as Record<string, string>
                        )[t]
                      }
                    </div>
                  ))}
                  <div
                    style={{
                      width: 1,
                      background: "var(--border-2)",
                      margin: "8px 6px",
                    }}
                  />
                  <div
                    className={`tab ${tab === "settings" ? "active" : ""}`}
                    onClick={() => setTab("settings")}
                  >
                    회의 설정
                  </div>
                </div>
              </div>

              <div className="tab-body scroll">
                {/* 아젠다 */}
                {tab === "agenda" && (
                  <AgendaTab
                    prevDecisions={prevDecisions}
                    prevMeetingLabel={prevMeeting?.topic ?? "이전 회의"}
                    agendas={agendas}
                    fmtAgTime={fmtAgTime}
                    canAddAgenda={selected.status !== "ended"}
                    onAddAgenda={() => setModalOpen("agenda")}
                  />
                )}

                {/* 발언 기록 */}
                {tab === "speak" && (
                  <SpeakTab
                    selected={selected}
                    speak={speak}
                    speakDistOpen={speakDistOpen}
                    onToggleDist={() => setSpeakDistOpen((v) => !v)}
                    lowSpeakers={lowSpeakers}
                    transcript={transcript}
                    nicknameMap={nicknameMap}
                    memberIdx={memberIdx}
                    fmt={fmt}
                  />
                )}

                {/* 출결 */}
                {tab === "attendance" && (
                  <AttendanceTab
                    teamSettings={teamSettings}
                    selected={selected}
                    attendance={attendance}
                    meId={me?.id}
                    nicknameMap={nicknameMap}
                    memberIdx={memberIdx}
                    busy={busy}
                    onConsentAbsence={(id) => void consentAbsence(id)}
                    onCancelConsent={(id) => void cancelConsent(id)}
                    onInputAbsence={() => {
                      setAbsenceInput("");
                      setModalOpen("absence");
                    }}
                  />
                )}

                {/* 결정 사항 */}
                {tab === "decision" && (
                  <DecisionTab
                    decisions={decisions}
                    onAddDecision={() => {
                      setEditingDecision(null);
                      setDecInput("");
                      setModalOpen("decision");
                    }}
                    onEditDecision={(d) => {
                      setEditingDecision(d);
                      setDecInput(d.content);
                      setModalOpen("decision");
                    }}
                    onDeleteDecision={(d) => setDeletingDecision(d)}
                  />
                )}

                {/* 회의 요약 */}
                {tab === "summary" && (
                  <SummaryTab
                    selected={selected}
                    pendingTasks={pendingTasks}
                    busy={busy}
                    onConfirmTask={openConfirmTask}
                    onRemoveTask={removePendingTask}
                    onSummarize={summarizeMeeting}
                  />
                )}

                {/* 회의 설정 */}
                {tab === "settings" && (
                  <SettingsTab
                    selectedStatus={selected.status}
                    editTopic={editTopic}
                    setEditTopic={setEditTopic}
                    editMeetingType={editMeetingType}
                    setEditMeetingType={setEditMeetingType}
                    editDate={editDate}
                    setEditDate={setEditDate}
                    editTime={editTime}
                    setEditTime={setEditTime}
                    editMinutes={editMinutes}
                    setEditMinutes={setEditMinutes}
                    editSaving={editSaving}
                    onSave={() => void saveMeetingSettings()}
                    onDelete={() => setDeletingMeeting(true)}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 회의 입장 전 헤드셋 권장 안내 — 보조 창을 열기 전에 띄우고, 확인 시 시작 진행 */}
      {modalOpen === "headset" && (
        <HeadsetGateModal
          onClose={() => setModalOpen(null)}
          onConfirm={() => {
            setModalOpen(null);
            if (headsetAction === "start") {
              void startMeeting();
            } else if (headsetAction === "quickstart") {
              void startMeetingNow();
            } else {
              void attendMeeting();
            }
          }}
        />
      )}

      {/* 새 회의 모달 */}
      {modalOpen === "meeting" && (
        <NewMeetingModal
          busy={busy}
          onClose={closeMeetingModal}
          onCreate={() => void createMeeting()}
          newTopic={newTopic}
          setNewTopic={setNewTopic}
          newMeetingType={newMeetingType}
          setNewMeetingType={setNewMeetingType}
          newDate={newDate}
          setNewDate={setNewDate}
          newTime={newTime}
          setNewTime={setNewTime}
          newMinutes={newMinutes}
          setNewMinutes={setNewMinutes}
          newAgendaList={newAgendaList}
          newAgendaInput={newAgendaInput}
          setNewAgendaInput={setNewAgendaInput}
          newAgendaMinutes={newAgendaMinutes}
          setNewAgendaMinutes={setNewAgendaMinutes}
          addAgendaToList={addAgendaToList}
          removeAgendaFromList={removeAgendaFromList}
        />
      )}

      {/* 지금 바로 시작 모달 — 날짜/시간 없이 즉시 생성 후 시작 */}
      {modalOpen === "quickstart" && (
        <QuickStartModal
          quickStarting={quickStarting}
          onClose={closeQuickstartModal}
          onStart={() => {
            if (!quickMinutes) {
              showToast("예상 소요 시간을 입력해 주세요", "error");
              return;
            }
            setHeadsetAction("quickstart");
            setModalOpen("headset");
          }}
          quickTopic={quickTopic}
          setQuickTopic={setQuickTopic}
          quickMeetingType={quickMeetingType}
          setQuickMeetingType={setQuickMeetingType}
          quickMinutes={quickMinutes}
          setQuickMinutes={setQuickMinutes}
          quickAgendaList={quickAgendaList}
          quickAgendaInput={quickAgendaInput}
          setQuickAgendaInput={setQuickAgendaInput}
          quickAgendaMinutes={quickAgendaMinutes}
          setQuickAgendaMinutes={setQuickAgendaMinutes}
          addQuickAgendaToList={addQuickAgendaToList}
          removeQuickAgendaFromList={removeQuickAgendaFromList}
        />
      )}

      {/* 결정 사항 모달 (추가/수정 겸용) */}
      {modalOpen === "decision" && (
        <DecisionModal
          isEditing={!!editingDecision}
          busy={busy}
          decInput={decInput}
          setDecInput={setDecInput}
          onClose={() => {
            setModalOpen(null);
            setEditingDecision(null);
          }}
          onSave={() => void saveDecision()}
        />
      )}

      {/* 결석 사유 입력 모달 */}
      {modalOpen === "absence" && (
        <AbsenceModal
          busy={busy}
          absenceInput={absenceInput}
          setAbsenceInput={setAbsenceInput}
          onClose={() => {
            setModalOpen(null);
            setAbsenceInput("");
          }}
          onSubmit={() => void saveAbsence()}
        />
      )}

      {/* 결정 삭제 확인 모달 */}
      {deletingDecision && (
        <ConfirmModal
          title="결정 사항 삭제"
          message={
            <>
              “{deletingDecision.content}”
              <br />이 결정을 삭제할까요? 되돌릴 수 없습니다.
            </>
          }
          confirmLabel="삭제"
          danger
          busy={busy}
          onConfirm={() => void deleteDecision()}
          onClose={() => setDeletingDecision(null)}
        />
      )}

      {/* 회의 삭제 확인 모달 */}
      {deletingMeeting && (
        <DeleteMeetingModal
          busy={busy}
          deleteConfirmInput={deleteConfirmInput}
          setDeleteConfirmInput={setDeleteConfirmInput}
          onClose={() => {
            setDeletingMeeting(false);
            setDeleteConfirmInput("");
          }}
          onDelete={() => void handleDeleteMeeting()}
        />
      )}

      {/* AI 태스크 확정 모달 */}
      {confirmTask && (
        <ConfirmTaskModal
          confirmSaving={confirmSaving}
          onClose={() => setConfirmTask(null)}
          onSave={() => void saveConfirmTask()}
          members={members}
          nicknameMap={nicknameMap}
          confirmDesc={confirmDesc}
          setConfirmDesc={setConfirmDesc}
          confirmAssignee={confirmAssignee}
          setConfirmAssignee={setConfirmAssignee}
          confirmDue={confirmDue}
          setConfirmDue={setConfirmDue}
          confirmTime={confirmTime}
          setConfirmTime={setConfirmTime}
          confirmStatus={confirmStatus}
          setConfirmStatus={setConfirmStatus}
          confirmDifficulty={confirmDifficulty}
          setConfirmDifficulty={setConfirmDifficulty}
        />
      )}

      {/* 아젠다 모달 */}
      {modalOpen === "agenda" && (
        <AgendaModal
          busy={busy}
          agTitle={agTitle}
          setAgTitle={setAgTitle}
          agMinutes={agMinutes}
          setAgMinutes={setAgMinutes}
          onClose={() => setModalOpen(null)}
          onAdd={() => void addAgenda()}
        />
      )}
    </>
  );
}
