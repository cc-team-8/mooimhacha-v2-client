import type { ReactNode, CSSProperties } from "react";

interface CardProps {
  icon: string;
  title: string;
  // titleSuffix: 타이틀 텍스트 바로 뒤에 붙는 인라인 요소 (예: live-dot).
  // extra와 달리 card-title span 안쪽에 위치함.
  titleSuffix?: ReactNode;
  // extra: 카드 헤더 우측 영역 (badge, 카운트, 링크 등)
  extra?: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
}

export default function Card({
  icon,
  title,
  titleSuffix,
  extra,
  children,
  style,
}: CardProps) {
  return (
    <div className="card" style={style}>
      <div className="card-head">
        <span className="card-title">
          <i className={icon} /> {title}
          {titleSuffix}
        </span>
        {extra}
      </div>
      {children}
    </div>
  );
}
