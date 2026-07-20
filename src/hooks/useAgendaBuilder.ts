import { useState } from "react";

// 회의 생성 모달에서 아젠다를 한 항목씩 쌓는 입력 빌더.
// "새 회의"·"지금 바로 시작" 두 모달이 동일한 UI/로직을 쓰므로 공용 훅으로 분리.
export interface AgendaItem {
  title: string;
  minutes: number | "";
}

export function useAgendaBuilder() {
  const [list, setList] = useState<AgendaItem[]>([]);
  const [input, setInput] = useState("");
  const [minutes, setMinutes] = useState<number | "">("");

  // 입력값을 리스트에 추가 — 빈 제목은 무시, 추가 후 입력칸 비움
  const add = () => {
    const t = input.trim();
    if (!t) return;
    setList((prev) => [...prev, { title: t, minutes }]);
    setInput("");
    setMinutes("");
  };

  const remove = (idx: number) => {
    setList((prev) => prev.filter((_, i) => i !== idx));
  };

  const reset = () => {
    setList([]);
    setInput("");
    setMinutes("");
  };

  return {
    list,
    setList,
    input,
    setInput,
    minutes,
    setMinutes,
    add,
    remove,
    reset,
  };
}
