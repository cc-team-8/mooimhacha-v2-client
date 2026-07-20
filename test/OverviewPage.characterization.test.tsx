import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";

// ── 가짜 팀 소켓 (connect/task:new/update/delete) ──
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
  const emit = (ev: string, ...args: unknown[]) =>
    (handlers.get(ev) ?? []).slice().forEach((cb) => cb(...args));
  const reset = () => handlers.clear();
  return { socket, emit, reset };
});

const TEAM = {
  id: 5,
  name: "테스트팀",
  members: [{ user_id: 1, nickname: "나", name: "나", role: "leader" }],
};

vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router-dom")>()),
  useOutletContext: () => TEAM,
  useNavigate: () => vi.fn(),
}));
vi.mock("@/lib/ws", () => ({
  connectTeamSocket: () => h.socket,
  joinTeam: vi.fn(),
  leaveTeam: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ getUser: () => ({ id: 1 }) }));
vi.mock("@/lib/api", () => ({ apiGet: vi.fn(), apiPatch: vi.fn() }));

import { apiGet } from "@/lib/api";
import OverviewPage from "@/pages/dashboard/overview/OverviewPage";

// 과거 마감 + 미완료 → overdue
const overdueTask = (id: number, desc: string) => ({
  id,
  description: desc,
  status: "in_progress",
  due_date: "2020-01-01T00:00:00Z",
  assignee_id: 999, // 팀원 아님 → 배너는 일반 문구
  confirmed: true,
  difficulty: 2,
});

const SETTINGS = {
  final_task_weight: 50,
  weight_speech_in_meeting: 30,
  weight_attend_in_meeting: 20,
};

beforeEach(() => {
  vi.clearAllMocks();
  h.reset();
  (apiGet as unknown as ReturnType<typeof vi.fn>).mockImplementation(
    (url: string) => {
      if (url.startsWith("/meetings")) return Promise.resolve([]);
      if (url.includes("/contributions"))
        return Promise.resolve({ members: [] });
      if (url.startsWith("/action-items"))
        return Promise.resolve([overdueTask(1, "지연 태스크")]);
      if (url.includes("/settings")) return Promise.resolve(SETTINGS);
      return Promise.resolve(null);
    },
  );
});

describe("OverviewPage 특성화 — 소켓 태스크 이벤트 → 경보 배너", () => {
  it("초기 로드 시 기한 초과 태스크 1개를 경보로 표시한다", async () => {
    render(<OverviewPage />);
    expect(
      await screen.findByText(/기한 초과 태스크가 1개 있습니다/),
    ).toBeInTheDocument();
  });

  it("task:new(확정) 이벤트가 오면 경보 개수가 증가한다", async () => {
    render(<OverviewPage />);
    await screen.findByText(/기한 초과 태스크가 1개 있습니다/);
    act(() => h.emit("task:new", { action: overdueTask(2, "지연 태스크2") }));
    expect(
      await screen.findByText(/기한 초과 태스크가 2개 있습니다/),
    ).toBeInTheDocument();
  });

  it("task:delete 이벤트가 오면 해당 태스크가 목록에서 빠진다", async () => {
    render(<OverviewPage />);
    await screen.findByText(/기한 초과 태스크가 1개 있습니다/);
    act(() => h.emit("task:new", { action: overdueTask(2, "지연 태스크2") }));
    await screen.findByText(/기한 초과 태스크가 2개 있습니다/);
    act(() => h.emit("task:delete", { id: 2 }));
    expect(
      await screen.findByText(/기한 초과 태스크가 1개 있습니다/),
    ).toBeInTheDocument();
  });
});
