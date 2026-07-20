import type { Dispatch, SetStateAction } from "react";
import { todayStr, timeMinForDate } from "@/lib/dateUtils";
import type { Meeting } from "@/lib/types";

interface SettingsTabProps {
  selectedStatus: Meeting["status"];
  editTopic: string;
  setEditTopic: Dispatch<SetStateAction<string>>;
  editMeetingType: "regular" | "partial";
  setEditMeetingType: Dispatch<SetStateAction<"regular" | "partial">>;
  editDate: string;
  setEditDate: Dispatch<SetStateAction<string>>;
  editTime: string;
  setEditTime: Dispatch<SetStateAction<string>>;
  editMinutes: number | "";
  setEditMinutes: Dispatch<SetStateAction<number | "">>;
  editSaving: boolean;
  onSave: () => void;
  onDelete: () => void;
}

// 회의 설정 탭 — 회의 정보 수정 폼 + 위험 구역(삭제). 폼 상태는 부모(useEditMeetingForm)가 소유.
export default function SettingsTab({
  selectedStatus,
  editTopic,
  setEditTopic,
  editMeetingType,
  setEditMeetingType,
  editDate,
  setEditDate,
  editTime,
  setEditTime,
  editMinutes,
  setEditMinutes,
  editSaving,
  onSave,
  onDelete,
}: SettingsTabProps) {
  return (
    <div className="tab-panel active">
      <div className="panel-label">회의 정보 수정</div>
      <div className="field">
        <label className="field-label">회의 이름</label>
        <input
          className="input"
          placeholder="예) 중간 점검 회의"
          value={editTopic}
          onChange={(e) => setEditTopic(e.target.value)}
        />
      </div>
      <div className="field">
        <label className="field-label">회의 유형</label>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className={`btn btn-sm${editMeetingType === "regular" ? " btn-primary" : ""}`}
            disabled={selectedStatus === "ended"}
            onClick={() => setEditMeetingType("regular")}
          >
            전체 회의
          </button>
          <button
            type="button"
            className={`btn btn-sm${editMeetingType === "partial" ? " btn-primary" : ""}`}
            disabled={selectedStatus === "ended"}
            onClick={() => setEditMeetingType("partial")}
          >
            부분 회의
          </button>
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label className="field-label">날짜</label>
          <input
            className="input"
            type="date"
            min={todayStr()}
            value={editDate}
            disabled={selectedStatus !== "scheduled"}
            onChange={(e) => setEditDate(e.target.value)}
          />
        </div>
        <div className="field">
          <label className="field-label">시간</label>
          <input
            className="input"
            type="time"
            min={timeMinForDate(editDate)}
            value={editTime}
            disabled={selectedStatus !== "scheduled"}
            onChange={(e) => setEditTime(e.target.value)}
          />
        </div>
      </div>
      <div className="field">
        <label className="field-label">예상 소요 시간 (분)</label>
        <input
          className="input"
          type="number"
          min={5}
          step={5}
          value={editMinutes}
          disabled={selectedStatus !== "scheduled"}
          onChange={(e) =>
            setEditMinutes(e.target.value === "" ? "" : Number(e.target.value))
          }
        />
      </div>
      {selectedStatus === "active" && (
        <div className="summary-box" style={{ marginBottom: 8 }}>
          <i className="ti ti-info-circle" />
          진행 중인 회의는 이름과 회의 유형만 수정할 수 있습니다.
        </div>
      )}
      {selectedStatus === "ended" && (
        <div className="summary-box" style={{ marginBottom: 8 }}>
          <i className="ti ti-info-circle" />
          완료된 회의는 이름만 수정할 수 있습니다.
        </div>
      )}
      <button
        className="btn btn-primary"
        style={{ marginTop: 8 }}
        onClick={onSave}
        disabled={editSaving}
      >
        {editSaving ? "저장 중…" : "저장"}
      </button>
      <div
        style={{
          marginTop: 32,
          borderTop: "1px solid var(--border-2)",
          paddingTop: 16,
        }}
      >
        <div className="panel-label" style={{ color: "var(--coral)" }}>
          위험 구역
        </div>
        <button className="btn btn-danger btn-sm" onClick={onDelete}>
          <i className="ti ti-trash" /> 회의 삭제
        </button>
      </div>
    </div>
  );
}
