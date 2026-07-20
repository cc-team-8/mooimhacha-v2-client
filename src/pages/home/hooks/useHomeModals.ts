import { useState } from "react";

// 홈 화면의 모달/메뉴 UI 상태 묶음 (팀 가입 모달 + 프로필 드롭다운/수정 모달).
// 반환 프로퍼티는 기존 변수명을 그대로 유지 → 호출부(핸들러·JSX) 수정 없이 상태 위치만 이동.
export function useHomeModals() {
  const [joinCode, setJoinCode] = useState("");
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  return {
    joinCode,
    setJoinCode,
    joinModalOpen,
    setJoinModalOpen,
    profileOpen,
    setProfileOpen,
    profileEditOpen,
    setProfileEditOpen,
  };
}
