import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { saveSession } from "@/lib/auth";
import { useToast } from "@/hooks/useToast";

// 백엔드가 토큰을 URL fragment(#)에 담아 여기로 리다이렉트한다.
// 예: /auth/callback#access_token=...&refresh_token=...&is_new_user=true
export default function AuthCallback() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  // StrictMode에서 effect가 두 번 실행되어도 중복 처리하지 않도록 가드
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const params = new URLSearchParams(window.location.hash.slice(1));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");

    if (!access_token || !refresh_token) {
      showToast("로그인에 실패했습니다.");
      navigate("/", { replace: true });
      return;
    }

    saveSession({ access_token, refresh_token });
    const isNewUser = params.get("is_new_user") === "true";
    navigate(isNewUser ? "/onboarding" : "/home", { replace: true });
  }, [navigate, showToast]);

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      로그인 처리 중…
    </div>
  );
}
