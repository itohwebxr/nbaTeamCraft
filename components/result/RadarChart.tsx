"use client";

interface RadarChartProps {
  offense: number;
  defense: number;
  rebound: number;
  playmaking: number;
  size?: number;
}

const AXES = [
  { key: "offense",    label: "OFF",  angle: -90  },
  { key: "playmaking", label: "PLAY", angle: -18  },
  { key: "defense",    label: "DEF",  angle: 54   },
  { key: "rebound",    label: "REB",  angle: 126  },
  { key: "offense",    label: "",     angle: 198  }, // close polygon
] as const;

const LABELS = [
  { key: "offense",    label: "OFF",  angle: -90  },
  { key: "playmaking", label: "PLAY", angle: -18  },
  { key: "defense",    label: "DEF",  angle: 54   },
  { key: "rebound",    label: "REB",  angle: 126  },
];

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

export default function RadarChart({
  offense, defense, rebound, playmaking, size = 200,
}: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.38;
  const ANGLES = [-90, -18, 54, 126, 198];
  const values = [offense, playmaking, defense, rebound, offense];
  const stats = { offense, playmaking, defense, rebound };

  // Grid rings
  const rings = [25, 50, 75, 100];

  // Data polygon
  const points = ANGLES.map((angle, i) => {
    const r = (values[i] / 100) * maxR;
    return polar(cx, cy, r, angle);
  });
  const polygonPath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";

  // Axis lines
  const axes = ANGLES.slice(0, 4).map((angle) => polar(cx, cy, maxR, angle));

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid rings */}
      {rings.map((pct) => {
        const r = (pct / 100) * maxR;
        const ringPoints = ANGLES.slice(0, 4).map((angle) => polar(cx, cy, r, angle));
        const d = ringPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";
        return <path key={pct} d={d} fill="none" stroke="#3f3f46" strokeWidth="0.5" />;
      })}

      {/* Axis lines */}
      {axes.map((pt, i) => (
        <line key={i} x1={cx} y1={cy} x2={pt.x} y2={pt.y} stroke="#52525b" strokeWidth="0.5" />
      ))}

      {/* Data polygon */}
      <path d={polygonPath} fill="#f97316" fillOpacity="0.25" stroke="#f97316" strokeWidth="1.5" />

      {/* Labels */}
      {LABELS.map(({ key, label, angle }) => {
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
