import Modal from "@/components/Modal";

interface DecisionModalProps {
  isEditing: boolean;
  busy: boolean;
  decInput: string;
  setDecInput: (v: string) => void;
  onClose: () => void;
  onSave: () => void;
}

// 결정 사항 추가/수정 모달.
export default function DecisionModal({
  isEditing,
  busy,
  decInput,
  setDecInput,
  onClose,
  onSave,
}: DecisionModalProps) {
  return (
    <Modal
      title={isEditing ? "결정 사항 수정" : "결정 사항 추가"}
      onClose={onClose}
      actions={
        <>
          <button className="btn" onClick={onClose}>
            취소
          </button>
          <button className="btn btn-primary" onClick={onSave} disabled={busy}>
            {isEditing ? "저장" : "추가"}
          </button>
        </>
      }
    >
      <div className="field">
        <label className="field-label">결정 내용</label>
        <textarea
          className="input"
          rows={3}
          placeholder="회의에서 결정된 내용을 입력하세요"
          value={decInput}
          onChange={(e) => setDecInput(e.target.value)}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              onSave();
            }
          }}
          autoFocus
        />
      </div>
    </Modal>
  );
}
