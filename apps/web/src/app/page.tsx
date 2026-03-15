'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Play } from 'lucide-react';
import { CaseRecord } from '@sentry/shared';
import Link from 'next/link';
import { EventIcon, RiskBadge, formatActionLabel, formatCaseAge, formatEventTypeLabel } from '@/components/cases/presenters';
import { apiFetch, apiUrl } from '@/lib/api';

type RiskTrendPoint = {
  timestamp: string;
  totalCases: number;
  lowCount: number;
  mediumCount: number;
  highCount: number;
  statusDistribution: { open: number; closed: number };
};

export default function DashboardPage() {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [riskTrend, setRiskTrend] = useState<RiskTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [trendLoading, setTrendLoading] = useState(true);
  const [simulating, setSimulating] = useState<string | null>(null);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<{ cases?: CaseRecord[] }>('/api/cases/recent');
      if (data.cases) {
        setCases(data.cases.slice(0, 5));
      }
    } catch (err) {
      console.error('Failed to fetch cases', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRiskTrend = async () => {
    try {
      setTrendLoading(true);
      const data = await apiFetch<{ trend?: RiskTrendPoint[] }>('/api/cases/risk-trend');
      if (data.trend) setRiskTrend(data.trend);
    } catch (err) {
      console.error('Failed to fetch risk trend', err);
    } finally {
      setTrendLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
    fetchRiskTrend();
    // Auto-sync every 30 seconds for autonomous demo
    const interval = setInterval(() => {
      fetchCases();
      fetchRiskTrend();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const simulateScenario = async (scenario: string) => {
    try {
      setSimulating(scenario);
      await fetch(apiUrl(`/api/scenarios/${scenario}/replay`), { method: 'POST' });
      await fetchCases();
      await fetchRiskTrend();
    } catch (err) {
      console.error(err);
    } finally {
      setSimulating(null);
    }
  };


  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="flex justify-between items-end mb-10">
        <div>
          <div className="flex items-center space-x-2 font-bold text-xs uppercase tracking-[0.3em] mb-2" style={{ color: 'var(--brand)' }}>
            <div className="w-8 h-0.5 rounded-full" style={{ background: 'var(--brand)' }} />
            <span>Mission Control</span>
          </div>
          <h1 className="ui-title text-4xl">SOC Dashboard</h1>
          <p className="ui-subtitle mt-2">Real-time fraud surveillance and autonomous triage hub</p>
        </div>
        <div className="flex items-center space-x-3">
           <Link href="/investigations" className="text-sm font-bold transition-colors uppercase tracking-widest mr-4" style={{ color: 'var(--text-3)' }}
             onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-1)'}
             onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'}
           >
             Archive &rarr;
           </Link>
          <button 
            onClick={() => {
              void fetchCases();
              void fetchRiskTrend();
            }} 
            className="ui-btn-secondary px-5"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin text-blue-500' : ''}`} />
            Sync Hub
          </button>
        </div>
      </div>

      <SecurityRiskTrendCard trend={riskTrend} loading={trendLoading} />

      <div className="grid grid-cols-12 gap-8">
        {/* Main Table Area */}
        <div className="col-span-12 lg:col-span-8">
          <div className="ui-card-elevated overflow-hidden">
            <div className="px-8 py-5 flex justify-between items-center" style={{ borderBottom: '1px solid var(--border-soft)', background: 'rgba(0,0,0,0.15)' }}>
              <h2 className="font-black uppercase tracking-widest text-xs" style={{ color: 'var(--text-1)' }}>Priority Investigations</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase" style={{ color: 'var(--text-3)', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-soft)' }}>TOP 5 ACTIVE</span>
            </div>
            <div className="overflow-x-auto">
              {cases.length === 0 && !loading ? (
                <div className="p-16 text-center font-medium text-sm" style={{ color: 'var(--text-3)' }}>No active investigations. Run a scenario to begin triage.</div>
              ) : (
                <table className="ui-table w-full text-left text-sm">
                  <thead>
                    <tr>
                      <th className="px-8 py-4">Security Event</th>
                      <th className="px-8 py-4">Triage Time</th>
                      <th className="px-8 py-4 text-center">Risk Level</th>
                      <th className="px-8 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cases.map((c) => (
                      <tr 
                        key={c.caseId} 
                        onClick={() => window.location.href = `/case/${c.caseId}`}
                        className="transition-colors cursor-pointer group"
                      >
                        <td className="px-8 py-5">
                          <div className="flex items-center space-x-4">
                            <div className="p-2.5 rounded-xl transition-colors" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-soft)' }}>
                              <EventIcon type={c.eventType} />
                            </div>
                            <div>
                               <div className="font-black text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors capitalize">{formatEventTypeLabel(c.eventType)}</div>
                               <div className="text-[10px] font-mono font-bold text-slate-500 uppercase">ID: {c.caseId.slice(0, 8)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-slate-600 font-semibold text-xs whitespace-nowrap">
                          {formatCaseAge(c.createdAt)}
                        </td>
                        <td className="px-8 py-5 text-center">
                          <div className="flex flex-col items-center">
                            <RiskBadge classification={c.classification} />
                            <span className="text-[9px] font-mono font-black text-slate-400 mt-1">SCORE {c.riskScore}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end space-x-3">
                            <span className="inline-flex items-center text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider" style={{ color: 'var(--text-2)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-soft)' }}>
                              {formatActionLabel(c.action)}
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Demo Controller Sidebar */}
        <div className="col-span-12 lg:col-span-4">
          <div className="rounded-3xl p-8 shadow-2xl relative overflow-hidden" style={{ background: '#0a1421', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 16px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)' }}>
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Play className="w-20 h-20 text-blue-500" />
            </div>
            <h2 className="font-black text-cyan-300 uppercase tracking-[0.2em] text-xs mb-2">
              Scenario Simulator
            </h2>
            <p className="text-xs text-slate-400 mb-8 font-medium">Inject synthetic high-fidelity audit events</p>
            
            <div className="space-y-4 relative z-10">
              <ScenarioButton
                label="Login" desc="Normal, VPN, impossible travel, or Tor"
                onClick={() => simulateScenario('login')}
                loading={simulating === 'login'}
              />
              <ScenarioButton
                label="Phishing Email" desc="Spam, spoofed sender, or spear phish"
                onClick={() => simulateScenario('phishing_email')}
                loading={simulating === 'phishing_email'}
                variant="warning"
              />
              <ScenarioButton
                label="Suspicious Link" desc="Shortener, typosquat, or C2 redirect"
                onClick={() => simulateScenario('suspicious_link')}
                loading={simulating === 'suspicious_link'}
                variant="warning"
              />
              <ScenarioButton
                label="Fraudulent Transaction" desc="Abnormal amount, new region, or ATO"
                onClick={() => simulateScenario('fraudulent_transaction')}
                loading={simulating === 'fraudulent_transaction'}
                variant="danger"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Chart palette — used throughout the chart component
const CHART_COLORS = {
  high:   { line: '#e05555', area: 'rgba(224,85,85,',   dot: '#e05555' },
  medium: { line: '#d4922a', area: 'rgba(212,146,42,',  dot: '#d4922a' },
  low:    { line: '#22b59c', area: 'rgba(34,181,156,',  dot: '#22b59c' },
} as const;

function SecurityRiskTrendCard({ trend, loading }: { trend: RiskTrendPoint[]; loading: boolean }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const chartHeight = 230;
  const chartWidth  = 1000;
  const topPadding    = 20;
  const bottomPadding = 38;
  const leftPadding   = 44;
  const rightPadding  = 20;
  const innerHeight = chartHeight - topPadding - bottomPadding;
  const innerWidth  = chartWidth  - leftPadding - rightPadding;
  const maxY = Math.max(
    1,
    ...trend.map((item) => Math.max(item.highCount, item.mediumCount, item.lowCount))
  );
  const hasAnyData = trend.some((item) => item.totalCases > 0);

  const points = trend.map((item, index) => {
    const x = leftPadding + (trend.length <= 1 ? innerWidth / 2 : (index / (trend.length - 1)) * innerWidth);
    const toY = (value: number) => topPadding + ((maxY - value) / maxY) * innerHeight;
    return {
      x,
      yHigh:   toY(item.highCount),
      yMedium: toY(item.mediumCount),
      yLow:    toY(item.lowCount),
      ...item,
    };
  });

  const highLinePath   = buildSmoothPath(points.map((p) => ({ x: p.x, y: p.yHigh   })));
  const mediumLinePath = buildSmoothPath(points.map((p) => ({ x: p.x, y: p.yMedium })));
  const lowLinePath    = buildSmoothPath(points.map((p) => ({ x: p.x, y: p.yLow    })));

  const baselineY = chartHeight - bottomPadding;
  const makeArea = (linePath: string) =>
    linePath
      ? `${linePath} L ${points[points.length - 1]?.x ?? leftPadding} ${baselineY} L ${points[0]?.x ?? leftPadding} ${baselineY} Z`
      : '';

  const highAreaPath   = makeArea(highLinePath);
  const mediumAreaPath = makeArea(mediumLinePath);
  const lowAreaPath    = makeArea(lowLinePath);

  // 4 gridlines — cleaner than 5
  const gridLevels = Array.from({ length: 4 }, (_, i) => ({
    value: Math.round((maxY / 3) * i),
    y: topPadding + ((3 - i) / 3) * innerHeight,
  }));

  return (
    <section className="mb-8 ui-card-elevated p-6">
      {/* Card header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="font-black tracking-tight text-base" style={{ color: 'var(--text-1)' }}>
            Security Risk Trend
          </h2>
          <p className="text-xs mt-0.5 font-medium" style={{ color: 'var(--text-3)' }}>
            Hourly investigation volume by severity · past 24 hours
          </p>
        </div>
        {/* Legend — small line segments, more refined than dots */}
        <div className="flex items-center gap-5 text-[11px] font-semibold" style={{ color: 'var(--text-2)' }}>
          {([['high','High'],['medium','Medium'],['low','Low']] as const).map(([key, label]) => (
            <span key={key} className="inline-flex items-center gap-1.5">
              <span style={{ display: 'inline-block', width: 14, height: 2, borderRadius: 2, background: CHART_COLORS[key].line }} />
              {label}
            </span>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-56 flex items-center justify-center gap-2 text-sm" style={{ color: 'var(--text-3)' }}>
          <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--brand)' }} />
          Building risk trend...
        </div>
      ) : points.length === 0 ? (
        <div className="h-56 flex items-center justify-center text-sm" style={{ color: 'var(--text-3)' }}>
          No investigation data available yet.
        </div>
      ) : (
        <div className="relative">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full"
            style={{ height: 224 }}
            onMouseLeave={() => setHoverIndex(null)}
          >
            <defs>
              {/* Area fill gradients — very subtle */}
              {(['high','medium','low'] as const).map((key) => (
                <linearGradient key={key} id={`${key}AreaGrad`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={CHART_COLORS[key].line} stopOpacity="0.12" />
                  <stop offset="100%" stopColor={CHART_COLORS[key].line} stopOpacity="0"    />
                </linearGradient>
              ))}
              {/* Glow filter for hover dots */}
              <filter id="dotGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {/* Gridlines */}
            {gridLevels.map(({ value, y }) => (
              <g key={value}>
                <line
                  x1={leftPadding} y1={y}
                  x2={chartWidth - rightPadding} y2={y}
                  stroke="rgba(255,255,255,0.07)" strokeWidth="1"
                />
                <text
                  x={leftPadding - 8} y={y + 4}
                  textAnchor="end"
                  fontSize="9" fontWeight="600"
                  fill="rgba(180,200,230,0.35)"
                >
                  {value}
                </text>
              </g>
            ))}

            {/* Baseline */}
            <line
              x1={leftPadding} y1={baselineY}
              x2={chartWidth - rightPadding} y2={baselineY}
              stroke="rgba(255,255,255,0.12)" strokeWidth="1"
            />

            {/* Area fills — animate opacity in */}
            {lowAreaPath   && <path className="chart-area-reveal" d={lowAreaPath}   fill="url(#lowAreaGrad)"    />}
            {mediumAreaPath && <path className="chart-area-reveal" d={mediumAreaPath} fill="url(#mediumAreaGrad)" />}
            {highAreaPath  && <path className="chart-area-reveal" d={highAreaPath}   fill="url(#highAreaGrad)"   />}

            {/* Lines — draw-on animation */}
            {([
              { path: lowLinePath,    color: CHART_COLORS.low.line,    dur: '800ms'  },
              { path: mediumLinePath, color: CHART_COLORS.medium.line,  dur: '950ms'  },
              { path: highLinePath,   color: CHART_COLORS.high.line,    dur: '1100ms' },
            ] as const).map(({ path, color, dur }) =>
              path ? (
                <path
                  key={color}
                  d={path}
                  fill="none"
                  stroke={color}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="2000"
                  strokeDashoffset="2000"
                >
                  <animate attributeName="stroke-dashoffset" from="2000" to="0" dur={dur} fill="freeze" />
                </path>
              ) : null
            )}

            {/* Hover capture bands */}
            {points.map((point, index) => {
              const prevX = points[index - 1]?.x ?? leftPadding;
              const nextX = points[index + 1]?.x ?? (chartWidth - rightPadding);
              const bandStart = index === 0 ? leftPadding : (prevX + point.x) / 2;
              const bandEnd   = index === points.length - 1 ? chartWidth - rightPadding : (point.x + nextX) / 2;
              return (
                <rect
                  key={`band-${index}`}
                  x={bandStart} y={topPadding}
                  width={Math.max(2, bandEnd - bandStart)} height={innerHeight}
                  fill="transparent"
                  onMouseEnter={() => setHoverIndex(index)}
                />
              );
            })}

            {/* Hover crosshair */}
            {hoverIndex !== null && points[hoverIndex] && (
              <line
                x1={points[hoverIndex].x} y1={topPadding}
                x2={points[hoverIndex].x} y2={baselineY}
                stroke="rgba(255,255,255,0.14)"
                strokeWidth="1"
                strokeDasharray="3 4"
              />
            )}

            {/* Hover dots */}
            {points.map((point, index) => (
              <g key={`dot-${index}`} filter={hoverIndex === index ? 'url(#dotGlow)' : undefined}>
                {([
                  { cy: point.yHigh,   color: CHART_COLORS.high.dot   },
                  { cy: point.yMedium, color: CHART_COLORS.medium.dot  },
                  { cy: point.yLow,    color: CHART_COLORS.low.dot     },
                ] as const).map(({ cy, color }) => (
                  <circle
                    key={color}
                    cx={point.x} cy={cy}
                    r={hoverIndex === index ? 4 : 0}
                    fill={color}
                    stroke="rgba(15,25,40,0.9)"
                    strokeWidth="1.5"
                  />
                ))}
              </g>
            ))}

            {/* X-axis time labels */}
            {points.map((point, index) =>
              (index % 3 === 0 || index === points.length - 1) ? (
                <text
                  key={`xlabel-${index}`}
                  x={point.x} y={chartHeight - 10}
                  textAnchor="middle"
                  fontSize="9" fontWeight="600"
                  fill="rgba(180,200,230,0.35)"
                >
                  {formatTrendLabel(point.timestamp)}
                </text>
              ) : null
            )}
          </svg>

          {/* Hover tooltip */}
          {hoverIndex !== null && points[hoverIndex] && (
            <div
              className="absolute right-3 top-2 w-60 rounded-2xl p-3.5 text-xs shadow-2xl"
              style={{
                background: 'var(--surface-1)',
                border: '1px solid var(--border-soft)',
                color: 'var(--text-1)',
              }}
            >
              <p className="font-bold mb-2 text-[11px]" style={{ color: 'var(--text-2)' }}>
                {formatTrendTooltip(points[hoverIndex].timestamp)}
              </p>
              <div className="space-y-1">
                {([
                  { label: 'High',   value: points[hoverIndex].highCount,   color: CHART_COLORS.high.dot   },
                  { label: 'Medium', value: points[hoverIndex].mediumCount,  color: CHART_COLORS.medium.dot  },
                  { label: 'Low',    value: points[hoverIndex].lowCount,     color: CHART_COLORS.low.dot     },
                ] as const).map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5" style={{ color: 'var(--text-2)' }}>
                      <span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background: color }} />
                      {label}
                    </span>
                    <span className="font-black" style={{ color }}>{value}</span>
                  </div>
                ))}
                <div className="border-t pt-1.5 mt-1.5 flex justify-between" style={{ borderColor: 'var(--border-soft)' }}>
                  <span style={{ color: 'var(--text-3)' }}>Total</span>
                  <span className="font-bold" style={{ color: 'var(--text-1)' }}>{points[hoverIndex].totalCases}</span>
                </div>
              </div>
            </div>
          )}

          {!hasAnyData && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className="text-[11px] font-semibold px-3 py-1.5 rounded-lg"
                style={{ color: 'var(--text-3)', background: 'rgba(15,25,40,0.7)', border: '1px solid var(--border-soft)' }}
              >
                No investigations in the past 24 hours
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function buildSmoothPath(points: Array<{ x: number; y: number }>) {
  if (points.length < 2) return '';
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    const prev = points[i - 1] || current;
    const nextNext = points[i + 2] || next;

    const cp1x = current.x + (next.x - prev.x) / 6;
    const cp1y = current.y + (next.y - prev.y) / 6;
    const cp2x = next.x - (nextNext.x - current.x) / 6;
    const cp2y = next.y - (nextNext.y - current.y) / 6;

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
  }
  return path;
}

function formatTrendLabel(timestamp: string) {
  const date = new Date(timestamp);
  return `${date.getHours().toString().padStart(2, '0')}:00`;
}

function formatTrendTooltip(timestamp: string) {
  const date = new Date(timestamp);
  return `${date.toLocaleDateString()} ${date.getHours().toString().padStart(2, '0')}:00`;
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function ScenarioButton({
  label,
  desc,
  onClick,
  loading,
  variant = 'default',
}: {
  label: string;
  desc: string;
  onClick: () => void;
  loading: boolean;
  variant?: 'default' | 'danger' | 'warning';
}) {
  const baseColors = variant === 'danger' 
    ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20 hover:border-red-500/45 text-red-300' 
    : variant === 'warning'
      ? 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20 hover:border-amber-500/45 text-amber-300'
      : 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20 hover:border-blue-500/45 text-blue-300';

  return (
    <button 
      onClick={onClick} 
      disabled={loading}
      className={`w-full text-left p-4 rounded-xl border ${baseColors} transition-all duration-300 group flex justify-between items-center shadow-lg shadow-black/15`}
    >
      <div>
        <div className="font-black text-xs uppercase tracking-widest">{label}</div>
        <div className="text-[10px] opacity-60 mt-1 font-bold">{desc}</div>
      </div>
      {loading ? (
        <RefreshCw className="w-3 h-3 animate-spin" />
      ) : (
        <Play className="w-3 h-3 opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
      )}
    </button>
  );
}
