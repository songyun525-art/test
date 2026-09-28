export default function Logo() {
  return (
    <div className="logo">
      <svg viewBox="0 0 48 48" width="44" height="44" aria-hidden>
        <circle cx="24" cy="24" r="23" fill="#fde8e4" />
        <path d="M11 24 24 13l13 11" fill="none" stroke="#ef5a4f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15 22v13h18V22" fill="#fff" stroke="#ef5a4f" strokeWidth="3" strokeLinejoin="round" />
        <path d="M24 32s-5-3-5-6.2a2.6 2.6 0 0 1 5-1 2.6 2.6 0 0 1 5 1C29 29 24 32 24 32z" fill="#ef5a4f" />
      </svg>
      <div>
        <div className="logo-small">윤송이의</div>
        <div className="logo-big">내집찾기</div>
        <div className="logo-tag">같은 돈으로, 더 좋은 집을</div>
      </div>
    </div>
  );
}
