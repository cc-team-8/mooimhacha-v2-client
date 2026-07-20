import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction, MutableRefObject } from "react";
import type { Socket } from "socket.io-client";
import {
  sendUtterance,
  speakingStart,
  speakingEnd,
  reportAnomaly,
} from "@/lib/ws";
import { isSpeechSupported } from "@/lib/speech";
import {
  createSttEngine,
  type SttEngine,
} from "@/features/meeting/api/stt-engine";

interface UseSttEngineParams {
  meetingId: number;
  socketRef: MutableRefObject<Socket | null>;
  t0Ref: MutableRefObject<number | null>;
  setMicError: Dispatch<SetStateAction<string | null>>;
  setSttIssue: Dispatch<SetStateAction<string | null>>;
  setSilentHint: Dispatch<SetStateAction<boolean>>;
}

// MeetingRoom의 마이크/STT 라이프사이클을 캡슐화한다.
// STT 전용 상태(micOn·speakingSelf·partialText)와 refs(engine·발화 버퍼 등)는 이 훅이 소유하고,
// 소켓/시각 동기화에 필요한 socketRef·t0Ref와 상태 배너 setter는 주입받는다.
export function useSttEngine({
  meetingId,
  socketRef,
  t0Ref,
  setMicError,
  setSttIssue,
  setSilentHint,
}: UseSttEngineParams) {
  const [micOn, setMicOn] = useState(false);
  const [speakingSelf, setSpeakingSelf] = useState(false);
  const [partialText, setPartialText] = useState("");

  const engineRef = useRef<SttEngine | null>(null);
  const speechStartRef = useRef<number>(Date.now());
  const lastSpokeRef = useRef<number>(Date.now());
  // t0 미수신 상태에서 확정된 발화는 절대시각으로 버퍼링했다가 t0 도착 시 flush
  const pendingRef = useRef<
    {
      text: string;
      confidence: number | null;
      startAbs: number;
      endAbs: number;
    }[]
  >([]);

  // t0 도착 시 버퍼링된 발화를 상대 오프셋으로 변환해 일괄 전송
  const flushPending = useCallback(
    (t0: number) => {
      const s = socketRef.current;
      if (!s) return;
      const items = pendingRef.current;
      pendingRef.current = [];
      for (const it of items) {
        sendUtterance(s, {
          meeting_id: meetingId,
          text: it.text,
          char_count: it.text.length,
          started_at_offset_ms: Math.max(0, it.startAbs - t0),
          ended_at_offset_ms: Math.max(0, it.endAbs - t0),
          confidence: it.confidence,
        });
      }
    },
    [meetingId, socketRef],
  );

  // 확정 발화 전송 — t0 있으면 즉시, 없으면 버퍼링(시각 동기화 손상 방지)
  const sendUtteranceNow = useCallback(
    (text: string, confidence: number | null) => {
      const s = socketRef.current;
      if (!s) return;
      const startAbs = speechStartRef.current;
      const endAbs = Date.now();
      lastSpokeRef.current = endAbs;
      setSilentHint(false);
      const t0 = t0Ref.current;
      if (t0 != null) {
        sendUtterance(s, {
          meeting_id: meetingId,
          text,
          char_count: text.length,
          started_at_offset_ms: Math.max(0, startAbs - t0),
          ended_at_offset_ms: Math.max(0, endAbs - t0),
          confidence,
        });
      } else {
        pendingRef.current.push({ text, confidence, startAbs, endAbs });
      }
    },
    [meetingId, socketRef, t0Ref, setSilentHint],
  );

  // 침묵 알림(본인에게만) — 마이크 켜진 채 90초 이상 무발언이면 표시
  useEffect(() => {
    if (!micOn) {
      setSilentHint(false);
      return;
    }
    const t = setInterval(() => {
      setSilentHint(Date.now() - lastSpokeRef.current > 90_000);
    }, 5000);
    return () => clearInterval(t);
  }, [micOn, setSilentHint]);

  // 회의 종료 시 STT 정지 — endLocally 에서 호출. (setEnded 는 호출부가 처리)
  // toggleMic off 분기와 달리 speakingEnd 는 엔진이 켜져 있던 경우에만 보낸다.
  const endMic = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.stop();
      engineRef.current = null;
      const s = socketRef.current;
      if (s) speakingEnd(s, meetingId);
    }
    setSpeakingSelf(false);
    setMicOn(false);
  }, [meetingId, socketRef]);

  // STT (마이크 on/off)
  const toggleMic = useCallback(async () => {
    if (micOn) {
      engineRef.current?.stop();
      engineRef.current = null;
      const s = socketRef.current;
      if (s) speakingEnd(s, meetingId);
      setSpeakingSelf(false);
      setPartialText("");
      setMicOn(false);
      return;
    }
    setMicError(null);
    setSttIssue(null);
    const isElectron = !!window.mooimhacha?.isElectron;
    if (!isElectron && !isSpeechSupported()) {
      setMicError(
        "이 브라우저는 음성 인식을 지원하지 않아요. Chrome/Edge에서 열어 주세요.",
      );
      return;
    }
    // 브라우저: 마이크 권한·동의 + 에코/노이즈 억제 제약 적용 (docs/05). Electron은 사이드카가 캡처.
    if (!isElectron) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        // 권한·디바이스 확인용 — Web Speech 가 자체 스트림을 열므로 즉시 정리
        stream.getTracks().forEach((t) => t.stop());
      } catch {
        setMicError(
          "마이크 권한이 필요해요. 주소창 왼쪽 자물쇠 → 마이크 → 허용 후 ‘다시 시도’를 눌러 주세요.",
        );
        return;
      }
    }

    const engine = createSttEngine();
    engine.start({
      onSpeechStart: () => {
        speechStartRef.current = Date.now();
        setSpeakingSelf(true);
        const s = socketRef.current;
        if (s) speakingStart(s, meetingId);
      },
      onSpeechEnd: () => {
        setSpeakingSelf(false);
        const s = socketRef.current;
        if (s) speakingEnd(s, meetingId);
      },
      onPartial: (text) => setPartialText(text),
      onFinal: (text, confidence) => {
        setPartialText("");
        setSttIssue(null);
        sendUtteranceNow(text, confidence);
      },
      onFailure: (err) => {
        const s = socketRef.current;
        // 권한 거부·재시작 실패 → 마이크가 꺼지므로 복구 배너로 표면화
        if (err === "not-allowed" || err === "restart_failed") {
          setMicError(
            err === "not-allowed"
              ? "마이크 권한이 거부됐어요. 주소창 왼쪽 자물쇠 → 마이크 → 허용 후 ‘다시 시도’를 눌러 주세요."
              : "음성 인식이 잠시 끊겼어요. ‘다시 시도’를 눌러 주세요.",
          );
          engineRef.current?.stop();
          engineRef.current = null;
          setSpeakingSelf(false);
          if (s) speakingEnd(s, meetingId);
          setMicOn(false);
        } else if (err === "network") {
          // 자동 재시도 중 — 마이크는 켜둔 채 일시 배너로 알림
          setSttIssue("🌐 음성 인식 네트워크가 불안정해요. 다시 시도하는 중…");
        }
        // 실질 장애(network·restart_failed·not-allowed 등)만 서버에 손실 기록.
        // no-speech(침묵)·aborted(인식 재시작)는 정상 동작 잡음 — 보고하면 조용히 경청한
        // 사람의 신뢰도 보정이 오염되므로 보고하지 않고 자동 재시작(speech.ts onend)에 맡긴다.
        if (s && err !== "no-speech" && err !== "aborted")
          reportAnomaly(s, {
            meeting_id: meetingId,
            event_type: "stt_failure",
            metadata: { reason: err },
          });
      },
    });
    engineRef.current = engine;
    lastSpokeRef.current = Date.now();
    setMicOn(true);
  }, [micOn, meetingId, socketRef, setMicError, setSttIssue, sendUtteranceNow]);

  // 언마운트 시 STT 엔진 정리
  useEffect(() => {
    return () => engineRef.current?.stop();
  }, []);

  return { micOn, speakingSelf, partialText, toggleMic, flushPending, endMic };
}
