import Modal from "@/components/Modal";
import type { AgendaItem } from "@/features/meeting/model/useAgendaBuilder";
import AgendaBuilderField from "./AgendaBuilderField";

interface QuickStartModalProps {
  quickStarting: boolean;
  onClose: () => void;
  onStart: () => void;
  quickTopic: string;
  setQuickTopic: (v: string) => void;
  quickMeetingType: "regular" | "partial";
  setQuickMeetingType: (v: "regular" | "partial") => void;
  quickMinutes: number | "";
  setQuickMinutes: (v: number | "") => void;
  quickAgendaList: AgendaItem[];
  quickAgendaInput: string;
  setQuickAgendaInput: (v: string) => void;
  quickAgendaMinutes: number | "";
  setQuickAgendaMinutes: (v: number | "") => void;
  addQuickAgendaToList: () => void;
  removeQuickAgendaFromList: (i: number) => void;
}

// 지금 바로 시작 모달 — 폼 상태는 부모(useQuickStartForm)가 소유, 시작은 onStart 콜백.
export default function QuickStartModal({
  quickStarting,
  onClose,
  onStart,
  quickTopic,
  setQuickTopic,
  quickMeetingType,
  setQuickMeetingType,
  quickMinutes,
  setQuickMinutes,
  quickAgendaList,
  quickAgendaInput,
  setQuickAgendaInput,
  quickAgendaMinutes,
  setQuickAgendaMinutes,
  addQuickAgendaToList,
  removeQuickAgendaFromList,
}: QuickStartModalProps) {
  return (
    <Modal
      title="지금 바로 시작"
      onClose={onClose}
      actions={
        <>
          <button className="btn" onClick={onClose}>
            취소
          </button>
          <button
            className="btn btn-primary"
            onClick={onStart}
            disabled={quickStarting}
          >
            {quickStarting ? "시작 중…" : "시작하기"}
          </button>
        </>
      }
    >
      <div className="modal-sub">
        지금 시각으로 회의를 만들고 곧바로 시작합니다.
      </div>
      <div className="field">
        <label className="field-label">회의 이름</label>
        <input
          className="input"
          placeholder="예) 중간 점검 회의"
          maxLength={200}
          value={quickTopic}
          onChange={(e) => setQuickTopic(e.target.value)}
          autoFocus
        />
      </div>
      <div className="field">
        <label className="field-label">회의 유형</label>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className={`btn btn-sm${quickMeetingType === "regular" ? " btn-primary" : ""}`}
            onClick={() => setQuickMeetingType("regular")}
          >
            전체 회의
          </button>
          <button
            type="button"
            className={`btn btn-sm${quickMeetingType === "partial" ? " btn-primary" : ""}`}
            onClick={() => setQuickMeetingType("partial")}
          >
            부분 회의
          </button>
        </div>
      </div>
      <div className="field">
        <label className="field-label">예상 소요 시간 (분)</label>
        <input
          className="input"
          type="number"
          min={5}
          step={5}
          value={quickMinutes}
          onChange={(e) =>
            setQuickMinutes(e.target.value === "" ? "" : Number(e.target.value))
          }
        />
      </div>
      <AgendaBuilderField
        list={quickAgendaList}
        input={quickAgendaInput}
        setInput={setQuickAgendaInput}
        minutes={quickAgendaMinutes}
        setMinutes={setQuickAgendaMinutes}
        onAdd={addQuickAgendaToList}
        onRemove={removeQuickAgendaFromList}
        titleMaxLength={200}
      />
    </Modal>
  );
}
