import Modal from "@/components/Modal";
import MemberSelect from "@/components/MemberSelect";
import { todayStr, timeMinForDate } from "@/lib/dateUtils";
import type { TeamContribution } from "@/lib/types";

type Status = "할 일" | "진행 중" | "완료";

const STATUS_CHIP_CLS: Record<Status, string> = {
  "할 일": "chip-todo",
  "진행 중": "chip-inprog",
  완료: "chip-done",
};
const DIFF_CHIPS = [
  { value: 1, label: "★ 낮음" },
  { value: 2, label: "★★ 보통" },
  { value: 3, label: "★★★ 높음" },
] as const;

interface ConfirmTaskModalProps {
  confirmSaving: boolean;
  onClose: () => void;
  onSave: () => void;
  members: TeamContribution[];
  nicknameMap: Map<number, string>;
  confirmDesc: string;
  setConfirmDesc: (v: string) => void;
  confirmAssignee: string;
  setConfirmAssignee: (v: string) => void;
  confirmDue: string;
  setConfirmDue: (v: string) => void;
  confirmTime: string;
  setConfirmTime: (v: string) => void;
  confirmStatus: Status;
  setConfirmStatus: (v: Status) => void;
  confirmDifficulty: number;
  setConfirmDifficulty: (v: number) => void;
}

// AI 제안 태스크 확정 모달 — 폼 상태는 부모(useConfirmTaskForm)가 소유, 저장은 onSave 콜백.
export default function ConfirmTaskModal({
  confirmSaving,
  onClose,
  onSave,
  members,
  nicknameMap,
  confirmDesc,
  setConfirmDesc,
  confirmAssignee,
  setConfirmAssignee,
  confirmDue,
  setConfirmDue,
  confirmTime,
  setConfirmTime,
  confirmStatus,
  setConfirmStatus,
  confirmDifficulty,
  setConfirmDifficulty,
}: ConfirmTaskModalProps) {
  return (
    <Modal
      title="태스크 확정"
      onClose={onClose}
      actions={
        <>
          <button className="btn" onClick={onClose}>
            취소
          </button>
          <button
            className="btn btn-primary"
            onClick={onSave}
            disabled={confirmSaving}
          >
            {confirmSaving ? "확정 중…" : "확정"}
          </button>
        </>
      }
    >
      <div className="modal-sub">AI가 제안한 태스크를 검토하고 확정하세요.</div>
      <div className="field">
        <label className="field-label">태스크 이름</label>
        <input
          className="input"
          value={confirmDesc}
          onChange={(e) => setConfirmDesc(e.target.value)}
        />
      </div>
      <div className="field-row">
        <div className="field">
          <label className="field-label">담당자</label>
          <MemberSelect
            members={members}
            nicknameMap={nicknameMap}
            value={confirmAssignee}
            onChange={setConfirmAssignee}
          />
        </div>
        <div className="field">
          <label className="field-label">마감일</label>
          <div className="field-row" style={{ gap: 6 }}>
            <input
              className="input"
              type="date"
              style={{ flex: 2 }}
              min={todayStr()}
              value={confirmDue}
              onChange={(e) => setConfirmDue(e.target.value)}
            />
            <input
              className="input"
              type="time"
              style={{ flex: 1 }}
              placeholder="23:59"
              min={timeMinForDate(confirmDue)}
              value={confirmTime}
              onChange={(e) => setConfirmTime(e.target.value)}
            />
          </div>
          <div className="field-hint">시간 미입력 시 23:59</div>
        </div>
      </div>
      <div className="field">
        <label className="field-label">상태</label>
        <div className="chip-row">
          {(["할 일", "진행 중", "완료"] as Status[]).map((s) => (
            <button
              key={s}
              type="button"
              className={`chip-opt ${STATUS_CHIP_CLS[s]} ${confirmStatus === s ? "active" : ""}`}
              onClick={() => setConfirmStatus(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label className="field-label">난이도</label>
        <div className="chip-row">
          {DIFF_CHIPS.map((c) => (
            <button
              key={c.value}
              type="button"
              className={`chip-opt chip-diff ${confirmDifficulty === c.value ? "active" : ""}`}
              onClick={() => setConfirmDifficulty(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
