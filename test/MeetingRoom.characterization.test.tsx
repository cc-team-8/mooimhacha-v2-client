import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

// ── 가짜 소켓 / STT / ws emit 스파이를 hoisted 로 만들어 목 팩토리와 테스트가 공유 ──
const h = vi.hoisted(() => {
  type Handler = (...args: unknown[]) => void;
  const handlers = new Map<string, Handler[]>();
  const ioHandlers = new Map<string, Handler[]>();
  const reg = (m: Map<string, Handler[]>, ev: string, cb: Handler) => {
    const arr = m.get(ev) ?? [];
    arr.push(cb);
    m.set(ev, arr);
  };
  const off = (m: Map<string, Handler[]>, ev: string, cb?: Handler) => {
    if (!cb) m.delete(ev);
    else
      m.set(
        ev,
        (m.get(ev) ?? []).filter((f) => f !== cb),
      );
  };
  const socket = {
    on: (ev: string, cb: Handler) => reg(handlers, ev, cb),
    off: (ev: string, cb?: Handler) => off(handlers, ev, cb),
    connect: vi.fn(),
    disconnect: vi.fn(),
    emit: vi.fn(),
    io: {
      on: (ev: string, cb: Handler) => reg(ioHandlers, ev, cb),
      off: (ev: string, cb?: Handler) => off(ioHandlers, ev, cb),
    },
  };
  // 소켓 이벤트를 테스트에서 발화시키는 헬퍼
  const emit = (ev: string, ...args: unknown[]) =>
    (handlers.get(ev) ?? []).slice().forEach((cb) => cb(...args));
  const emitIo = (ev: string, ...args: unknown[]) =>
    (ioHandlers.get(ev) ?? []).slice().forEach((cb) => cb(...args));
  const reset = () => {
    handlers.clear();
    ioHandlers.clear();
  };
  const engine = { start: vi.fn(), stop: vi.fn(), kind: "web" as const };
  return { socket, emit, emitIo, reset, engine };
});

vi.mock("@/lib/ws", () => ({
  connectMeetingSocket: () => h.socket,
  joinMeeting: vi.fn(),
  leaveMeeting: vi.fn(),
  sendUtterance: vi.fn(),
  changeAgendaStatus: vi.fn(),
  addDecision: vi.fn(),
  addAction: vi.fn(),
  speakingStart: vi.fn(),
  speakingEnd: vi.fn(),
  reportAnomaly: vi.fn(),
}));
vi.mock("@/lib/speech", () => ({ isSpeechSupported: () => true }));
vi.mock("@/features/meeting/api/stt-engine", () => ({
  createSttEngine: () => h.engine,
}));
vi.mock("@/features/meeting/model/companion", () => ({
  createCompanionChannel: () => ({
    postMessage: vi.fn(),
    close: vi.fn(),
    onmessage: null,
  }),
}));
vi.mock("@/lib/api", () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  tryRefresh: vi.fn(async () => true),
}));

import { apiGet } from "@/lib/api";
import { sendUtterance, speakingStart } from "@/lib/ws";
import MeetingRoom from "@/features/meeting/room/MeetingRoom";

const MEETING = {
  id: 1,
  topic: "테스트 회의",
  total_minutes: 60,
  t0_timestamp: null,
  status: "active",
  scheduled_at: new Date().toISOString(),
  meeting_type: "regular",
};
const MEMBERS = [{ id: 10, user_id: 10, nickname: "홍길동", name: "홍길동" }];
const ME = { id: 10, nickname: "홍길동" };

beforeEach(() => {
  vi.clearAllMocks();
  h.reset();
  // 마이크 권한 획득 목 — 기본은 성공(가짜 스트림 반환)
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: vi
        .fn()
        .mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] }),
    },
  });
  (apiGet as unknown as ReturnType<typeof vi.fn>).mockImplementation(
    (url: string) => {
      if (url === "/meetings/1") return Promise.resolve(MEETING);
      if (url === "/meetings/1/agendas") return Promise.resolve([]);
      if (url === "/teams/2") return Promise.resolve({ members: MEMBERS });
      if (url.startsWith("/decisions")) return Promise.resolve([]);
      if (url.startsWith("/action-items")) return Promise.resolve([]);
      if (url === "/auth/me") return Promise.resolve(ME);
      return Promise.resolve(null);
    },
  );
});

async function renderRoom() {
  render(<MeetingRoom meetingId={1} teamId={2} />);
  // 초기 비동기 로드 완료 대기 (헤더에 회의 제목이 뜨면 로드된 것)
  await screen.findByText("테스트 회의");
}

describe("MeetingRoom 특성화 — 소켓 이벤트 → 화면", () => {
  it("초기 로드 시 회의 제목과 마이크 안내 배너를 렌더한다", async () => {
    await renderRoom();
    expect(screen.getByText("테스트 회의")).toBeInTheDocument();
    // micOn=false 기본 → 마이크 켜기 유도 배너
    expect(
      screen.getByText(/마이크를 켜야 발언이 기록돼요/),
    ).toBeInTheDocument();
  });

  it("disconnect 이벤트가 오면 '재접속 중' 연결 배너를 띄운다", async () => {
    await renderRoom();
    expect(screen.queryByText(/연결이 끊겨/)).not.toBeInTheDocument();
    act(() => h.emit("disconnect", "transport close"));
    expect(
      screen.getByText(/연결이 끊겨 다시 접속하는 중/),
    ).toBeInTheDocument();
  });

  it("reconnect_failed 이후에는 '새로고침 필요' 배너로 바뀐다", async () => {
    await renderRoom();
    act(() => h.emit("disconnect", "transport close"));
    act(() => h.emitIo("reconnect_failed"));
    expect(
      screen.getByText(/연결에 문제가 있어요 — 새로고침 해 주세요/),
    ).toBeInTheDocument();
  });

  it("exception 이벤트 메시지를 배너로 표면화하고 닫기로 제거한다", async () => {
    await renderRoom();
    act(() => h.emit("exception", { message: "검증에 실패했어요" }));
    expect(screen.getByText("검증에 실패했어요")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "닫기" }));
    expect(screen.queryByText("검증에 실패했어요")).not.toBeInTheDocument();
  });

  it("decision:new 이벤트로 도착한 결정이 '최근 항목'에 나타난다", async () => {
    await renderRoom();
    act(() =>
      h.emit("decision:new", { decision: { id: 99, content: "새 결정 내용" } }),
    );
    // '최근 항목'은 기본 접힘 → 헤더 클릭해 펼침
    fireEvent.click(screen.getByText("최근 항목"));
    expect(await screen.findByText("새 결정 내용")).toBeInTheDocument();
  });

  it("action:new 이벤트로 도착한 액션이 '최근 항목'에 나타난다", async () => {
    await renderRoom();
    act(() =>
      h.emit("action:new", {
        action: { id: 77, description: "새 액션 항목" },
      }),
    );
    fireEvent.click(screen.getByText("최근 항목"));
    expect(await screen.findByText("새 액션 항목")).toBeInTheDocument();
  });

  it("meeting:ended 이벤트가 오면 종료 화면으로 전이한다", async () => {
    await renderRoom();
    act(() => h.emit("meeting:ended"));
    expect(screen.getByText(/회의가 종료됐어요/)).toBeInTheDocument();
    // 진행 화면(회의 제목 헤더)은 사라진다
    expect(screen.queryByText("테스트 회의")).not.toBeInTheDocument();
  });
});

describe("MeetingRoom 특성화 — 마이크(STT) 흐름", () => {
  // 헤더 마이크 버튼(title 로 특정) 을 눌러 마이크를 켠다
  async function turnMicOn() {
    fireEvent.click(screen.getByTitle("마이크 켜기"));
    // micOn=true 가 되면 title 이 '마이크 끄기'로 바뀐다
    await screen.findByTitle("마이크 끄기");
  }

  it("마이크를 켜면 STT 엔진을 시작하고 버튼이 '듣는 중'으로 바뀐다", async () => {
    await renderRoom();
    await turnMicOn();
    expect(h.engine.start).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/듣는 중/)).toBeInTheDocument();
  });

  it("발화 시작 콜백이 speakingStart를 보내고 '말하는 중' 힌트를 표시한다", async () => {
    await renderRoom();
    await turnMicOn();
    const handlers = (h.engine.start as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    act(() => handlers.onSpeechStart());
    expect(speakingStart).toHaveBeenCalled();
    expect(screen.getByText(/말하는 중/)).toBeInTheDocument();
  });

  it("t0 수신 후 확정 발화(onFinal)를 sendUtterance로 전송한다", async () => {
    await renderRoom();
    await turnMicOn();
    // t0 가 있어야 즉시 전송(없으면 버퍼링)
    act(() => h.emit("meeting:t0", { t0_timestamp: new Date().toISOString() }));
    const handlers = (h.engine.start as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    act(() => handlers.onFinal("안녕하세요", 0.9));
    expect(sendUtterance).toHaveBeenCalled();
  });

  it("마이크 권한이 거부되면 오류 배너를 표시한다", async () => {
    await renderRoom();
    (
      navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>
    ).mockRejectedValueOnce(new Error("denied"));
    fireEvent.click(screen.getByTitle("마이크 켜기"));
    expect(
      await screen.findByText(/마이크 권한이 필요해요/),
    ).toBeInTheDocument();
  });

  it("마이크를 끄면 STT 엔진을 정지한다", async () => {
    await renderRoom();
    await turnMicOn();
    fireEvent.click(screen.getByTitle("마이크 끄기"));
    expect(h.engine.stop).toHaveBeenCalled();
    expect(await screen.findByTitle("마이크 켜기")).toBeInTheDocument();
  });
});
