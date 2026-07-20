import { useState } from "react";
import { todayStr, nowTimeStr } from "@/lib/dateUtils";
import { useAgendaBuilder } from "@/hooks/useAgendaBuilder";
import type { ActionItem } from "@/lib/types";

// MeetingPage의 모달 폼 상태를 도메인별 훅으로 분리한다.
// 반환 프로퍼티는 기존 변수명을 그대로 유지 → 호출부(핸들러·JSX) 수정 없이 상태 위치만 이동.
// 상태는 여전히 MeetingPage 렌더 시점에 생성되므로 동작은 완전히 동일하다.

type MeetingType = "regular" | "partial";
type Status = "할 일" | "진행 중" | "완료";

// 새 회의 만들기 모달
export function useNewMeetingForm() {
  const [newTopic, setNewTopic] = useState("");
  const [newMeetingType, setNewMeetingType] = useState<MeetingType>("regular");
  const [newDate, setNewDate] = useState(todayStr());
  const [newTime, setNewTime] = useState(nowTimeStr());
  const [newMinutes, setNewMinutes] = useState<number | "">(30);
  const agenda = useAgendaBuilder();
  return {
    newTopic,
    setNewTopic,
    newMeetingType,
    setNewMeetingType,
    newDate,
    setNewDate,
    newTime,
    setNewTime,
    newMinutes,
    setNewMinutes,
    newAgendaList: agenda.list,
    setNewAgendaList: agenda.setList,
    newAgendaInput: agenda.input,
    setNewAgendaInput: agenda.setInput,
    newAgendaMinutes: agenda.minutes,
    setNewAgendaMinutes: agenda.setMinutes,
    addAgendaToList: agenda.add,
    removeAgendaFromList: agenda.remove,
  };
}

// 지금 바로 시작 모달
export function useQuickStartForm() {
  const [quickTopic, setQuickTopic] = useState("");
  const [quickMeetingType, setQuickMeetingType] =
    useState<MeetingType>("regular");
  const [quickMinutes, setQuickMinutes] = useState<number | "">(30);
  const [quickStarting, setQuickStarting] = useState(false);
  const agenda = useAgendaBuilder();
  return {
    quickTopic,
    setQuickTopic,
    quickMeetingType,
    setQuickMeetingType,
    quickMinutes,
    setQuickMinutes,
    quickStarting,
    setQuickStarting,
    quickAgendaList: agenda.list,
    setQuickAgendaList: agenda.setList,
    quickAgendaInput: agenda.input,
    setQuickAgendaInput: agenda.setInput,
    quickAgendaMinutes: agenda.minutes,
    setQuickAgendaMinutes: agenda.setMinutes,
    addQuickAgendaToList: agenda.add,
    removeQuickAgendaFromList: agenda.remove,
  };
}

// AI 태스크 확정 모달
export function useConfirmTaskForm() {
  const [confirmTask, setConfirmTask] = useState<ActionItem | null>(null);
  const [confirmDesc, setConfirmDesc] = useState("");
  const [confirmAssignee, setConfirmAssignee] = useState("");
  const [confirmDue, setConfirmDue] = useState(todayStr());
  const [confirmTime, setConfirmTime] = useState(nowTimeStr());
  const [confirmStatus, setConfirmStatus] = useState<Status>("할 일");
  const [confirmDifficulty, setConfirmDifficulty] = useState(2);
  const [confirmSaving, setConfirmSaving] = useState(false);
  return {
    confirmTask,
    setConfirmTask,
    confirmDesc,
    setConfirmDesc,
    confirmAssignee,
    setConfirmAssignee,
    confirmDue,
    setConfirmDue,
    confirmTime,
    setConfirmTime,
    confirmStatus,
    setConfirmStatus,
    confirmDifficulty,
    setConfirmDifficulty,
    confirmSaving,
    setConfirmSaving,
  };
}

// 회의 정보 수정(설정 탭) + 회의 삭제 확인
export function useEditMeetingForm() {
  const [editTopic, setEditTopic] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editMinutes, setEditMinutes] = useState<number | "">(30);
  const [editMeetingType, setEditMeetingType] =
    useState<MeetingType>("regular");
  const [editSaving, setEditSaving] = useState(false);
  const [deletingMeeting, setDeletingMeeting] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  return {
    editTopic,
    setEditTopic,
    editDate,
    setEditDate,
    editTime,
    setEditTime,
    editMinutes,
    setEditMinutes,
    editMeetingType,
    setEditMeetingType,
    editSaving,
    setEditSaving,
    deletingMeeting,
    setDeletingMeeting,
    deleteConfirmInput,
    setDeleteConfirmInput,
  };
}
