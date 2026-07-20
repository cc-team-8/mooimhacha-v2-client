import Modal from "@/components/Modal";

interface AbsenceModalProps {
  busy: boolean;
  absenceInput: string;
  setAbsenceInput: (v: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

// 결석 사유 입력 모달.
export default function AbsenceModal({
  busy,
  absenceInput,
  setAbsenceInput,
  onClose,
  onSubmit,
}: AbsenceModalProps) {
  return (
    <Modal
      title="결석 사유 입력"
      onClose={onClose}
      actions={
        <>
          <button className="btn" onClick={onClose}>
            취소
          </button>
          <button
            className="btn btn-primary"
            onClick={onSubmit}
            disabled={busy}
          >
            제출
          </button>
        </>
      }
    >
      <>
        <div className="modal-sub">
          팀원 과반이 동의하면 출석으로 인정됩니다.
        </div>
        <div className="field">
          <label className="field-label">사유</label>
          <textarea
            className="input"
            rows={3}
            placeholder="예) 가족 행사로 참석하지 못했습니다."
            value={absenceInput}
            onChange={(e) => setAbsenceInput(e.target.value)}
            autoFocus
          />
        </div>
      </>
    </Modal>
  );
}
