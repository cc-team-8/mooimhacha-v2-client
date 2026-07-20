import Modal from "@/components/Modal";
import { todayStr, timeMinForDate } from "@/lib/dateUtils";
import type { AgendaItem } from "@/features/meeting/model/useAgendaBuilder";
import AgendaBuilderField from "./AgendaBuilderField";

interface NewMeetingModalProps {
  busy: boolean;
  onClose: () => void;
  onCreate: () => void;
  newTopic: string;
  setNewTopic: (v: string) => void;
  newMeetingType: "regular" | "partial";
  setNewMeetingType: (v: "regular" | "partial") => void;
  newDate: string;
  setNewDate: (v: string) => void;
  newTime: string;
  setNewTime: (v: string) => void;
  newMinutes: number | "";
  setNewMinutes: (v: number | "") => void;
  newAgendaList: AgendaItem[];
  newAgendaInput: string;
  setNewAgendaInput: (v: string) => void;
  newAgendaMinutes: number | "";
  setNewAgendaMinutes: (v: number | "") => void;
  addAgendaToList: () => void;
  removeAgendaFromList: (i: number) => void;
}

// 새 회의 만들기 모달 — 폼 상태는 부모(useNewMeetingForm)가 소유, 저장은 onCreate 콜백.
export default function NewMeetingModal({
  busy,
  onClose,
  onCreate,
  newTopic,
  setNewTopic,
  newMeetingType,
  setNewMeetingType,
  newDate,
  setNewDate,
  newTime,
  setNewTime,
  newMinutes,
  setNewMinutes,
  newAgendaList,
  newAgendaInput,
  setNewAgendaInput,
  newAgendaMinutes,
  setNewAgendaMinutes,
  addAgendaToList,
  removeAgendaFromList,
}: NewMeetingModalProps) {
  return (
    <Modal
      title="새 회의 만들기"
      onClose={onClose}
      actions={
        <>
          <button className="btn" onClick={onClose}>
            취소
          </button>
          <button
            className="btn btn-primary"
            onClick={onCreate}
            disabled={busy}
          >
            {busy ? "생성 중…" : "회의 생성"}
          </button>
        </>
      }
    >
      <div className="modal-sub">
        아젠다를 미리 작성하면 회의 효율이 올라갑니다.
      </div>
      <div className="field">
        <label className="field-label">회의 이름</label>
        <input
          className="input"
          placeholder="예) 중간 점검 회의"
          value={newTopic}
          onChange={(e) => setNewTopic(e.target.value)}
          autoFocus
        />
      </div>
      <div className="field">
        <label className="field-label">회의 유형</label>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className={`btn btn-sm${newMeetingType === "regular" ? " btn-primary" : ""}`}
            onClick={() => setNewMeetingType("regular")}
          >
            전체 회의
          </button>
          <button
            type="button"
            className={`btn btn-sm${newMeetingType === "partial" ? " btn-primary" : ""}`}
            onClick={() => setNewMeetingType("partial")}
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
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
          />
        </div>
        <div className="field">
          <label className="field-label">시간</label>
          <input
            className="input"
            type="time"
            min={timeMinForDate(newDate)}
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
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
          value={newMinutes}
          onChange={(e) =>
            setNewMinutes(e.target.value === "" ? "" : Number(e.target.value))
          }
        />
      </div>
      <AgendaBuilderField
        list={newAgendaList}
        input={newAgendaInput}
        setInput={setNewAgendaInput}
        minutes={newAgendaMinutes}
        setMinutes={setNewAgendaMinutes}
        onAdd={addAgendaToList}
        onRemove={removeAgendaFromList}
      />
    </Modal>
  );
}
