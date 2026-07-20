import { useEffect, useRef, useState } from "react";
import { fetchKakaoLoginUrl } from "@/lib/auth";
import { useToast } from "@/hooks/useToast";
import "@/styles/landing.css";
import {
  kakaoIconHero,
  taskCompletedIcon,
  fraudDetectIcon,
  featureIconMeeting,
  featureIconTask,
  featureIconReport,
  screenshotGroup,
  screenshotHome,
  screenshotDashboard,
  screenshotTasks,
  screenshotMeeting,
  screenshotReport,
  principleIconVoice,
  principleIconText,
  principleIconLocal,
  principleIconSmall,
  kakaoIconCta,
} from "@/assets/landingImages";

export default function LoginPage() {
  const { showToast } = useToast();
  const ctaRef = useRef<HTMLElement>(null);
  const slidesRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const totalSlides = 6;

  async function handleKakaoLogin() {
    try {
      window.location.href = await fetchKakaoLoginUrl();
    } catch {
      showToast("카카오 로그인을 시작할 수 없습니다.");
    }
  }

  function scrollToCta() {
    ctaRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  function goToSlide(i: number) {
    const next = ((i % totalSlides) + totalSlides) % totalSlides;
    setCurrentSlide(next);
  }

  // 슬라이더 렌더
  useEffect(() => {
    if (slidesRef.current) {
      slidesRef.current.style.transform = `translateX(-${currentSlide * 100}%)`;
    }
  }, [currentSlide]);

  // 터치 스와이프
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    let startX: number | null = null;
    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (startX === null) return;
      const diff = e.changedTouches[0].clientX - startX;
      if (Math.abs(diff) > 40) {
        setCurrentSlide(
          (prev) =>
            ((diff < 0 ? prev + 1 : prev - 1) + totalSlides) % totalSlides,
        );
      }
      startX = null;
    };
    viewport.addEventListener("touchstart", onTouchStart, { passive: true });
    viewport.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      viewport.removeEventListener("touchstart", onTouchStart);
      viewport.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  // 스크롤 reveal
  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const items = document.querySelectorAll(".reveal");
    if (prefersReduced || !("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("in"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    items.forEach((el) => observer.observe(el));
    const fallback = setTimeout(() => {
      document
        .querySelectorAll(".reveal:not(.in)")
        .forEach((el) => el.classList.add("in"));
    }, 2500);
    return () => {
      observer.disconnect();
      clearTimeout(fallback);
    };
  }, []);

  const slides = [
    { src: screenshotGroup, alt: "무임하차 그룹 생성 화면" },
    { src: screenshotHome, alt: "무임하차 홈 화면" },
    { src: screenshotDashboard, alt: "무임하차 대시보드 화면" },
    { src: screenshotTasks, alt: "무임하차 태스크 보드 화면" },
    { src: screenshotMeeting, alt: "무임하차 회의 관리 화면" },
    { src: screenshotReport, alt: "무임하차 기여도 리포트 화면" },
  ];

  const panes = [
    {
      label: "그룹 시작하기",
      title: "3단계면 충분합니다",
      sub: "그룹 이름과 과목 유형만 정하면, 초대 코드로 팀원을 바로 데려올 수 있어요.",
      nowrap: false,
    },
    {
      label: "홈",
      title: "내 모든 그룹이 한 화면에",
      sub: "참여 중인 그룹의 기여도, 내 태스크, 예정된 회의까지 — 흩어진 카톡방을 뒤지지 않아도 됩니다.",
      nowrap: false,
    },
    {
      label: "대시보드",
      title: "감이 아니라 숫자로 보는 팀 현황",
      sub: "팀원별 기여도와 진행률을 실시간으로 집계합니다. 누가 도움이 필요한지, 대시보드가 먼저 알려줍니다.",
      nowrap: true,
    },
    {
      label: "태스크",
      title: "할 일은 보드 하나로 충분합니다",
      sub: "할 일·진행 중·완료를 칸반 보드로 관리하고, 담당자와 마감일까지 한눈에 확인하세요.",
      nowrap: false,
    },
    {
      label: "회의 관리",
      title: "회의 기록, 따로 정리하지 마세요",
      sub: "아젠다, 발언 기록, 출결, 결정 사항까지 회의 하나에 자동으로 쌓입니다.",
      nowrap: false,
    },
    {
      label: "기여도 리포트",
      title: "제출용 리포트, 클릭 한 번으로",
      sub: "발언·출석·태스크를 가중 합산한 점수와 레이더 차트를 PDF로 바로 내보낼 수 있어요.",
      nowrap: false,
    },
  ];

  return (
    <div className="landing-page">
      <header className="site-header">
        <div className="wrap">
          <div className="logo">
            무임<span>하차</span>
          </div>
          <nav className="nav-links">
            <a href="#problem">왜 필요한가</a>
            <a href="#features">기능</a>
            <a href="#showcase">화면 보기</a>
            <a href="#story">만든 이유</a>
          </nav>
          <div className="header-cta">
            <button className="btn btn-primary" onClick={handleKakaoLogin}>
              <img src={kakaoIconCta} alt="" /> 카카오로 시작하기
            </button>
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="wrap">
          <div className="hero-left">
            <div className="hero-kicker">
              <span className="badge">NEW</span> 회의 중에도 실시간으로 보이는
              기여도
            </div>
            <h1>
              "내가 제일
              <br />
              열심히 했다"
              <br />
              <span className="accent">이제 증명하세요.</span>
            </h1>
            <p className="hero-desc">
              발언 시간, 태스크 완료율, 회의 참석률까지 — 팀플 기여도를 데이터로
              투명하게 보여주는 협업 도구. 말로 다투지 않고, 숫자로 확인하세요.
            </p>
            <div className="hero-cta">
              <button
                className="btn btn-primary"
                id="cta-hero"
                onClick={handleKakaoLogin}
              >
                <img src={kakaoIconHero} alt="" /> 카카오로 3초만에 시작
              </button>
              <span className="hero-cta-note">
                설치 없이 바로 사용 · 팀원 초대만 하면 끝
              </span>
            </div>
            <div className="hero-stats">
              <div>
                <div className="hero-stat-num">
                  <span>90%</span>
                </div>
                <div className="hero-stat-label">팀플 중 스트레스 경험률</div>
              </div>
              <div>
                <div className="hero-stat-num">
                  <span>6명</span>
                </div>
                <div className="hero-stat-label">소규모 팀플에 최적화</div>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="live-card">
              <div className="live-card-top">회의 보조 · 사이드 패널</div>
              <div className="live-card-body">
                <div className="live-banner">
                  <div className="live-banner-top">
                    <span className="live-dot"></span> LIVE · 발표 준비 회의
                  </div>
                  <div className="live-timer">
                    24:18 <small>/ 예상 45:00</small>
                  </div>
                  <div className="live-avatars">
                    <div
                      className="avatar"
                      style={{ background: "var(--av1)" }}
                    >
                      김
                    </div>
                    <div
                      className="avatar"
                      style={{ background: "var(--av2)" }}
                    >
                      이
                    </div>
                    <div
                      className="avatar"
                      style={{ background: "var(--av3)" }}
                    >
                      박
                    </div>
                    <div
                      className="avatar"
                      style={{ background: "var(--av4)" }}
                    >
                      최
                    </div>
                    <span className="live-avatars-note">4명 참여 중</span>
                  </div>
                </div>

                <div className="section-label">안건 추적 · 1/3 완료</div>
                <div className="agenda-item">
                  <span
                    className="agenda-dot"
                    style={{ background: "var(--green)" }}
                  ></span>
                  <span className="agenda-text">슬라이드 구성 검토</span>
                  <span className="agenda-tag tag-done">완료</span>
                </div>
                <div className="agenda-item active">
                  <span
                    className="agenda-dot"
                    style={{ background: "var(--coral)" }}
                  ></span>
                  <span className="agenda-text">발표 역할 분담 확정</span>
                  <span className="agenda-tag tag-live">진행 중</span>
                </div>

                <div className="section-label">실시간 발언 비중</div>
                <div className="speech-row">
                  <span className="speech-name">김민준</span>
                  <span className="speech-track">
                    <span
                      className="speech-fill"
                      style={{ width: "38%", background: "var(--green)" }}
                    ></span>
                  </span>
                  <span className="speech-pct">38%</span>
                </div>
                <div className="speech-row">
                  <span className="speech-name">이서연</span>
                  <span className="speech-track">
                    <span
                      className="speech-fill"
                      style={{ width: "31%", background: "var(--blue)" }}
                    ></span>
                  </span>
                  <span className="speech-pct">31%</span>
                </div>
                <div className="speech-row">
                  <span className="speech-name">박지호</span>
                  <span className="speech-track">
                    <span
                      className="speech-fill"
                      style={{ width: "8%", background: "var(--coral)" }}
                    ></span>
                  </span>
                  <span className="speech-pct">8%</span>
                </div>
                <div className="alert-box">
                  박지호님의 발언 비중이 10% 미만이에요. 의견을 물어봐 주세요.
                </div>
              </div>
            </div>
            <div className="float-card float-1">
              <img className="float-icon" src={taskCompletedIcon} alt="" />{" "}
              태스크 7/11 완료
            </div>
            <div className="float-card float-2">
              <img className="float-icon" src={fraudDetectIcon} alt="" />{" "}
              무임승차 자동 감지
            </div>
          </div>
        </div>
      </section>

      <div className="trustbar">
        <div className="wrap">
          <span className="trustbar-label">대학생 팀플 그대로 가져왔어요</span>
          <div className="trustbar-pills">
            <span className="trustbar-pill">캡스톤 설계</span>
            <span className="trustbar-pill">전공 팀플</span>
            <span className="trustbar-pill">교양 조별과제</span>
            <span className="trustbar-pill">스터디</span>
          </div>
        </div>
      </div>

      <section className="problem" id="problem">
        <div className="wrap">
          <div className="problem-head reveal">
            <div className="eyebrow">
              <span className="dot"></span>왜 필요한가
            </div>
            <h2 className="section-title">
              팀플 무임승차는 모두가 겪지만,
              <br />
              누구도 '증명'하지 못했습니다.
            </h2>
            <p className="section-sub nowrap-sub">
              원인도, 해법의 방향도 이미 알고 있습니다. 문제는 그것을
              '기여도'라는 숫자로 옮길 방법이 없었다는 것.
            </p>
          </div>
          <div className="stat-grid">
            <div className="stat-card reveal">
              <div className="stat-num">90.3%</div>
              <div className="stat-label">
                팀플 중 심한 스트레스를
                <br />
                경험한 학생 비율
              </div>
              <div className="stat-src">국립경국대 재학생 62명 설문</div>
            </div>
            <div className="stat-card alt reveal">
              <div className="stat-num">65.9%</div>
              <div className="stat-label">
                개인 과제를 선호하는
                <br />
                1순위 이유 = 무임승차자 문제
              </div>
              <div className="stat-src">국민대 학부생 152명·교원 18명 설문</div>
            </div>
            <div className="stat-card reveal">
              <div className="stat-num">55.4%</div>
              <div className="stat-label">
                역할 불균형(무임승차)을
                <br />
                스트레스 2위 요인으로 지목
              </div>
              <div className="stat-src">
                국립경국대 재학생 62명 설문 (복수응답)
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="features" id="features">
        <div className="wrap">
          <div className="features-head reveal">
            <div className="eyebrow" style={{ justifyContent: "center" }}>
              <span className="dot"></span>핵심 기능
            </div>
            <h2 className="section-title">
              회의 전, 중, 후 — 어디서도
              <br />
              놓치지 않습니다
            </h2>
            <p className="section-sub nowrap-sub">
              감으로 매기는 평가는 그만. 발언·태스크·출석을 자동으로 기록하고,
              누구나 같은 기준으로 확인합니다.
            </p>
          </div>
          <div className="feature-grid">
            <div className="feature-card reveal">
              <div className="feature-icon-wrap fi-green">
                <img src={featureIconMeeting} alt="" />
              </div>
              <h3>회의 중 실시간 기여도</h3>
              <p>
                회의 앱 옆에 항상 떠 있는 400px 보조 창. 발언 비중을 실시간
                막대로 보여주고, 한쪽으로 쏠리면 바로 알려줍니다.
              </p>
            </div>
            <div className="feature-card reveal">
              <div className="feature-icon-wrap fi-blue">
                <img src={featureIconTask} alt="" />
              </div>
              <h3>안건·태스크 자동 추적</h3>
              <p>
                안건별 진행 상태와 시간 초과를 한눈에. 단축키로 결정사항·액션
                아이템을 즉시 기록해 회의가 끝나도 사라지지 않습니다.
              </p>
            </div>
            <div className="feature-card reveal">
              <div className="feature-icon-wrap fi-coral">
                <img src={featureIconReport} alt="" />
              </div>
              <h3>교수 제출용 기여도 리포트</h3>
              <p>
                회의·프로젝트 단위로 멤버별 기여도를 집계해 PDF 한 번에 출력.
                "내가 더 했다"는 말 대신 데이터를 제출하세요.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="showcase" id="showcase">
        <div className="wrap">
          <div className="showcase-head reveal">
            <div className="eyebrow" style={{ justifyContent: "center" }}>
              <span className="dot"></span>실제 화면
            </div>
            <h2 className="section-title">화면으로 직접 확인하세요</h2>
            <p className="section-sub">
              화살표를 눌러 그룹 생성부터 리포트까지, 무임하차의 핵심 화면을
              둘러보세요.
            </p>
          </div>

          <div className="showcase-carousel reveal">
            <div
              className="showcase-viewport"
              ref={viewportRef}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft") goToSlide(currentSlide - 1);
                if (e.key === "ArrowRight") goToSlide(currentSlide + 1);
              }}
            >
              <div className="showcase-slides" ref={slidesRef}>
                {slides.map((s, i) => (
                  <div className="showcase-slide" key={i}>
                    <img src={s.src} alt={s.alt} loading="lazy" />
                  </div>
                ))}
              </div>
              <button
                className="showcase-arrow prev"
                aria-label="이전 화면"
                onClick={() => goToSlide(currentSlide - 1)}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <button
                className="showcase-arrow next"
                aria-label="다음 화면"
                onClick={() => goToSlide(currentSlide + 1)}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>

            <div className="showcase-info">
              <div className="showcase-panes">
                {panes.map((p, i) => (
                  <div
                    className={`showcase-pane${i === currentSlide ? " on" : ""}`}
                    key={i}
                  >
                    <div className="eyebrow">
                      <span className="dot"></span>
                      {p.label}
                    </div>
                    <h2
                      className={`section-title${p.nowrap ? " nowrap-title" : ""}`}
                    >
                      {p.title}
                    </h2>
                    <p className="section-sub">{p.sub}</p>
                  </div>
                ))}
              </div>
              <div className="showcase-dots">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    className={`showcase-dot${i === currentSlide ? " on" : ""}`}
                    aria-label={`화면 ${i + 1}`}
                    onClick={() => goToSlide(i)}
                  />
                ))}
              </div>
              <div className="showcase-counter">
                {currentSlide + 1} / {totalSlides}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="story" id="story">
        <div className="wrap">
          <div className="story-quote reveal">
            "팀플이지만 개인의 역할을 정확히 정해서 조 점수 뿐 아니라{" "}
            <span className="accent">개인 점수도</span> 부여하는 식으로 했으면
            좋겠다."
          </div>
          <div className="story-body reveal">
            <p>
              팀플을 해본 사람이라면 다 압니다. 발표 전날 밤, 혼자 슬라이드를
              만들고 있을 때의 그 기분. "나만 한 거 같은데" 라는 의심은 있지만,
              그걸 입증할 방법은 없었습니다.
            </p>
            <p>
              평가는 늘 조 단위였고, 누가 더 많이 했는지는 결국 '인상'과
              '기억'에 맡겨졌습니다. 회의 내용은 정리되지 않고 흩어졌고, 결정
              사항은 다음 모임이면 잊혔습니다.
            </p>
            <p>
              무임하차는 이 문제를 감이 아니라 데이터로 풀자는 생각에서
              시작했습니다. 발언 시간, 완료한 태스크, 회의 참석률 — 이미 회의
              중에 자연스럽게 만들어지는 신호를 그냥 흘려보내지 않고 기록하면,
              누구나 동의할 수 있는 기준이 생긴다고 믿습니다.
            </p>
            <div className="story-signoff">무임하차 팀 드림</div>
          </div>
        </div>
      </section>

      <section className="principles">
        <div className="wrap">
          <div className="features-head reveal">
            <div className="eyebrow" style={{ justifyContent: "center" }}>
              <span className="dot"></span>지키는 원칙
            </div>
            <h2 className="section-title">기록하지만, 감시하지 않습니다</h2>
            <p className="section-sub">
              기여도를 측정하는 도구가 사생활을 침해해서는 안 된다고 믿습니다.
            </p>
          </div>
          <div className="principle-grid">
            <div className="principle-card reveal">
              <div className="principle-icon">
                <img src={principleIconVoice} alt="" />
              </div>
              <h4>음성 원본 미저장</h4>
              <p>
                음성은 각자 기기 안에서만 텍스트로 변환됩니다. 녹음 파일은 기기
                밖으로 나가지 않습니다.
              </p>
            </div>
            <div className="principle-card reveal">
              <div className="principle-icon">
                <img src={principleIconText} alt="" />
              </div>
              <h4>텍스트만 서버로</h4>
              <p>
                서버에는 변환된 텍스트와 통계만 저장됩니다. 발언 내용 원본은
                누구도 들을 수 없습니다.
              </p>
            </div>
            <div className="principle-card reveal">
              <div className="principle-icon">
                <img src={principleIconLocal} alt="" />
              </div>
              <h4>로컬 음성 인식</h4>
              <p>
                각자의 기기에서 직접 음성을 처리해, 인터넷이 불안정해도 회의
                기록이 끊기지 않습니다.
              </p>
            </div>
            <div className="principle-card reveal">
              <div className="principle-icon">
                <img src={principleIconSmall} alt="" />
              </div>
              <h4>6인 이하 소규모 특화</h4>
              <p>
                대학생 팀플 규모에 맞춰 설계했습니다. 작은 팀에서도 기여도
                차이가 또렷하게 보입니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="final-cta" id="cta" ref={ctaRef}>
        <div className="wrap">
          <h2 className="reveal">
            이번 학기 팀플,
            <br />
            <span className="accent">말이 아니라 데이터</span>로 끝내보세요.
          </h2>
          <p className="reveal">팀원 초대 후 바로 사용 · 별도 설치 없음</p>
          <div className="final-cta-actions reveal">
            <button className="btn btn-primary" onClick={handleKakaoLogin}>
              <img src={kakaoIconCta} alt="" /> 카카오로 시작하기
            </button>
            <button className="btn btn-ghost" onClick={scrollToCta}>
              기능 더 보기
            </button>
          </div>
          <div className="final-cta-note">
            로그인 시 이용약관 및 개인정보처리방침에 동의합니다.
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="wrap">
          <div>© 2026 무임하차</div>
          <div className="footer-links">
            <a href="#">개인정보처리방침</a>
            <a href="#">문의하기</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
