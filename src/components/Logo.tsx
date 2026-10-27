export function Logo({
  size = 32,
  wordmark = true,
  className = "",
}: {
  size?: number;
  wordmark?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
      >
        <rect width="32" height="32" rx="8" fill="#07140f" />
        <rect
          x="0.6"
          y="0.6"
          width="30.8"
          height="30.8"
          rx="7.4"
          stroke="#00dd94"
          strokeOpacity="0.35"
        />
        <path
          d="M8 9.5h16M16.2 9.5v14.2"
          stroke="#00dd94"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M16.2 7.4v2.2"
          stroke="#8cffd3"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <circle cx="16.2" cy="7.2" r="1.15" fill="#8cffd3" />
      </svg>
      {wordmark ? (
        <span className="font-display text-[1.05rem] font-semibold tracking-tight text-white">
          Tejas Trading
        </span>
      ) : null}
    </span>
  );
}
