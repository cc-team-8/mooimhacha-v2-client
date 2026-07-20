interface RoomHeaderProps {
  topic: string | null | undefined;
  elapsedSec: number;
  totalSec: number;
  refreshing: boolean;
  micOn: boolean;
  ending: boolean;
  onRefresh: () => void;
  onToggleMic: () => void;
  onEnd: () => void;
}

// 초 → H:MM:SS(또는 MM:SS) 표기. 헤더에서만 쓰는 순수 헬퍼라 함께 둔다.
function fmtHms(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export default function RoomHeader({
  topic,
  elapsedSec,
  totalSec,
  refreshing,
  micOn,
  ending,
  onRefresh,
  onToggleMic,
  onEnd,
}: RoomHeaderProps) {
  return (
    <header className="cmp-header">
      <div className="cmp-header__title">
        <strong>{topic ?? "회의 진행 중"}</strong>
        <span className="cmp-header__time">
          {fmtHms(elapsedSec)} / {fmtHms(totalSec)}
        </span>
      </div>
      <div className="cmp-header__actions">
        <button onClick={onRefresh} disabled={refreshing} title="새로고침">
          <i className={`ti ${refreshing ? "ti-loader-2" : "ti-refresh"}`} />
        </button>
        <button
          className={`cmp-mic-btn ${micOn ? "on" : ""}`}
          onClick={onToggleMic}
          aria-pressed={micOn}
          title={micOn ? "마이크 끄기" : "마이크 켜기"}
        >
          {micOn ? "🔴 듣는 중" : "🎙 마이크 켜기"}
        </button>
        <button className="cmp-end-btn" onClick={onEnd} disabled={ending}>
          {ending ? "종료 중…" : "회의 종료"}
        </button>
      </div>
    </header>
  );
}
