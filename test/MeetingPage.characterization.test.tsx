import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ── 가짜 팀 소켓 (task:update/new/delete 구독만, 발화 안 함) ──
const h = vi.hoisted(() => {
  type Handler = (...args: unknown[]) => void;
  const handlers = new Map<string, Handler[]>();
  const socket = {
    on: (ev: string, cb: Handler) => {
      const arr = handlers.get(ev) ?? [];
      arr.push(cb);
      handlers.set(ev, arr);
    },
    off: () => {},
    disconnect: vi.fn(),
  };
  const reset = () => handlers.clear();
  return { socket, reset };
});

const TEAM = {
  id: 5,
  name: "팀",
  members: [{ user_id: 1, nickname: "김철수", name: "김철수", role: "leader" }],
};

const ENDED_MEETING = {
  id: 10,
  team_id: 5,
  topic: "지난 회의",
  status: "ended",
  scheduled_at: "2020-01-01T10:00:00Z",
  ended_at: "2020-01-01T11:00:00Z",
  t0_timestamp: "2020-01-01T10:00:00Z",
  total_minutes: 60,
  summary: null,
  one_liner: null,
  meeting_type: "regular",
};

vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router-dom")>()),
  useOutletContext: () => TEAM,
}));
vi.mock("@/hooks/useCurrentUser", () => {
  const me = { id: 1 };
  return { useCurrentUser: () => me };
});
vi.mock("@/hooks/useToast", () => {
  const showToast = vi.fn();
  return { useToast: () => ({ showToast }) };
});
vi.mock("@/lib/ws", () => ({
  connectTeamSocket: () => h.socket,
  joinTeam: vi.fn(),
  leaveTeam: vi.fn(),
}));
vi.mock("@/lib/companion", () => ({
  createCompanionChannel: () => ({
    postMessage: vi.fn(),
    close: vi.fn(),
    onmessage: null,
  }),
  openCompanion: vi.fn(() => ({})),
}));
vi.mock("@/lib/api", () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(async () => ({})),
  apiPatch: vi.fn(async () => ({})),
  apiDelete: vi.fn(async () => ({})),
}));

import { apiGet } from "@/lib/api";
import MeetingPage from "@/pages/dashboard/meeting/MeetingPage";

beforeEach(() => {
  vi.clearAllMocks();
  h.reset();
  (apiGet as unknown as ReturnType<typeof vi.fn>).mockImplementation(
    (url: string) => {
      if (url === "/meetings?team_id=5")
        return Promise.resolve([ENDED_MEETING]);
      if (url.includes("/agendas"))
        return Promise.resolve([
          {
            id: 1,
            title: "아젠다 하나",
            status: "done",
            estimated_minutes: 10,
          },
        ]);
      if (url.includes("/contributions"))
        return Promise.resolve({
          scores: [{ user_id: 1, name: "김철수", speech_ratio: 0.5 }],
        });
      if (url.startsWith("/decisions"))
        return Promise.resolve([{ id: 100, content: "결정된 내용 A" }]);
      if (url.includes("/transcript")) return Promise.resolve({ sections: [] });
      if (url.includes("/attendance"))
        return Promise.resolve({
          consent_required: 2,
          members: [
            {
              user_id: 1,
              name: "김철수",
              status: "late",
              late_minutes: 7,
              absence: null,
            },
          ],
        });
      return Promise.resolve([]);
    },
  );
});

describe("MeetingPage 특성화 — 탭별 데이터 렌더", () => {
  it("종료 회의를 자동 선택하고 기본(아젠다) 탭에 아젠다를 렌더한다", async () => {
    render(<MeetingPage />);
    expect(await screen.findByText("아젠다 하나")).toBeInTheDocument();
    expect(screen.getByText("아젠다 진행")).toBeInTheDocument();
  });

  it("'결정 사항' 탭으로 전환하면 해당 회의의 결정이 나타난다", async () => {
    render(<MeetingPage />);
    await screen.findByText("아젠다 하나");
    fireEvent.click(screen.getByText("결정 사항"));
    expect(await screen.findByText("결정된 내용 A")).toBeInTheDocument();
  });

  it("'발언 기록' 탭으로 전환하면 발언자가 나타난다", async () => {
    render(<MeetingPage />);
    await screen.findByText("아젠다 하나");
    fireEvent.click(screen.getByText("발언 기록"));
    expect(await screen.findByText("김철수")).toBeInTheDocument();
  });

  it("'출결' 탭으로 전환하면 지각 배지가 나타난다", async () => {
    render(<MeetingPage />);
    await screen.findByText("아젠다 하나");
    fireEvent.click(screen.getByText("출결"));
    expect(await screen.findByText(/지각/)).toBeInTheDocument();
    expect(screen.getByText(/7분 후 입장/)).toBeInTheDocument();
  });

  it("'회의 요약' 탭으로 전환하면 요약 섹션이 나타난다", async () => {
    render(<MeetingPage />);
    await screen.findByText("아젠다 하나");
    fireEvent.click(screen.getByText("회의 요약"));
    expect(await screen.findByText("AI 회의록")).toBeInTheDocument();
    expect(screen.getByText("요약 생성")).toBeInTheDocument();
  });

  it("'회의 설정' 탭으로 전환하면 수정 폼이 회의 제목으로 채워진다", async () => {
    render(<MeetingPage />);
    await screen.findByText("아젠다 하나");
    fireEvent.click(screen.getByText("회의 설정"));
    expect(await screen.findByText("회의 정보 수정")).toBeInTheDocument();
    // 폼이 선택된 회의 제목으로 초기화됨
    expect(screen.getByDisplayValue("지난 회의")).toBeInTheDocument();
  });
});
