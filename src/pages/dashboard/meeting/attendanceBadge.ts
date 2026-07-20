import type { AttendanceStatus } from "@/lib/types";

// 출결 상태별 배지 표기 (기존 색상 토큰 재사용).
// 출결 탭과 사이드바 회의 목록이 공유하므로 별도 모듈로 둔다.
export const ATT_BADGE: Record<
  AttendanceStatus,
  { label: string; color: string; bg: string }
> = {
  present: { label: "출석", color: "var(--green)", bg: "var(--green-soft)" },
  excused: {
    label: "출석 인정",
    color: "var(--green)",
    bg: "var(--green-soft)",
  },
  late: { label: "지각", color: "var(--amber)", bg: "var(--amber-soft)" },
  absent: { label: "결석", color: "var(--coral)", bg: "var(--coral-soft)" },
};
