import ReactMarkdown from "react-markdown";
import { truncate } from "@/lib/text";
import type { ActionItem, Meeting } from "@/lib/types";

interface SummaryTabProps {
  selected: Meeting;
  pendingTasks: ActionItem[];
  busy: boolean;
  onConfirmTask: (task: ActionItem) => void;
  onRemoveTask: (task: ActionItem) => void;
  onSummarize: () => void;
}

// 회의 요약 탭 — AI 제안 태스크 검토 + AI 회의록 (표현 전용, mutation 은 콜백).
export default function SummaryTab({
  selected,
  pendingTasks,
  busy,
  onConfirmTask,
  onRemoveTask,
  onSummarize,
}: SummaryTabProps) {
  return (
    <div className="tab-panel active">
      {selected.status !== "ended" ? (
        <div className="summary-box">
          <i className="ti ti-sparkles" />
          회의가 종료되면 AI가 자동으로 결정 사항·태스크·회의록을 요약합니다.
        </div>
      ) : (
        <>
          {pendingTasks.length > 0 && (
            <div className="summary-section summary-section--tasks">
              <div className="summary-header">
                <div className="summary-title summary-title--amber">
                  <i className="ti ti-list-check" />
                  AI 제안 태스크
                  <span className="badge badge-amber">
                    {pendingTasks.length}개 검토 대기
                  </span>
                </div>
              </div>
              <div className="summary-tasks">
                {pendingTasks.map((task) => (
                  <div key={task.id} className="summary-task-item">
                    <i className="ti ti-sparkles" />
                    <span className="summary-task-desc">
                      {truncate(task.description)}
                    </span>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => onConfirmTask(task)}
                    >
                      확정
                    </button>
                    <button
                      className="btn btn-sm"
                      onClick={() => void onRemoveTask(task)}
                    >
                      제거
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="summary-section">
            <div className="summary-header">
              <div className="summary-title">
                <i className="ti ti-sparkles" />
                AI 회의록
              </div>
              <button
                className="btn btn-sm"
                disabled={busy}
                onClick={() => void onSummarize()}
              >
                <i className={`ti ${busy ? "ti-loader-2" : "ti-refresh"}`} />
                {busy
                  ? "요약 중…"
                  : selected.summary
                    ? "다시 요약"
                    : "요약 생성"}
              </button>
            </div>
            {selected.one_liner && (
              <div className="summary-one-liner">{selected.one_liner}</div>
            )}
            {selected.summary ? (
              <div className="summary-md">
                <ReactMarkdown>{selected.summary}</ReactMarkdown>
              </div>
            ) : (
              <div className="summary-empty">
                <i className="ti ti-file-description" />
                <span>
                  발화 기록과 결정 사항을 바탕으로 AI가 회의록을 작성합니다.
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
