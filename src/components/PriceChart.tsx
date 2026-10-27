"use client";

type Point = { t: number; yesPrice: number };

export function PriceChart({
  points,
  last,
}: {
  points: Point[];
  last: number;
}) {
  const w = 720;
  const h = 280;
  const pad = { l: 40, r: 16, t: 18, b: 28 };
  const data =
    points.length > 1
      ? points
      : [
          { t: Date.now() - 3600000, yesPrice: last || 50 },
          { t: Date.now(), yesPrice: last || 50 },
        ];
  const minT = data[0]!.t;
  const maxT = data[data.length - 1]!.t || minT + 1;
  const minP = 0;
  const maxP = 100;
  const x = (t: number) =>
    pad.l + ((t - minT) / Math.max(1, maxT - minT)) * (w - pad.l - pad.r);
  const y = (p: number) =>
    pad.t + ((maxP - p) / (maxP - minP)) * (h - pad.t - pad.b);

  const line = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${x(d.t).toFixed(1)} ${y(d.yesPrice).toFixed(1)}`)
    .join(" ");
  const area = `${line} L ${x(data[data.length - 1]!.t).toFixed(1)} ${h - pad.b} L ${x(data[0]!.t).toFixed(1)} ${h - pad.b} Z`;
  const grid = [20, 40, 50, 60, 80];

  return (
    <div className="relative h-full w-full">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" role="img" aria-label="YES price chart">
        <defs>
          <linearGradient id="yesFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00dd94" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#00dd94" stopOpacity="0" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {grid.map((g) => (
          <g key={g}>
            <line
              x1={pad.l}
              x2={w - pad.r}
              y1={y(g)}
              y2={y(g)}
              stroke={g === 50 ? "#1c3d32" : "#10211a"}
              strokeDasharray={g === 50 ? "0" : "3 5"}
            />
            <text x={8} y={y(g) + 4} fill="#5c7a6c" fontSize="10">
              {g}¢
            </text>
          </g>
        ))}
        <path d={area} fill="url(#yesFill)" />
        <path
          d={line}
          fill="none"
          stroke="#00dd94"
          strokeWidth="2.2"
          filter="url(#glow)"
        />
        <circle
          cx={x(data[data.length - 1]!.t)}
          cy={y(data[data.length - 1]!.yesPrice)}
          r="4.2"
          fill="#00dd94"
        />
      </svg>
    </div>
  );
}
