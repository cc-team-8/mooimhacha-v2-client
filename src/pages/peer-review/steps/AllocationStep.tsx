import { avatarBg, memberColor } from "@/lib/avatarColor";
import type { PeerMember, usePeerReviewForm } from "../hooks/usePeerReviewForm";

interface AllocationStepProps {
  members: PeerMember[];
  form: ReturnType<typeof usePeerReviewForm>;
  onNext: () => void;
  onBack: () => void;
}

// 2단계 — 100점 강제 배분.
// 리커트 척도는 전원 만점(관대화 편향)이 되므로, 합계를 100으로 묶어 차등을 강제한다.
export default function AllocationStep({
  members,
  form,
  onNext,
  onBack,
}: AllocationStepProps) {
  const { alloc, setPoints, total, remaining, evenShare, allocValid } = form;

  return (
    <div className="pr-step">
      <h2 className="pr-q">
        우리 팀이 이 프로젝트에 쏟은 노력 전체를 100점이라고 하면, 각자는 몇
        점씩 기여했나요?
      </h2>
      <p className="pr-sub">
        <strong>본인을 포함해</strong> 배분해 주세요. 균등하게 나누면 각자{" "}
        <strong>{evenShare}점</strong>입니다.
      </p>

      <div className="pr-hint">
        <i className="ti ti-bulb" />
        떠올려 보세요 — 실제 산출물을 만든 사람, 마감을 지킨 사람, 남이 못 한 걸
        대신 메운 사람
      </div>

      <div className="pr-alloc-list">
        {members.map((m, i) => {
          const points = alloc[m.id] ?? 0;
          // 균등 몫 대비 비율을 막대로 — 100%가 균등선
          const barPct = Math.min(100, (points / evenShare) * 50);
          return (
            <div className="pr-alloc-row" key={m.id}>
              <div className="pr-alloc-who">
                <div
                  className="av av-sm"
                  style={{ background: avatarBg(i) }}
                  aria-hidden="true"
                >
                  {m.name[0]}
                </div>
                <span className="pr-alloc-name">
                  {m.name}
                  {m.isMe && <span className="pr-me">나</span>}
                </span>
              </div>

              <div className="pr-alloc-bar" aria-hidden="true">
                <i
                  style={{
                    width: `${barPct}%`,
                    background: memberColor(i),
                  }}
                />
                <span className="pr-alloc-even" />
              </div>

              <div className="pr-alloc-input">
                <button
                  type="button"
                  className="pr-step-btn"
                  aria-label={`${m.name} 점수 내리기`}
                  disabled={points <= 0}
                  onClick={() => setPoints(m.id, points - 5)}
                >
                  <i className="ti ti-minus" />
                </button>
                <input
                  className="input pr-num"
                  type="number"
                  min={0}
                  max={100}
                  inputMode="numeric"
                  aria-label={`${m.name} 기여 점수`}
                  value={points}
                  onChange={(e) => setPoints(m.id, Number(e.target.value))}
                />
                <button
                  type="button"
                  className="pr-step-btn"
                  aria-label={`${m.name} 점수 올리기`}
                  disabled={points >= 100}
                  onClick={() => setPoints(m.id, points + 5)}
                >
                  <i className="ti ti-plus" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className={`pr-total ${allocValid ? "ok" : ""}`}>
        <span className="pr-total-lab">합계</span>
        <span className="pr-total-val">
          {total} <span className="pr-total-of">/ 100</span>
        </span>
        {allocValid ? (
          <span className="pr-total-msg">
            <i className="ti ti-check" /> 완료
          </span>
        ) : (
          <span className="pr-total-msg">
            {remaining > 0
              ? `${remaining}점 남았어요`
              : `${-remaining}점 초과했어요`}
          </span>
        )}
      </div>

      <div className="pr-alloc-tools">
        <button type="button" className="btn btn-sm" onClick={form.resetEven}>
          <i className="ti ti-equal" /> 균등 배분
        </button>
        <button type="button" className="btn btn-sm" onClick={form.clearAlloc}>
          <i className="ti ti-refresh" /> 초기화
        </button>
      </div>

      <div className="pr-actions">
        <button className="btn" onClick={onBack}>
          이전
        </button>
        <button
          className="btn btn-primary pr-btn-lg"
          onClick={onNext}
          disabled={!allocValid}
        >
          다음 <i className="ti ti-arrow-right" />
        </button>
      </div>
    </div>
  );
}
