import { useState } from "react";

export interface OnboardingSettings {
  contribution_visibility: "team" | "self" | "leader";
  absent_meeting_handling: "exclude" | "zero" | "attendance_only";
  deadline_penalty_curve: "standard" | "lenient" | "strict";
  min_meeting_minutes: number;
  leader_bonus_multiplier: number;
}

export const DEFAULT_SETTINGS: OnboardingSettings = {
  contribution_visibility: "team",
  absent_meeting_handling: "exclude",
  deadline_penalty_curve: "standard",
  min_meeting_minutes: 5,
  leader_bonus_multiplier: 1.0,
};

// 온보딩 위저드 전체 상태. 단일 관심사(팀 생성·초대 흐름)라 한 훅으로 묶는다.
// 반환 프로퍼티는 기존 변수명을 그대로 유지 → 호출부(핸들러·JSX) 수정 없이 상태 위치만 이동.
export function useOnboardingWizard() {
  const [step, setStep] = useState(0);
  const [teamId, setTeamId] = useState(0);
  const [teamName, setTeamName] = useState("");
  const [selectedChip, setSelectedChip] = useState("");
  const [customCourse, setCustomCourse] = useState(""); // 과목 유형 직접 입력
  const [inviteCode, setInviteCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  // 팀 설정 접이식 — 기본 펼침(세부 설정을 바로 보여줘 설정을 유도). 바꾼 값만 생성 후 PATCH 한다.
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<OnboardingSettings>({
    ...DEFAULT_SETTINGS,
  });
  return {
    step,
    setStep,
    teamId,
    setTeamId,
    teamName,
    setTeamName,
    selectedChip,
    setSelectedChip,
    customCourse,
    setCustomCourse,
    inviteCode,
    setInviteCode,
    isCreating,
    setIsCreating,
    copied,
    setCopied,
    showSettings,
    setShowSettings,
    settings,
    setSettings,
  };
}
