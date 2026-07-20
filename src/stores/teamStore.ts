import { create } from "zustand";

interface TeamStore {
  teamId: number | null;
  setTeamId: (id: number) => void;
  clearTeamId: () => void;
}

// 현재 보고 있는 팀 id. localStorage에 영속해 새로고침에도 유지.
const stored = Number(localStorage.getItem("current_team_id"));

export const useTeamStore = create<TeamStore>((set) => ({
  teamId: Number.isFinite(stored) && stored > 0 ? stored : null,
  setTeamId: (id) => {
    localStorage.setItem("current_team_id", String(id));
    set({ teamId: id });
  },
  // 탈퇴·강퇴·계정 전환 등으로 더 이상 접근할 수 없는 팀 id를 비울 때 사용
  clearTeamId: () => {
    localStorage.removeItem("current_team_id");
    set({ teamId: null });
  },
}));
