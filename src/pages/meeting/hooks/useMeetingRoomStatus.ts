import { useState } from "react";

// 회의실의 연결/오류/힌트 상태 배너 묶음.
// 값은 소켓·STT 이펙트 콜백에서 setter로만 갱신되므로, 상태만 훅으로 옮기고
// setter 호출부(이펙트)는 컴포넌트에 그대로 둔다 → 동작 동일.
export function useMeetingRoomStatus() {
  // error 는 입장 실패(초기 로드 불가)만 — 회의 중 쓰기 실패는 wsIssue 인라인 배너로
  const [error, setError] = useState<string | null>(null);
  const [wsIssue, setWsIssue] = useState<string | null>(null);
  const [silentHint, setSilentHint] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [sttIssue, setSttIssue] = useState<string | null>(null);
  const [connected, setConnected] = useState(true);
  // 재연결이 더는 자동으로 이뤄지지 않는 상태 (reconnect_failed / 서버 강제 종료)
  const [connLost, setConnLost] = useState(false);
  return {
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
  };
}
