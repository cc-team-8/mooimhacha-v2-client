import { useState, useEffect } from "react";
import { useToast } from "@/hooks/useToast";
import { getUser } from "@/lib/auth";
import { apiFetch, authHeader } from "@/lib/apiFetch";
import { apiGet, apiPatch } from "@/lib/api";
import type {
  ActionItem,
  Meeting,
  TeamContribution,
  PendingConsent,
} from "@/lib/types";

export interface Team {
  id: number;
  name: string;
  course_name: string;
  my_role: "leader" | "member";
  member_count: number;
  members: { name: string; nickname?: string | null; role: string }[];
}

// 내 태스크/예정 회의에 소속 그룹 이름을 같이 표기하기 위한 합성 타입
export interface MyTask extends ActionItem {
  group: string;
}
export interface UpcomingMeeting extends Meeting {
  group: string;
  groupCls: string;
}
export interface TodoItem {
  type: "consent";
  team_id: number;
  team_name: string;
  label: string;
  created_at: string;
}

// 홈 화면의 데이터 로드/집계와 mutation(그룹 참가·태스크 완료)을 캡슐화한다.
// 인라인 fetch 를 컴포넌트에서 분리(규칙 6: 로직/UI 분리). 모달 리셋 같은 UI 상태는 호출부가 유지.
export function useHomeData() {
  const { showToast } = useToast();
  const user = getUser();
  const [teams, setTeams] = useState<Team[]>([]);
  const [tasks, setTasks] = useState<MyTask[]>([]);
  const [meetings, setMeetings] = useState<UpcomingMeeting[]>([]);
  // 그룹 카드의 '내 기여도' (team_id → 0~100 또는 null)
  const [myContrib, setMyContrib] = useState<Map<number, number | null>>(
    new Map(),
  );
  const [todos, setTodos] = useState<TodoItem[]>([]);

  const refetchTeams = () => {
    apiFetch<{ teams: Team[] }>("/api/teams", { headers: authHeader() })
      .then((data) => setTeams(data.teams))
      .catch(() => {});
  };

  useEffect(() => {
    refetchTeams();
  }, []);

  // 팀 목록이 잡히면 팀별 데이터(내 태스크·예정 회의·내 기여도)를 모아온다
  useEffect(() => {
    if (teams.length === 0 || !user) return;
    let alive = true;
    void Promise.allSettled(
      teams.map(async (t) => {
        const badgeCls = t.my_role === "leader" ? "b-green" : "b-blue";
        const [ts, ms, cs, consents] = await Promise.allSettled([
          apiGet<ActionItem[]>(
            `/action-items?team_id=${t.id}&assignee_id=${user.id}&confirmed=true`,
          ),
          apiGet<Meeting[]>(`/meetings?team_id=${t.id}`),
          apiGet<{ members: TeamContribution[] }>(
            `/teams/${t.id}/contributions`,
          ),
          apiGet<PendingConsent[]>(`/teams/${t.id}/pending-consents`),
        ]);
        return {
          team: t,
          tasks:
            ts.status === "fulfilled"
              ? ts.value
                  .filter(
                    (a) => a.status === "todo" || a.status === "in_progress",
                  )
                  .map((a) => ({ ...a, group: t.name }))
              : [],
          meetings:
            ms.status === "fulfilled"
              ? ms.value
                  .filter(
                    (m) => m.status === "scheduled" || m.status === "active",
                  )
                  .map((m) => ({ ...m, group: t.name, groupCls: badgeCls }))
              : [],
          contrib:
            cs.status === "fulfilled"
              ? (cs.value.members.find((c) => c.user_id === user.id)
                  ?.composite_score ?? null)
              : null,
          todos: [
            ...(consents.status === "fulfilled"
              ? consents.value.map((c) => ({
                  type: "consent" as const,
                  team_id: t.id,
                  team_name: t.name,
                  label: `${c.user_name} · ${c.meeting_topic}`,
                  created_at: c.created_at,
                }))
              : []),
          ],
        };
      }),
    ).then((results) => {
      if (!alive) return;
      const ok = results
        .filter(
          (
            r,
          ): r is PromiseFulfilledResult<{
            team: Team;
            tasks: MyTask[];
            meetings: UpcomingMeeting[];
            contrib: number | null;
            todos: TodoItem[];
          }> => r.status === "fulfilled",
        )
        .map((r) => r.value);
      setTasks(
        ok
          .flatMap((r) => r.tasks)
          .sort((a, b) => {
            if (!a.due_date) return 1;
            if (!b.due_date) return -1;
            return (
              new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
            );
          }),
      );
      setMeetings(
        ok
          .flatMap((r) => r.meetings)
          .sort((a, b) => {
            // 진행 중 우선, 이후 가까운 일정 순
            if (a.status !== b.status) return a.status === "active" ? -1 : 1;
            return (
              new Date(a.scheduled_at).getTime() -
              new Date(b.scheduled_at).getTime()
            );
          })
          .slice(0, 6),
      );
      setTodos(
        ok
          .flatMap((r) => r.todos)
          .sort(
            (a, b) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime(),
          ),
      );
      setMyContrib(
        new Map(
          ok.map((r) => [
            r.team.id,
            r.contrib == null ? null : Math.round(r.contrib * 100),
          ]),
        ),
      );
    });
    return () => {
      alive = false;
    };
    // user는 토큰에서 파싱되는 고정값이라 의존성에서 제외
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teams]);

  // 초대코드로 그룹 참가 — 성공 시 목록 갱신하고 true 반환(호출부가 모달 정리).
  async function joinTeam(joinCode: string): Promise<boolean> {
    if (joinCode.length !== 8) {
      showToast("초대코드 8자리를 입력해주세요");
      return false;
    }
    try {
      const data = await apiFetch<{ name: string }>("/api/teams/join", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ invite_code: joinCode }),
      });
      showToast(`${data.name} 참가 완료`);
      refetchTeams();
      return true;
    } catch (err) {
      showToast((err as Error).message || "참가 요청 실패");
      return false;
    }
  }

  // 태스크 완료 — 낙관적 제거 후 실패 시 롤백
  async function completeTask(task: MyTask) {
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    try {
      await apiPatch(`/action-items/${task.id}`, { status: "done" });
      showToast("태스크를 완료했습니다");
    } catch (err) {
      setTasks((prev) => [...prev, task]);
      showToast((err as Error).message, "error");
    }
  }

  return {
    teams,
    tasks,
    meetings,
    myContrib,
    todos,
    refetchTeams,
    joinTeam,
    completeTask,
  };
}
