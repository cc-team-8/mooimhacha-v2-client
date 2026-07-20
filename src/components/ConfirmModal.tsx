import type { ReactNode } from "react";
import Modal from "@/components/Modal";

interface ConfirmModalProps {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  /** true면 확인 버튼을 위험(빨강) 스타일로 표시 */
  danger?: boolean;
  /** 요청 진행 중 이중 클릭 방지 */
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

// 파괴적 액션(탈퇴·추방·위임 등) 공용 확인 모달.
export default function ConfirmModal({
  title,
  message,
  confirmLabel = "확인",
  danger = false,
  busy = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      actions={
        <>
          <button className="btn" onClick={onClose} disabled={busy}>
            취소
          </button>
          <button
            className={`btn ${danger ? "btn-danger" : "btn-primary"}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "처리 중…" : confirmLabel}
          </button>
        </>
      }
    >
      <div style={{ fontSize: 14, lineHeight: 1.7 }}>{message}</div>
    </Modal>
  );
}
