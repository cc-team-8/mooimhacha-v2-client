import type { usePeerReviewForm } from "../hooks/usePeerReviewForm";

interface CommentStepProps {
  form: ReturnType<typeof usePeerReviewForm>;
  onSubmit: () => void;
  onBack: () => void;
}

// 4단계 — 자유 서술 (선택). 짧고 선택이어야 회수율을 갉아먹지 않는다.
export default function CommentStep({
  form,
  onSubmit,
  onBack,
}: CommentStepProps) {
  return (
    <div className="pr-step">
      <h2 className="pr-q">
        점수나 체크박스로는 드러나지 않는 게 있다면 적어주세요.
      </h2>
      <p className="pr-sub">선택 사항입니다. 비워두고 제출해도 됩니다.</p>

      <textarea
        className="input pr-textarea"
        rows={6}
        placeholder="예) 발표 준비를 도맡아 했는데 회의에서는 말수가 적었습니다."
        value={form.comment}
        onChange={(e) => form.setComment(e.target.value)}
      />

      <div className="pr-actions">
        <button className="btn" onClick={onBack}>
          이전
        </button>
        <button className="btn btn-primary pr-btn-lg" onClick={onSubmit}>
          제출하기 <i className="ti ti-send" />
        </button>
      </div>
    </div>
  );
}
