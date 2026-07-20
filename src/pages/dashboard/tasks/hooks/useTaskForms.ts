import { useState } from "react";
import { todayStr } from "@/lib/dateUtils";
import type { ActionItem } from "@/lib/types";

// TasksPage의 태스크 추가/수정 모달 폼 상태를 도메인별 훅으로 분리.
// 반환 프로퍼티는 기존 변수명을 그대로 유지 → 호출부(핸들러·JSX) 수정 없이 상태 위치만 이동.

type Status = "할 일" | "진행 중" | "완료";

// 태스크 추가 모달
export function useNewTaskForm() {
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newDesc, setNewDesc] = useState("");
  const [newDetail, setNewDetail] = useState("");
  const [newAssignee, setNewAssignee] = useState<string>("");
  const [newDue, setNewDue] = useState(todayStr());
  const [newTime, setNewTime] = useState("");
  const [newStatus, setNewStatus] = useState<Status>("할 일");
  const [newDifficulty, setNewDifficulty] = useState(2);
  return {
    modalOpen,
    setModalOpen,
    saving,
    setSaving,
    newDesc,
    setNewDesc,
    newDetail,
    setNewDetail,
    newAssignee,
    setNewAssignee,
    newDue,
    setNewDue,
    newTime,
    setNewTime,
    newStatus,
    setNewStatus,
    newDifficulty,
    setNewDifficulty,
  };
}

// 태스크 수정 모달 (+ 삭제 확인)
export function useEditTaskForm() {
  const [editTarget, setEditTarget] = useState<ActionItem | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editDetail, setEditDetail] = useState("");
  const [editAssignee, setEditAssignee] = useState("");
  const [editDue, setEditDue] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editDifficulty, setEditDifficulty] = useState(2);
  const [editStatus, setEditStatus] = useState<Status>("할 일");
  const [editSaving, setEditSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  return {
    editTarget,
    setEditTarget,
    editDesc,
    setEditDesc,
    editDetail,
    setEditDetail,
    editAssignee,
    setEditAssignee,
    editDue,
    setEditDue,
    editTime,
    setEditTime,
    editDifficulty,
    setEditDifficulty,
    editStatus,
    setEditStatus,
    editSaving,
    setEditSaving,
    confirmDelete,
    setConfirmDelete,
    deleting,
    setDeleting,
  };
}
