import { useState } from "react";

// SettingsPage의 폼/모달 상태를 도메인별 훅으로 분리.
// 반환 프로퍼티는 기존 변수명을 그대로 유지 → 호출부(핸들러·JSX) 수정 없이 상태 위치만 이동.

// 팀 정보(이름/과목) 수정 + 초대코드 복사 피드백
export function useTeamInfoForm() {
  const [teamName, setTeamName] = useState("");
  const [courseName, setCourseName] = useState("");
  const [inviteCopied, setInviteCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  return {
    teamName,
    setTeamName,
    courseName,
    setCourseName,
    inviteCopied,
    setInviteCopied,
    saving,
    setSaving,
  };
}

// 팀 삭제 확인 모달
export function useDeleteTeamModal() {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);
  return {
    deleteModalOpen,
    setDeleteModalOpen,
    deleteConfirmName,
    setDeleteConfirmName,
    deleting,
    setDeleting,
  };
}

// 슬랙 연동 + 프로필 저장
export function useSlackProfileForm() {
  const [slackUserId, setSlackUserId] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [testingSlack, setTestingSlack] = useState<
    "channel" | "dm" | "button" | null
  >(null);
  return {
    slackUserId,
    setSlackUserId,
    profileSaving,
    setProfileSaving,
    testingSlack,
    setTestingSlack,
  };
}
