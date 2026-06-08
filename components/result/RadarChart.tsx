"use client";

interface RadarChartProps {
  offense: number;
  defense: number;
  rebound: number;
  playmaking: number;
  size?: number;
}

// 4 axes at 90° intervals: OFF(top) → PLAY(right) → DEF(bottom) → REB(left)
const AXES = [
  { key: "offense",    label: "OFF",  angle: 0   },
  { key: "playmaking", label: "PLAY", angle: 90  },
  { key: "defense",    label: "DEF",  angle: 180 },
  { key: "rebound",    label: "REB",  angle: 270 },
] as const;

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export default function RadarChart({
  offense, defense, rebound, playmaking, size = 200,
}: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.38;
  const stats = { offense, playmaking, defense, rebound };
  const rings = [25, 50, 75, 100];

  // Grid rings — 4 points, close with Z
  const ringPaths = rings.map((pct) => {
    const r = (pct / 100) * maxR;
    const pts = AXES.map(({ angle }) => polar(cx, cy, r, angle));
    return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";
  });

  // Axis lines
  const axisEnds = AXES.map(({ angle }) => polar(cx, cy, maxR, angle));

  // Data polygon — 4 points + close
  const dataPoints = AXES.map(({ key, angle }) => {
    const val = stats[key as keyof typeof stats];
    return polar(cx, cy, (val / 100) * maxR, angle);
  });
  const polygonPath = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";

  return (
    <svg width={size * 1.25} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid rings */}
      {ringPaths.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="#3f3f46" strokeWidth="0.5" />
      ))}

      {/* Axis lines */}
      {axisEnds.map((pt, i) => (
        <line key={i} x1={cx} y1={cy} x2={pt.x} y2={pt.y} stroke="#52525b" strokeWidth="0.5" />
      ))}

      {/* Data polygon */}
      <path d={polygonPath} fill="#f97316" fillOpacity="0.25" stroke="#f97316" strokeWidth="1.5" />

      {/* Labels */}
      {AXES.map(({ key, label, angle }) => {
        const pt = polar(cx, cy, maxR + 16, angle);
        const val = stats[key as keyof typeof stats];
        return (
          <g key={key}>
            <text x={pt.x} y={pt.y - 4} textAnchor="middle" fill="#a1a1aa" fontSize="8" fontWeight="700">
              {label}
            </text>
            <text x={pt.x} y={pt.y + 7} textAnchor="middle" fill="#e4e4e7" fontSize="9" fontWeight="600">
              {val}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
