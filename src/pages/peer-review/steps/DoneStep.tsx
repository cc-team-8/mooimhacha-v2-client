import { useState } from "react";

interface DoneStepProps {
  /** 팀원들이 나에게 준 배분의 평균 (화면 확인용 목업 값) */
  myPeerScore: number;
  evenShare: number;
}

// 5단계 — 제출 완료 + 본인 결과 공개.
// "완료해야 내 결과를 본다"가 회수율 80%를 만드는 유일한 유인이다.
export default function DoneStep({ myPeerScore, evenShare }: DoneStepProps) {
  const [revealed, setRevealed] = useState(false);
  const diff = myPeerScore - evenShare;

  return (
    <div className="pr-step pr-done">
      <div className="pr-done-mark" aria-hidden="true">
        <i className="ti ti-check" />
      </div>
      <h1 className="pr-title">제출 완료</h1>
      <p className="pr-lead">
        솔직하게 답해주셔서 감사합니다. 답변은 팀원에게 공개되지 않습니다.
      </p>

      {!revealed ? (
        <div className="pr-actions">
          <button
            className="btn btn-primary pr-btn-lg"
            onClick={() => setRevealed(true)}
          >
            <i className="ti ti-chart-bar" /> 내 기여도 결과 보기
          </button>
        </div>
      ) : (
        <div className="pr-result">
          <div className="pr-result-lab">팀원들이 나에게 준 평균</div>
          <div className="pr-result-val">
            {myPeerScore}
            <span className="pr-result-unit">점</span>
          </div>
          <div
            className={`pr-result-diff ${diff >= 0 ? "up" : "down"}`}
            aria-label={`균등 몫 대비 ${diff >= 0 ? "높음" : "낮음"}`}
          >
            <i className={`ti ti-arrow-${diff >= 0 ? "up" : "down"}`} />
            균등 몫({evenShare}점) 대비 {diff >= 0 ? "+" : ""}
            {diff}점
          </div>
          <p className="pr-result-note">
            개별 팀원이 매긴 점수는 표시되지 않습니다.
          </p>
        </div>
      )}
    </div>
  );
}
