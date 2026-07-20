import { avatarBg } from "@/lib/avatarColor";
import type { Meeting, MeetingAttendance, TeamSettings } from "@/lib/types";
import { ATT_BADGE } from "../attendanceBadge";

interface AttendanceTabProps {
  teamSettings: TeamSettings | null;
  selected: Meeting;
  attendance: MeetingAttendance | null;
  meId: number | undefined;
  nicknameMap: Map<number, string>;
  memberIdx: (userId: number) => number;
  busy: boolean;
  onConsentAbsence: (absenceId: number) => void;
  onCancelConsent: (absenceId: number) => void;
  onInputAbsence: () => void;
}

// 출결 탭 — 종료 회의의 출결 현황 + 결석 사유·동의 액션 (표현 전용).
export default function AttendanceTab({
  teamSettings,
  selected,
  attendance,
  meId,
  nicknameMap,
  memberIdx,
  busy,
  onConsentAbsence,
  onCancelConsent,
  onInputAbsence,
}: AttendanceTabProps) {
  return (
    <div className="tab-panel active">
      <div className="panel-label">
        출결 현황
        <span
          className="info-tip"
          data-tip={`회의 시작 후 ${teamSettings?.late_threshold_minutes ?? 5}분 이내 입장 → 출석\n${teamSettings?.late_threshold_minutes ?? 5}분 초과 입장 → 지각\n입장 기록 없음 → 결석`}
        >
          <i className="ti ti-info-circle" />
        </span>
      </div>
      {selected.status !== "ended" ? (
        <div className="summary-box">
          <i className="ti ti-info-circle" />
          출결은 회의가 종료된 후 확인할 수 있어요.
        </div>
      ) : !attendance ? (
        <div style={{ fontSize: 12.5, color: "var(--text-soft)" }}>
          불러오는 중…
        </div>
      ) : (
        <>
          {attendance.members.map((mem) => {
            const badge = ATT_BADGE[mem.status];
            const isMe = meId === mem.user_id;
            const showSub =
              mem.status === "absent" ||
              mem.status === "excused" ||
              mem.status === "late";
            return (
              <div key={mem.user_id} className="att-item">
                {/* 메인 행: 아바타 · 이름 · 배지 */}
                <div className="att-row">
                  <div
                    className="av av-sm"
                    style={{ background: avatarBg(memberIdx(mem.user_id)) }}
                  >
                    {(nicknameMap.get(mem.user_id) ?? mem.name)[0]}
                  </div>
                  <span className="att-name">
                    {nicknameMap.get(mem.user_id) ?? mem.name}
                  </span>
                  <span
                    className="att-badge"
                    style={{ color: badge.color, background: badge.bg }}
                  >
                    {badge.label}
                    {mem.status === "late" &&
                      mem.late_minutes != null &&
                      ` +${mem.late_minutes}분 후 입장`}
                  </span>
                </div>
                {/* 서브 행: 사유 + 액션 (결석·지각·출석인정) */}
                {showSub && (
                  <div className="att-sub">
                    <span
                      className={`att-sub-reason${!mem.absence ? " att-sub-empty" : ""}`}
                    >
                      {mem.absence
                        ? mem.absence.reason
                        : isMe
                          ? "사유를 입력해주세요"
                          : "사유 미입력"}
                    </span>
                    <div className="att-sub-actions">
                      {/* 본인 + 사유 없음 */}
                      {isMe && !mem.absence && (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={onInputAbsence}
                        >
                          사유 입력
                        </button>
                      )}
                      {/* 본인 + pending: 동의 수 */}
                      {isMe && mem.absence?.status === "pending" && (
                        <span className="att-consent-count">
                          동의 {mem.absence.consent_count}/
                          {attendance.consent_required}
                        </span>
                      )}
                      {/* 타인 + pending: 동의/동의함 */}
                      {!isMe && mem.absence?.status === "pending" && (
                        <button
                          className={`btn btn-sm${mem.absence.my_consent ? " btn-consented" : ""}`}
                          disabled={busy}
                          onClick={() =>
                            mem.absence!.my_consent
                              ? onCancelConsent(mem.absence!.id)
                              : onConsentAbsence(mem.absence!.id)
                          }
                        >
                          {mem.absence.my_consent
                            ? `동의함 ${mem.absence.consent_count}/${attendance.consent_required}`
                            : `동의 ${mem.absence.consent_count}/${attendance.consent_required}`}
                        </button>
                      )}
                      {/* 인정됨 */}
                      {mem.absence?.status === "approved" && (
                        <span className="att-reason-ok">
                          <i className="ti ti-check" /> 인정됨
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
