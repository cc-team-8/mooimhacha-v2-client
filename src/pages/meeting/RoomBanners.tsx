interface RoomBannersProps {
  connected: boolean;
  connLost: boolean;
  agendaHint: string | null;
  wsIssue: string | null;
  onDismissWsIssue: () => void;
  micError: string | null;
  onRetryMic: () => void;
  micOn: boolean;
  onToggleMic: () => void;
  sttIssue: string | null;
  silentHint: boolean;
  speakingSelf: boolean;
  partialText: string;
}

// 회의실 상단의 연결/마이크/STT 상태 배너 스택. 상태 값만 받아 렌더하는 표현용 컴포넌트.
export default function RoomBanners({
  connected,
  connLost,
  agendaHint,
  wsIssue,
  onDismissWsIssue,
  micError,
  onRetryMic,
  micOn,
  onToggleMic,
  sttIssue,
  silentHint,
  speakingSelf,
  partialText,
}: RoomBannersProps) {
  return (
    <>
      {!connected && (
        <div className="cmp-conn-banner">
          {connLost
            ? "🔌 연결에 문제가 있어요 — 새로고침 해 주세요."
            : "🔌 연결이 끊겨 다시 접속하는 중이에요…"}
        </div>
      )}
      {agendaHint && <div className="cmp-agenda-hint">💡 {agendaHint}</div>}
      {wsIssue && (
        <div className="cmp-mic-banner" role="alert">
          <span>{wsIssue}</span>
          <button onClick={onDismissWsIssue}>닫기</button>
        </div>
      )}
      {micError && (
        <div className="cmp-mic-banner" role="alert">
          <span>{micError}</span>
          <button onClick={onRetryMic}>다시 시도</button>
        </div>
      )}
      {!micOn && !micError && (
        <div className="cmp-mic-prompt">
          🎙 마이크를 켜야 발언이 기록돼요.{" "}
          <button onClick={onToggleMic}>마이크 켜기</button>
        </div>
      )}
      {sttIssue && <div className="cmp-silent-hint">{sttIssue}</div>}
      {micOn && !silentHint && !sttIssue && (
        <div className="cmp-listen-hint">
          {speakingSelf
            ? "● 말하는 중… 잘 인식하고 있어요"
            : "🎙 마이크 켜짐 · 발언을 기다리는 중"}
        </div>
      )}
      {partialText && <div className="cmp-partial-text">{partialText}</div>}
      {silentHint && (
        <div className="cmp-silent-hint">
          🔇 한동안 발언이 없어요. 의견을 나눠보세요.
        </div>
      )}
    </>
  );
}
