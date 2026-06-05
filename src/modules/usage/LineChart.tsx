import { useMemo, useState } from "react";

type ChartPoint = { label: string; cost: number };

export function LineChart({ data }: { data: ChartPoint[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const sanitizedData = useMemo(() => {
    return (data || []).map((d) => ({
      label: d.label || "",
      cost: Number(d.cost) || 0,
    }));
  }, [data]);

  const labelInterval = Math.max(1, Math.ceil(sanitizedData.length / 8));

  const renderedLabelIndices = useMemo(() => {
    const indices: number[] = [];
    let lastAdded = -999;
    for (let i = 0; i < sanitizedData.length; i++) {
      if (i === sanitizedData.length - 1) {
        if (i - lastAdded >= labelInterval * 0.7) {
          indices.push(i);
        } else if (indices.length > 0) {
          indices[indices.length - 1] = i;
        }
      } else if (i % labelInterval === 0) {
        indices.push(i);
        lastAdded = i;
      }
    }
    return new Set(indices);
  }, [sanitizedData, labelInterval]);

  if (sanitizedData.length === 0) {
    return <p className="empty-text">当前范围没有趋势数据。</p>;
  }

  const maxVal = Math.max(...sanitizedData.map((d) => d.cost), 0.0001);

  // Chart dimensions
  const width = 500;
  const height = 220;
  const paddingLeft = 45;
  const paddingRight = 15;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const getX = (index: number) => {
    if (sanitizedData.length <= 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + (index / (sanitizedData.length - 1)) * chartWidth;
  };

  const getY = (val: number) => {
    const costVal = Number(val) || 0;
    return paddingTop + chartHeight - (costVal / maxVal) * chartHeight;
  };

  const points = sanitizedData.map((d, i) => ({
    x: getX(i),
    y: getY(d.cost),
  }));

  let pathD = "";
  if (points.length > 0) {
    pathD = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(" ");
  }

  let areaD = "";
  if (points.length > 0) {
    areaD = `${pathD} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`;
  }

  const yTicks = [0, 0.33, 0.66, 1].map((ratio) => {
    const val = ratio * maxVal;
    return {
      val,
      y: getY(val),
      label: ratio === 0 ? "$0" : `$${val.toFixed(2)}`,
    };
  });

  return (
    <div className="line-chart-container" style={{ position: "relative", width: "100%", padding: "10px 0" }}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0b94ff" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="strokeGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0b94ff" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yTicks.map((tick, i) => (
          <g key={i}>
            <line
              x1={paddingLeft}
              y1={tick.y}
              x2={width - paddingRight}
              y2={tick.y}
              stroke="#e2e8f0"
              strokeDasharray="3 3"
              strokeWidth="1"
            />
            <text
              x={paddingLeft - 8}
              y={tick.y + 4}
              textAnchor="end"
              fill="#64748b"
              fontSize="9"
              fontFamily="monospace"
            >
              {tick.label}
            </text>
          </g>
        ))}

        {/* Area fill */}
        {areaD && <path d={areaD} fill="url(#chartGrad)" />}

        {/* Line path */}
        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke="url(#strokeGrad)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* X-axis line */}
        <line
          x1={paddingLeft}
          y1={paddingTop + chartHeight}
          x2={width - paddingRight}
          y2={paddingTop + chartHeight}
          stroke="#cbd5e1"
          strokeWidth="1"
        />

        {/* X-axis labels */}
        {sanitizedData.map((d, i) => {
          if (!renderedLabelIndices.has(i)) return null;
          return (
            <text
              key={i}
              x={getX(i)}
              y={paddingTop + chartHeight + 16}
              textAnchor="middle"
              fill="#64748b"
              fontSize="9"
            >
              {d.label}
            </text>
          );
        })}

        {/* Data points and hover overlay */}
        {points.map((p, i) => (
          <g
            key={i}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
            style={{ cursor: "pointer" }}
          >
            <circle cx={p.x} cy={p.y} r="8" fill="transparent" />
            <circle
              cx={p.x}
              cy={p.y}
              r={hoveredIdx === i ? "4.5" : "3"}
              fill={hoveredIdx === i ? "#7c3aed" : "#0b94ff"}
              stroke="#fff"
              strokeWidth={hoveredIdx === i ? "2" : "1.5"}
              style={{ transition: "all 0.1s ease" }}
            />
          </g>
        ))}
      </svg>

      {hoveredIdx !== null && sanitizedData[hoveredIdx] && (
        <div
          style={{
            position: "absolute",
            left: `${(getX(hoveredIdx) / width) * 100}%`,
            top: `${(getY(sanitizedData[hoveredIdx].cost) / height) * 100 - 15}%`,
            transform: "translate(-50%, -100%)",
            background: "rgba(15, 23, 42, 0.95)",
            color: "#fff",
            padding: "5px 9px",
            borderRadius: "6px",
            fontSize: "11px",
            fontFamily: "sans-serif",
            pointerEvents: "none",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            zIndex: 10,
            whiteSpace: "nowrap",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
          }}
        >
          <span style={{ fontWeight: 600, color: "#93c5fd" }}>{sanitizedData[hoveredIdx].label}</span>
          <span style={{ fontWeight: 700, fontSize: "12px" }}>
            费用: ${sanitizedData[hoveredIdx].cost.toFixed(4)}
          </span>
        </div>
      )}
    </div>
  );
}

// `percentage` from cockpit-tools is the REMAINING fraction (100 = full).
// Color the battery-style bar: green when healthy, red when nearly out.
