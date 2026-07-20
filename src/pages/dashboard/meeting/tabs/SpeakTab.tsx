import { avatarBg, memberColor } from "@/lib/avatarColor";
import type { Meeting, MeetingContribution, Transcript } from "@/lib/types";

interface SpeakTabProps {
  selected: Meeting;
  speak: MeetingContribution[];
  speakDistOpen: boolean;
  onToggleDist: () => void;
  lowSpeakers: MeetingContribution[];
  transcript: Transcript | null;
  nicknameMap: Map<number, string>;
  memberIdx: (userId: number) => number;
  fmt: (s: number) => string;
}

// 발언 기록 탭 — 발언 분포(접이식) + 종료 회의의 발화 기록 (표현 전용).
export default function SpeakTab({
  selected,
  speak,
  speakDistOpen,
  onToggleDist,
  lowSpeakers,
  transcript,
  nicknameMap,
  memberIdx,
  fmt,
}: SpeakTabProps) {
  return (
    <div className="tab-panel active">
      <div
        className="panel-label"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={onToggleDist}
      >
        발언 분포{" "}
        {selected.status === "active" && (
          <span className="live-dot" style={{ background: "var(--green)" }} />
        )}
        <span
          style={{
            marginLeft: "auto",
            textTransform: "none",
            letterSpacing: 0,
            color: "var(--text-soft)",
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {speakDistOpen ? "글자 수 기준" : "접힘"}
          <i
            className={`ti ${speakDistOpen ? "ti-chevron-up" : "ti-chevron-down"}`}
            style={{ fontSize: 13 }}
          />
        </span>
      </div>
      {speakDistOpen && (
        <>
          {speak.length === 0 && (
            <div className="summary-box">
              <i className="ti ti-info-circle" />
              {selected.status === "ended"
                ? "산정된 발언 기록이 없습니다."
                : "발언 분포는 회의가 종료되면 집계됩니다. 진행 중에는 회의 보조 창에서 실시간으로 확인할 수 있어요."}
            </div>
          )}
          {speak.map((s) => {
            const pct =
              s.speech_ratio == null ? 0 : Math.round(s.speech_ratio * 100);
            const warn = s.speech_ratio != null && s.speech_ratio < 0.1;
            return (
              <div key={s.user_id} className="speak-row">
                <div className="speak-head">
                  <div
                    className="av av-sm"
                    style={{ background: avatarBg(memberIdx(s.user_id)) }}
                  >
                    {(nicknameMap.get(s.user_id) ?? s.name)[0]}
                  </div>
                  <span className="speak-name">
                    {nicknameMap.get(s.user_id) ?? s.name}
                  </span>
                </div>
                <div className="speak-bar-line">
                  <span className="speak-bar">
                    <i
                      data-w={pct}
                      style={{
                        background: warn
                          ? "var(--coral)"
                          : memberColor(memberIdx(s.user_id)),
                      }}
                    />
                  </span>
                  <span
                    className="speak-pct"
                    style={warn ? { color: "var(--coral)" } : undefined}
                  >
                    {s.speech_ratio == null ? "—" : `${pct}%`}
                  </span>
                </div>
              </div>
            );
          })}
          {lowSpeakers.length > 0 && (
            <div
              className="summary-box"
              style={{
                marginTop: 14,
                background: "var(--coral-soft)",
                borderColor: "rgba(240,102,79,.4)",
              }}
            >
              <i
                className="ti ti-alert-triangle"
                style={{ color: "var(--coral)" }}
              />
              {lowSpeakers
                .map((s) => nicknameMap.get(s.user_id) ?? s.name)
                .join(", ")}
              님의 발언 비중이 10% 미만입니다. 의견을 물어봐 주세요.
            </div>
          )}
        </>
      )}
      {/* 발화 기록 — 종료된 회의만 */}
      {selected.status === "ended" && (
        <>
          <div className="panel-label" style={{ marginTop: 18 }}>
            발화 기록
          </div>
          {!transcript ? (
            <div style={{ fontSize: 12.5, color: "var(--text-soft)" }}>
              불러오는 중…
            </div>
          ) : transcript.sections.every((s) => s.groups.length === 0) ? (
            <div className="summary-box">
              <i className="ti ti-info-circle" />
              저장된 발화 기록이 없습니다.
            </div>
          ) : (
            (() => {
              const flat = transcript.sections
                .filter((s) => s.groups.length > 0)
                .flatMap((s) =>
                  s.groups.map((g) => ({
                    ...g,
                    sectionId: s.agenda_id,
                    sectionTitle: s.title,
                  })),
                )
                .sort(
                  (a, b) => a.started_at_offset_ms - b.started_at_offset_ms,
                );
              return flat.map((g, i) => {
                const showHeader =
                  i === 0 || g.sectionId !== flat[i - 1].sectionId;
                const speaker = speak.find((s) => s.user_id === g.user_id);
                return (
                  <div key={i}>
                    {showHeader && (
                      <div className="utt-section-title">{g.sectionTitle}</div>
                    )}
                    <div className="utt-row">
                      <div
                        className="av av-sm"
                        style={{ background: avatarBg(memberIdx(g.user_id)) }}
                      >
                        {
                          (speaker
                            ? (nicknameMap.get(speaker.user_id) ?? speaker.name)
                            : (nicknameMap.get(g.user_id) ?? "?"))[0]
                        }
                      </div>
                      <div className="utt-body">
                        <span className="utt-name">
                          {speaker
                            ? (nicknameMap.get(speaker.user_id) ?? speaker.name)
                            : (nicknameMap.get(g.user_id) ??
                              `사용자 ${g.user_id}`)}
                          <span className="utt-time">
                            {selected.t0_timestamp
                              ? (() => {
                                  const t0 = new Date(
                                    selected.t0_timestamp,
                                  ).getTime();
                                  const tf = (offset: number) =>
                                    new Date(t0 + offset).toLocaleTimeString(
                                      "ko-KR",
                                      {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        second: "2-digit",
                                      },
                                    );
                                  return `${tf(g.started_at_offset_ms)} ~ ${tf(g.ended_at_offset_ms)}`;
                                })()
                              : `${fmt(Math.floor(g.started_at_offset_ms / 1000))} ~ ${fmt(Math.floor(g.ended_at_offset_ms / 1000))}`}
                          </span>
                        </span>
                        <span className="utt-text">{g.text}</span>
                      </div>
                    </div>
                  </div>
                );
              });
            })()
          )}
        </>
      )}
    </div>
  );
}
