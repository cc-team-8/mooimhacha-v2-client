import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import type { CurrentUser } from "@/lib/types";

// 현재 로그인 사용자 정보를 1회 조회한다. 실패 시 null 유지.
export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  useEffect(() => {
    let alive = true;
    apiGet<CurrentUser>("/auth/me")
      .then((u) => alive && setUser(u))
      .catch(() => alive && setUser(null));
    return () => {
      alive = false;
    };
  }, []);
  return user;
}
