import { useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { apiGet, apiPatch } from "@/lib/api";
import { connectTeamSocket, joinTeam, leaveTeam } from "@/lib/ws";
import type { ActionItem, Meeting, TeamContribution } from "@/lib/types";
import type { TeamContext } from "../../DashboardPage";

interface Weights {
  final_task_weight: number;
  weight_speech_in_meeting: number;
  weight_attend_in_meeting: number;
}

// OverviewPage의 데이터 로드(회의·기여도·태스크·가중치) + 실시간 태스크 소켓 구독 +
// 태스크 완료 토글 mutation 을 캡슐화한다. 파생 계산(derived)·렌더는 컴포넌트가 담당.
export function useOverviewData(team: TeamContext | null) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [contrib, setContrib] = useState<TeamContribution[]>([]);
  const [tasks, setTasks] = useState<ActionItem[]>([]);
  const [weights, setWeights] = useState<Weights | null>(null);

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!team) return;
    let alive = true;
    void Promise.allSettled([
      apiGet<Meeting[]>(`/meetings?team_id=${team.id}`),
      apiGet<{ members: TeamContribution[] }>(
        `/teams/${team.id}/contributions`,
      ),
      apiGet<ActionItem[]>(`/action-items?team_id=${team.id}&confirmed=true`),
      apiGet<Weights>(`/teams/${team.id}/settings`),
    ]).then(([ms, cs, ts, ws]) => {
      if (!alive) return;
      if (ms.status === "fulfilled") setMeetings(ms.value);
      if (cs.status === "fulfilled")
        setContrib(
          [...cs.value.members].sort(
            (a, b) => (b.composite_score ?? -1) - (a.composite_score ?? -1),
          ),
        );
      if (ts.status === "fulfilled") setTasks(ts.value);
      if (ws.status === "fulfilled") setWeights(ws.value);
    });
    return () => {
      alive = false;
    };
  }, [team]);

  useEffect(() => {
    if (!team) return;
    const socket = connectTeamSocket();
    socketRef.current = socket;
    socket.on("connect", () => joinTeam(socket, team.id));
    socket.on("task:new", (p: { action: ActionItem }) => {
      if (!p.action.confirmed) return;
      setTasks((prev) =>
        prev.some((t) => Number(t.id) === Number(p.action.id))
          ? prev
          : [...prev, p.action],
      );
    });
    socket.on("task:update", (p: { action: ActionItem }) => {
      setTasks((prev) => {
        const idx = prev.findIndex((t) => Number(t.id) === Number(p.action.id));
        if (idx === -1) return p.action.confirmed ? [...prev, p.action] : prev;
        const next = [...prev];
        next[idx] = p.action;
        return next;
      });
    });
    socket.on("task:delete", (p: { id: number }) => {
      setTasks((prev) => prev.filter((t) => Number(t.id) !== Number(p.id)));
    });
    return () => {
      leaveTeam(socket, team.id);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [team]);

  // 태스크 완료/미완료 토글 — 낙관적 갱신 후 실패 시 롤백
  async function toggleTask(t: ActionItem) {
    const next = t.status === "done" ? "todo" : "done";
    setTasks((prev) =>
      prev.map((x) => (x.id === t.id ? { ...x, status: next } : x)),
    );
    try {
      await apiPatch(`/action-items/${t.id}`, { status: next });
    } catch {
      setTasks((prev) =>
        prev.map((x) => (x.id === t.id ? { ...x, status: t.status } : x)),
      );
    }
  }

  return { meetings, contrib, tasks, weights, toggleTask };
}
