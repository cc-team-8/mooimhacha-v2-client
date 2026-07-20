interface IntroStepProps {
  teamName: string;
  onStart: () => void;
}

// 1단계 — 정직성 계약. "성적에 반영되지 않는다"를 먼저 못박아야 솔직한 응답이 나온다.
export default function IntroStep({ teamName, onStart }: IntroStepProps) {
  return (
    <div className="pr-step">
      <div className="pr-eyebrow">{teamName}</div>
      <h1 className="pr-title">팀 기여도 상호 평가</h1>
      <p className="pr-lead">
        팀원들이 이번 프로젝트에 각각 얼마나 기여했는지 평가합니다. 약 3분
        걸립니다.
      </p>

      <div className="pr-pact">
        <div className="pr-pact-head">
          <i className="ti ti-lock" />이 평가는{" "}
          <strong>성적에 반영되지 않습니다</strong>
        </div>
        <p className="pr-pact-body">
          저희가 만든 자동 기여도 지표가 실제와 얼마나 맞는지 확인하기 위한
          연구용 자료입니다.
        </p>
        <ul className="pr-pact-list">
          <li>
            <i className="ti ti-eye-off" />
            답변은 <strong>팀원에게 절대 공개되지 않습니다</strong>
          </li>
          <li>
            <i className="ti ti-user-off" />
            교수님께도 <strong>개인 답변은 전달되지 않습니다</strong>
          </li>
          <li>
            <i className="ti ti-chart-bar" />
            완료하시면 <strong>본인의 기여도 결과</strong>를 볼 수 있습니다
          </li>
        </ul>
      </div>

      <p className="pr-note">솔직하게 답해주시는 것이 이 연구의 전부입니다.</p>

      <div className="pr-actions">
        <button className="btn btn-primary pr-btn-lg" onClick={onStart}>
          시작하기 <i className="ti ti-arrow-right" />
        </button>
      </div>
    </div>
  );
}
