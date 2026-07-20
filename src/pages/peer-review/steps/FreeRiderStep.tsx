import { avatarBg } from "@/lib/avatarColor";
import {
  PHENOTYPES,
  type PeerMember,
  type usePeerReviewForm,
} from "../hooks/usePeerReviewForm";

interface FreeRiderStepProps {
  members: PeerMember[];
  form: ReturnType<typeof usePeerReviewForm>;
  onNext: () => void;
  onBack: () => void;
}

// 3단계 — 무임승차 직접 지목. 가장 직접적인 정답 라벨이자 가장 민감한 문항.
// 익명·미공개·성적무관 고지를 문항 바로 옆에 붙여야 응답률이 유지된다.
export default function FreeRiderStep({
  members,
  form,
  onNext,
  onBack,
}: FreeRiderStepProps) {
  const {
    freeRider,
    setFreeRider,
    freeRiderTargets,
    toggleTarget,
    phenotypes,
    togglePhenotype,
    freeRiderValid,
  } = form;

  const others = members.filter((m) => !m.isMe);

  return (
    <div className="pr-step">
      <h2 className="pr-q">
        이번 프로젝트에서 <strong>기여가 현저히 부족했던 팀원</strong>이
        있었나요?
      </h2>

      <div className="pr-guard">
        <i className="ti ti-shield-lock" />이 답변은 팀원과 교수님께 공개되지
        않으며, 성적과 무관합니다.
      </div>

      <div className="pr-choices">
        {(
          [
            { v: "none", label: "없었습니다", icon: "ti-mood-smile" },
            { v: "yes", label: "있었습니다", icon: "ti-alert-triangle" },
            { v: "unsure", label: "판단하기 어렵습니다", icon: "ti-help" },
          ] as const
        ).map((c) => (
          <button
            key={c.v}
            type="button"
            className={`pr-choice ${freeRider === c.v ? "sel" : ""}`}
            aria-pressed={freeRider === c.v}
            onClick={() => setFreeRider(c.v)}
          >
            <i className={`ti ${c.icon}`} />
            {c.label}
          </button>
        ))}
      </div>

      {freeRider === "yes" && (
        <div className="pr-followup">
          <div className="pr-followup-lab">누구였나요? (복수 선택 가능)</div>
          <div className="pr-targets">
            {others.map((m) => {
              // 아바타 색은 전체 목록 기준 인덱스를 써야 다른 화면과 일치한다
              const idx = members.findIndex((x) => x.id === m.id);
              const sel = freeRiderTargets.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  className={`pr-target ${sel ? "sel" : ""}`}
                  aria-pressed={sel}
                  onClick={() => toggleTarget(m.id)}
                >
                  <div
                    className="av av-sm"
                    style={{ background: avatarBg(idx) }}
                    aria-hidden="true"
                  >
                    {m.name[0]}
                  </div>
                  {m.name}
                  {sel && <i className="ti ti-check pr-target-ck" />}
                </button>
              );
            })}
          </div>

          <div className="pr-followup-lab" style={{ marginTop: 18 }}>
            어떤 점에서 그렇게 느끼셨나요? (복수 선택)
          </div>
          <div className="pr-phenos">
            {PHENOTYPES.map((p) => {
              const sel = phenotypes.includes(p.value);
              return (
                <button
                  key={p.value}
                  type="button"
                  className={`pr-pheno ${sel ? "sel" : ""}`}
                  aria-pressed={sel}
                  onClick={() => togglePhenotype(p.value)}
                >
                  <span className="pr-check" aria-hidden="true">
                    {sel && <i className="ti ti-check" />}
                  </span>
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="pr-actions">
        <button className="btn" onClick={onBack}>
          이전
        </button>
        <button
          className="btn btn-primary pr-btn-lg"
          onClick={onNext}
          disabled={!freeRiderValid}
        >
          다음 <i className="ti ti-arrow-right" />
        </button>
      </div>
    </div>
  );
}
