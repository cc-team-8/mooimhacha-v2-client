import Modal from "@/components/Modal";

interface DeleteMeetingModalProps {
  busy: boolean;
  deleteConfirmInput: string;
  setDeleteConfirmInput: (v: string) => void;
  onClose: () => void;
  onDelete: () => void;
}

// 회의 삭제 확인 모달 — "삭제하겠습니다" 정확 입력 시에만 활성화.
export default function DeleteMeetingModal({
  busy,
  deleteConfirmInput,
  setDeleteConfirmInput,
  onClose,
  onDelete,
}: DeleteMeetingModalProps) {
  return (
    <Modal
      title="회의 삭제"
      onClose={onClose}
      actions={
        <>
          <button className="btn" onClick={onClose}>
            취소
          </button>
          <button
            className="btn btn-danger"
            disabled={deleteConfirmInput !== "삭제하겠습니다" || busy}
            onClick={onDelete}
          >
            삭제
          </button>
        </>
      }
    >
      <div className="modal-sub">
        회의와 관련된 모든 데이터(발화·결정·아젠다)가 영구 삭제됩니다.
      </div>
      <div className="field">
        <label className="field-label">
          확인을 위해 <strong>삭제하겠습니다</strong>를 입력하세요
        </label>
        <input
          className="input"
          placeholder="삭제하겠습니다"
          value={deleteConfirmInput}
          onChange={(e) => setDeleteConfirmInput(e.target.value)}
        />
      </div>
    </Modal>
  );
}
