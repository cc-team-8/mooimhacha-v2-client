import type { Decision } from "@/lib/types";

interface DecisionTabProps {
  decisions: Decision[];
  onAddDecision: () => void;
  onEditDecision: (d: Decision) => void;
  onDeleteDecision: (d: Decision) => void;
}

// 결정 사항 탭 — 목록 + 추가/수정/삭제 트리거 (표현 전용).
export default function DecisionTab({
  decisions,
  onAddDecision,
  onEditDecision,
  onDeleteDecision,
}: DecisionTabProps) {
  return (
    <div className="tab-panel active" style={{ overflow: "hidden" }}>
      <div
        className="panel-label"
        style={{ display: "flex", alignItems: "center" }}
      >
        결정 사항
        <button
          className="btn btn-primary btn-sm"
          style={{ marginLeft: "auto" }}
          onClick={onAddDecision}
        >
          <i className="ti ti-plus" /> 추가
        </button>
      </div>
      <div className="dec-list scroll">
        {decisions.length === 0 && (
          <div style={{ fontSize: 12.5, color: "var(--text-soft)" }}>
            아직 기록된 결정이 없습니다.
          </div>
        )}
        {decisions.map((d) => (
          <div key={d.id} className="dec-item">
            <div className="dec-ic">
              <i className="ti ti-check" />
            </div>
            <div className="dec-text">{d.content}</div>
            <div className="dec-actions">
              <button
                className="dec-act"
                aria-label="결정 수정"
                onClick={() => onEditDecision(d)}
              >
                <i className="ti ti-pencil" />
              </button>
              <button
                className="dec-act dec-act--danger"
                aria-label="결정 삭제"
                onClick={() => onDeleteDecision(d)}
              >
                <i className="ti ti-trash" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
