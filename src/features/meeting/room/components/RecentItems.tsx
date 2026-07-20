import type { Decision, ActionItem } from "@/lib/types";

interface RecentItemsProps {
  collapsed: boolean;
  onToggle: () => void;
  decisions: Decision[];
  actions: ActionItem[];
}

// "최근 항목" 접이식 섹션 — 최근 결정/액션 목록 표시. 표현용 컴포넌트.
export default function RecentItems({
  collapsed,
  onToggle,
  decisions,
  actions,
}: RecentItemsProps) {
  return (
    <section className="cmp-section cmp-recent">
      <header
        className="cmp-section__head cmp-section__head--toggle"
        onClick={onToggle}
        title={collapsed ? "펼치기" : "접기"}
      >
        <h2>최근 항목</h2>
        <span className="cmp-toggle-btn">
          <i className={`ti ti-chevron-${collapsed ? "down" : "up"}`} />
        </span>
      </header>
      {!collapsed && (
        <ul className="cmp-recent-list">
          {decisions.map((d) => (
            <li key={`d${d.id}`}>
              <span className="cmp-tag cmp-tag--decision">결정</span>
              {d.content}
            </li>
          ))}
          {actions.map((a) => (
            <li key={`a${a.id}`}>
              <span className="cmp-tag cmp-tag--action">액션</span>
              {a.description}
            </li>
          ))}
          {decisions.length === 0 && actions.length === 0 && (
            <li className="cmp-empty">기록된 항목이 없습니다.</li>
          )}
        </ul>
      )}
    </section>
  );
}
