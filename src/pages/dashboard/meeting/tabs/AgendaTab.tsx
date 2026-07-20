import type { Agenda, Decision } from "@/lib/types";

interface AgendaTabProps {
  prevDecisions: Decision[];
  prevMeetingLabel: string;
  agendas: Agenda[];
  fmtAgTime: (a: Agenda) => string;
  canAddAgenda: boolean;
  onAddAgenda: () => void;
}

// 아젠다 탭 — 지난 회의 결정 + 아젠다 진행 목록 (표현 전용).
export default function AgendaTab({
  prevDecisions,
  prevMeetingLabel,
  agendas,
  fmtAgTime,
  canAddAgenda,
  onAddAgenda,
}: AgendaTabProps) {
  return (
    <div className="tab-panel active">
      {prevDecisions.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <div className="panel-label" style={{ marginBottom: 6 }}>
            저번 회의 결정 사항
            <span
              style={{
                fontSize: 11,
                fontWeight: 400,
                color: "var(--text-soft)",
                marginLeft: 6,
                textTransform: "none",
                letterSpacing: 0,
              }}
            >
              {prevMeetingLabel}
            </span>
          </div>
          {prevDecisions.map((d) => (
            <div key={d.id} className="dec-item">
              <div className="dec-ic dec-ic--muted">
                <i className="ti ti-check" />
              </div>
              <div className="dec-text">{d.content}</div>
            </div>
          ))}
        </div>
      )}
      <div className="panel-label">아젠다 진행</div>
      {agendas.length === 0 && (
        <div
          style={{
            fontSize: 12.5,
            color: "var(--text-soft)",
            padding: "4px 0 8px",
          }}
        >
          등록된 아젠다가 없습니다.
        </div>
      )}
      {agendas.map((a, i) => {
        const cur = a.status === "active";
        const done = a.status === "done";
        return (
          <div key={a.id} className={`ag-item ${cur ? "cur" : ""}`}>
            <div className="ag-num">
              {cur ? (
                <i
                  className="ti ti-player-play-filled"
                  style={{ fontSize: 9 }}
                />
              ) : done ? (
                <i className="ti ti-check" style={{ fontSize: 10 }} />
              ) : (
                i + 1
              )}
            </div>
            <div className="ag-text">{a.title}</div>
            <div className="ag-prog">
              <i style={{ width: done ? "100%" : cur ? "60%" : "0%" }} />
            </div>
            <div className="ag-time">{fmtAgTime(a)}</div>
          </div>
        );
      })}
      {canAddAgenda && (
        <button
          className="add-col"
          style={{ marginTop: 4 }}
          onClick={onAddAgenda}
        >
          <i className="ti ti-plus" /> 아젠다 추가
        </button>
      )}
    </div>
  );
}
