import { useState } from "react";
import { usePeerReviewForm, type PeerMember } from "./hooks/usePeerReviewForm";
import IntroStep from "./steps/IntroStep";
import AllocationStep from "./steps/AllocationStep";
import FreeRiderStep from "./steps/FreeRiderStep";
import CommentStep from "./steps/CommentStep";
import DoneStep from "./steps/DoneStep";
import "@/styles/peer-review.css";

// 화면 확인용 목업 — 실제 연동 시 팀 컨텍스트에서 받아온다
const MEMBERS: PeerMember[] = [
  { id: 1, name: "김철수", isMe: true },
  { id: 2, name: "이영희", isMe: false },
  { id: 3, name: "박민수", isMe: false },
  { id: 4, name: "최지훈", isMe: false },
];
const TEAM_NAME = "캡스톤디자인 3조";
const MY_PEER_SCORE = 22; // 목업: 팀원들이 나에게 준 평균

// 질문 단계(배분·지목·서술) 3개. 안내(0)와 완료(4)는 진행 표시에서 제외한다.
const QUESTION_STEPS = 3;

// 동료평가 페이지 — 안내 → 100점 배분 → 무임승차 지목 → 자유서술 → 완료
export default function PeerReviewPage() {
  const [step, setStep] = useState(0);
  const form = usePeerReviewForm(MEMBERS);

  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => s - 1);

  return (
    <div className="pr-page">
      <div className="pr-shell">
        {step > 0 && step <= QUESTION_STEPS && (
          <div className="pr-progress">
            <div className="pr-progress-bar">
              <i style={{ width: `${(step / QUESTION_STEPS) * 100}%` }} />
            </div>
            <span className="pr-progress-lab">
              {step} / {QUESTION_STEPS}
            </span>
          </div>
        )}

        {step === 0 && <IntroStep teamName={TEAM_NAME} onStart={next} />}
        {step === 1 && (
          <AllocationStep
            members={MEMBERS}
            form={form}
            onNext={next}
            onBack={back}
          />
        )}
        {step === 2 && (
          <FreeRiderStep
            members={MEMBERS}
            form={form}
            onNext={next}
            onBack={back}
          />
        )}
        {step === 3 && (
          <CommentStep form={form} onSubmit={next} onBack={back} />
        )}
        {step === 4 && (
          <DoneStep myPeerScore={MY_PEER_SCORE} evenShare={form.evenShare} />
        )}
      </div>
    </div>
  );
}
