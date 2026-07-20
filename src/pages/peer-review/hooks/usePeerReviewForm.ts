import { useState } from "react";

export interface PeerMember {
  id: number;
  name: string;
  isMe: boolean;
}

// 무임승차 지목 시 "어떤 점에서 그렇게 느꼈는지" — 표현형을 우리 지표에 매핑하기 위한 항목.
// 마지막 두 개는 현재 제품이 측정하지 못하는 유형이라, 응답이 몰리면 다음 학기 개발 근거가 된다.
export const PHENOTYPES = [
  { value: "absent", label: "회의에 자주 안 나왔다" },
  { value: "no_task", label: "맡은 일을 안 했다" },
  { value: "late", label: "마감을 계속 어겼다" },
  { value: "low_quality", label: "결과물의 질이 현저히 낮았다" },
  { value: "unreachable", label: "연락이 안 됐다" },
] as const;

export type FreeRiderAnswer = "none" | "yes" | "unsure" | null;

// 동료평가 폼 상태. 배분 합계 검증·균등 배분 같은 계산이 있어 훅으로 분리한다.
export function usePeerReviewForm(members: PeerMember[]) {
  // memberId → 배분 점수
  const [alloc, setAlloc] = useState<Record<number, number>>(() =>
    Object.fromEntries(members.map((m) => [m.id, 0])),
  );
  const [freeRider, setFreeRider] = useState<FreeRiderAnswer>(null);
  const [freeRiderTargets, setFreeRiderTargets] = useState<number[]>([]);
  const [phenotypes, setPhenotypes] = useState<string[]>([]);
  const [comment, setComment] = useState("");

  const total = Object.values(alloc).reduce((s, v) => s + v, 0);
  const remaining = 100 - total;
  // 균등 몫 — 화면에 기준선으로 보여준다
  const evenShare = Math.round(100 / members.length);
  const allocValid = total === 100;

  const setPoints = (memberId: number, value: number) => {
    const v = Number.isNaN(value) ? 0 : Math.max(0, Math.min(100, value));
    setAlloc((prev) => ({ ...prev, [memberId]: v }));
  };

  // 나머지는 첫 번째 팀원에게 몰아 합계 100을 맞춘다 (100이 인원수로 나눠떨어지지 않는 경우)
  const resetEven = () => {
    const base = Math.floor(100 / members.length);
    const next = Object.fromEntries(members.map((m) => [m.id, base]));
    next[members[0].id] = base + (100 - base * members.length);
    setAlloc(next);
  };

  const clearAlloc = () => {
    setAlloc(Object.fromEntries(members.map((m) => [m.id, 0])));
  };

  const toggleTarget = (memberId: number) => {
    setFreeRiderTargets((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId],
    );
  };

  const togglePhenotype = (value: string) => {
    setPhenotypes((prev) =>
      prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value],
    );
  };

  // "있었다"를 골랐으면 최소 1명은 지목해야 넘어갈 수 있다
  const freeRiderValid =
    freeRider === "none" ||
    freeRider === "unsure" ||
    (freeRider === "yes" && freeRiderTargets.length > 0);

  return {
    alloc,
    setPoints,
    total,
    remaining,
    evenShare,
    allocValid,
    resetEven,
    clearAlloc,
    freeRider,
    setFreeRider,
    freeRiderTargets,
    toggleTarget,
    phenotypes,
    togglePhenotype,
    freeRiderValid,
    comment,
    setComment,
  };
}
