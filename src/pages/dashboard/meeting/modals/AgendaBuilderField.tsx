import type { AgendaItem } from "@/hooks/useAgendaBuilder";

interface AgendaBuilderFieldProps {
  list: AgendaItem[];
  input: string;
  setInput: (v: string) => void;
  minutes: number | "";
  setMinutes: (v: number | "") => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
  titleMaxLength?: number;
}

// 새 회의/퀵스타트 모달이 공유하는 아젠다 입력 빌더 (칩 목록 + 추가 입력).
export default function AgendaBuilderField({
  list,
  input,
  setInput,
  minutes,
  setMinutes,
  onAdd,
  onRemove,
  titleMaxLength,
}: AgendaBuilderFieldProps) {
  return (
    <div className="field">
      <label className="field-label">
        아젠다 <span className="opt">(선택)</span>
      </label>
      {list.length > 0 && (
        <div className="agenda-chips">
          {list.map((ag, i) => (
            <div className="agenda-chip" key={i}>
              <span className="agenda-chip-title">{ag.title}</span>
              {ag.minutes !== "" && (
                <span className="agenda-chip-min">{ag.minutes}분</span>
              )}
              <button
                type="button"
                className="agenda-chip-x"
                onClick={() => onRemove(i)}
                aria-label="아젠다 삭제"
              >
                <i className="ti ti-x" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="agenda-add">
        <input
          className="input"
          placeholder="아젠다 제목"
          maxLength={titleMaxLength}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              onAdd();
            }
          }}
        />
        <input
          className="input agenda-add-min"
          type="number"
          min={0}
          placeholder="분"
          value={minutes}
          onChange={(e) =>
            setMinutes(e.target.value === "" ? "" : Number(e.target.value))
          }
        />
      </div>
      <button
        type="button"
        className="btn btn-sm agenda-add-btn"
        onClick={onAdd}
      >
        <i className="ti ti-plus" /> 추가
      </button>
    </div>
  );
}
