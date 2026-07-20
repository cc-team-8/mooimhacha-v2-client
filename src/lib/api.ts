// 인증이 필요한 REST 호출 래퍼. access_token 을 Authorization 헤더로 싣고,
// 401 이면 refresh_token 으로 한 번 재발급 후 재시도한다.
import type { TeamDetail, TeamSettings } from "./types";

export const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  "http://localhost:3000";

export function getAccessToken(): string | null {
  return localStorage.getItem("access_token");
}

function getRefreshToken(): string | null {
  return localStorage.getItem("refresh_token");
}

function clearSession() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

// WS 핸드셰이크 등 REST 401 경로 밖에서도 토큰 선제 갱신이 필요해 export
export async function tryRefresh(): Promise<boolean> {
  const refresh_token = getRefreshToken();
  if (!refresh_token) return false;
  const res = await fetch(`${API_BASE}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token }),
  });
  if (!res.ok) return false;
  const { access_token } = (await res.json()) as { access_token: string };
  localStorage.setItem("access_token", access_token);
  return true;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE}/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (res.status === 401 && retry && (await tryRefresh())) {
    return api<T>(path, options, false);
  }
  if (res.status === 401) {
    clearSession();
    // 세션이 끊기면 어느 화면에 있든 로그인으로 돌려보낸다(로그인/콜백 제외 — 루프 방지)
    const p = window.location.pathname;
    if (p !== "/" && !p.startsWith("/auth")) {
      window.location.replace("/");
    }
    throw new ApiError(401, "로그인이 풀렸어요. 다시 로그인해 주세요.");
  }
  if (!res.ok) {
    let message =
      res.status >= 500
        ? "서버에 문제가 생겼어요. 잠시 후 다시 시도해 주세요."
        : "요청을 처리하지 못했어요. 다시 시도해 주세요.";
    try {
      const body = (await res.json()) as { message?: string | string[] };
      if (body.message)
        message = Array.isArray(body.message)
          ? body.message.join(", ")
          : body.message;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// 자주 쓰는 단축 메서드
export const apiGet = <T>(path: string) => api<T>(path);
export const apiPost = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined });
export const apiPatch = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined });
export const apiDelete = <T>(path: string) =>
  api<T>(path, { method: "DELETE" });

// ---------- 도메인별 단축 함수 (대시보드) ----------

// 발화 정정 — 본인 발화 + 종료된 회의만 (서버에서 검증, 기여도 자동 재산정)
export const updateUtterance = (
  meetingId: number,
  utteranceId: number,
  text: string,
) =>
  apiPatch<{
    utterance_id: number;
    text: string;
    char_count: number;
    recomputed: boolean;
  }>(`/meetings/${meetingId}/utterances/${utteranceId}`, { text });

// 발화 삭제 — 본인 발화 + 종료된 회의만
export const deleteUtterance = (meetingId: number, utteranceId: number) =>
  apiDelete<{ deleted: boolean; recomputed: boolean }>(
    `/meetings/${meetingId}/utterances/${utteranceId}`,
  );

// 병합 그룹 발화 일괄 정정 — 트랜잭션 + 기여도 재산정 1회.
// text가 null/빈 문자열이면 전체 삭제, 아니면 2000자 청크로 id 순서대로 분배 후 남는 id 삭제.
export const batchUpdateUtterances = (
  meetingId: number,
  utteranceIds: number[],
  text: string | null,
) =>
  apiPatch<{ updated: number; deleted: number; recomputed: boolean }>(
    `/meetings/${meetingId}/utterances/batch`,
    { utterance_ids: utteranceIds, text },
  );

// 회의 무효 처리(기여도 집계 제외) 토글 — 팀장만
export const setMeetingInvalidated = (
  meetingId: number,
  isInvalidated: boolean,
) => apiPatch(`/meetings/${meetingId}`, { is_invalidated: isInvalidated });

// 회의 삭제 — 팀장만 (서버가 발화·기여도 등 자식 레코드까지 함께 삭제)
export const deleteMeeting = (meetingId: number) =>
  apiDelete<{ deleted: boolean }>(`/meetings/${meetingId}`);

// 프로필 수정 — 서버 DTO상 university/department는 필수, email_opt_out은 선택
export const updateProfile = (body: {
  university: string;
  department: string;
  email_opt_out?: boolean;
}) =>
  apiPatch<{
    id: number;
    name: string;
    university: string | null;
    department: string | null;
    email_opt_out: boolean;
  }>("/auth/profile", body);

// 회원 탈퇴 — 개인정보 익명화 + 전 팀 탈퇴 (기여도 기록은 익명으로 보존)
export const deleteAccount = () => apiDelete("/auth/me");

// 팀 집계 규칙 수정 — 팀장만. final_task_weight는 생성 후 불변이라 보내지 않는다.
export const updateTeamSettings = (
  teamId: number,
  body: Partial<
    Pick<
      TeamSettings,
      | "punctuality_grace_ratio"
      | "presence_grace_seconds"
      | "max_utterance_chars"
      | "deadline_penalty_curve"
      | "absent_meeting_handling"
      | "min_meeting_minutes"
      | "leader_bonus_multiplier"
      | "contribution_visibility"
    >
  >,
) => apiPatch<TeamDetail>(`/teams/${teamId}`, body);

// 팀 관리
export const leaveTeam = (teamId: number) =>
  apiDelete<{ left: boolean }>(`/teams/${teamId}/members/me`);
export const removeTeamMember = (teamId: number, userId: number) =>
  apiDelete<{ deleted: boolean }>(`/teams/${teamId}/members/${userId}`);
export const transferTeamLeader = (teamId: number, userId: number) =>
  apiPatch(`/teams/${teamId}/leader`, { user_id: userId });
export const deleteTeam = (teamId: number) =>
  apiDelete<{ deleted: boolean }>(`/teams/${teamId}`);
