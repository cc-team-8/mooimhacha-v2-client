import Modal from "@/components/Modal";

interface AgendaModalProps {
  busy: boolean;
  agTitle: string;
  setAgTitle: (v: string) => void;
  agMinutes: number | "";
  setAgMinutes: (v: number | "") => void;
  onClose: () => void;
  onAdd: () => void;
}

// 진행 중 회의에 아젠다를 추가하는 모달.
export default function AgendaModal({
  busy,
  agTitle,
  setAgTitle,
  agMinutes,
  setAgMinutes,
  onClose,
  onAdd,
}: AgendaModalProps) {
  return (
    <Modal
      title="아젠다 추가"
      onClose={onClose}
      actions={
        <>
          <button className="btn" onClick={onClose}>
            취소
          </button>
          <button className="btn btn-primary" onClick={onAdd} disabled={busy}>
            추가
          </button>
        </>
      }
    >
      <div className="field">
        <label className="field-label">아젠다 내용</label>
        <input
          className="input"
          placeholder="예) 최종 발표 순서 확정"
          value={agTitle}
          onChange={(e) => setAgTitle(e.target.value)}
          autoFocus
        />
      </div>
      <div className="field">
        <label className="field-label">소요 시간 (분)</label>
        <input
          className="input"
          type="number"
          min={1}
          value={agMinutes}
          onChange={(e) =>
            setAgMinutes(e.target.value === "" ? "" : Number(e.target.value))
          }
        />
      </div>
    </Modal>
  );
}
