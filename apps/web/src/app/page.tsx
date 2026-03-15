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
          <div className="flex items-center space-x-2 text-blue-700 font-bold text-xs uppercase tracking-[0.3em] mb-2">
            <div className="w-8 h-1 bg-blue-700 rounded-full" />
            <span>Mission Control</span>
          </div>
          <h1 className="ui-title text-4xl">SOC Dashboard</h1>
          <p className="ui-subtitle mt-2">Real-time fraud surveillance and autonomous triage hub</p>
        </div>
        <div className="flex items-center space-x-3">
           <Link href="/investigations" className="text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors uppercase tracking-widest mr-4">
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
            <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/70 flex justify-between items-center">
              <h2 className="font-black text-slate-900 uppercase tracking-widest text-xs">Priority Investigations</h2>
              <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded uppercase">TOP 5 ACTIVE</span>
            </div>
            <div className="overflow-x-auto">
              {cases.length === 0 && !loading ? (
                <div className="p-16 text-center text-slate-500 font-medium">No active investigations. Run a scenario to begin triage.</div>
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
                            <div className="p-2.5 bg-slate-50 rounded-xl group-hover:bg-white transition-colors border border-transparent group-hover:border-blue-100">
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
                            <span className="inline-flex items-center text-[10px] font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg uppercase tracking-wider border border-slate-200">
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
          <div className="bg-[#0b162a] rounded-3xl p-8 shadow-2xl relative overflow-hidden border border-slate-800">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Play className="w-20 h-20 text-blue-500" />
            </div>
            <h2 className="font-black text-cyan-300 uppercase tracking-[0.2em] text-xs mb-2">
              Scenario Simulator
            </h2>
            <p className="text-xs text-slate-400 mb-8 font-medium">Inject synthetic high-fidelity audit events</p>
            
            <div className="space-y-4 relative z-10">
              <ScenarioButton 
                label="Safe Login" desc="Standard office session" 
                onClick={() => simulateScenario('safe_login')}
                loading={simulating === 'safe_login'}
              />
              <ScenarioButton 
                label="Malicious Login" desc="VPN based ATO attempt" 
                onClick={() => simulateScenario('malicious_login')}
                loading={simulating === 'malicious_login'}
                variant="danger"
              />
              <ScenarioButton 
                label="Targeted Phishing" desc="Email auth failure" 
                onClick={() => simulateScenario('phishing_email')}
                loading={simulating === 'phishing_email'}
                variant="warning"
              />
              <ScenarioButton 
                label="Suspicious Link" desc="Redirect to bad domain" 
                onClick={() => simulateScenario('url_click')}
                loading={simulating === 'url_click'}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SecurityRiskTrendCard({ trend, loading }: { trend: RiskTrendPoint[]; loading: boolean }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const chartHeight = 220;
  const chartWidth = 1000;
  const topPadding = 18;
  const bottomPadding = 34;
  const leftPadding = 40;
  const rightPadding = 20;
  const innerHeight = chartHeight - topPadding - bottomPadding;
  const innerWidth = chartWidth - leftPadding - rightPadding;
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
      yHigh: toY(item.highCount),
      yMedium: toY(item.mediumCount),
      yLow: toY(item.lowCount),
      ...item,
    };
  });

  const highLinePath = buildSmoothPath(points.map((point) => ({ x: point.x, y: point.yHigh })));
  const mediumLinePath = buildSmoothPath(points.map((point) => ({ x: point.x, y: point.yMedium })));
  const lowLinePath = buildSmoothPath(points.map((point) => ({ x: point.x, y: point.yLow })));
  const highAreaPath = highLinePath
    ? `${highLinePath} L ${points[points.length - 1]?.x ?? leftPadding} ${chartHeight - bottomPadding} L ${points[0]?.x ?? leftPadding} ${chartHeight - bottomPadding} Z`
    : '';
  const mediumAreaPath = mediumLinePath
    ? `${mediumLinePath} L ${points[points.length - 1]?.x ?? leftPadding} ${chartHeight - bottomPadding} L ${points[0]?.x ?? leftPadding} ${chartHeight - bottomPadding} Z`
    : '';
  const lowAreaPath = lowLinePath
    ? `${lowLinePath} L ${points[points.length - 1]?.x ?? leftPadding} ${chartHeight - bottomPadding} L ${points[0]?.x ?? leftPadding} ${chartHeight - bottomPadding} Z`
    : '';

  return (
    <section className="mb-8 ui-card-elevated p-6">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="font-black text-slate-900 tracking-tight text-lg">Security Risk Trend</h2>
          <p className="text-xs text-slate-600 mt-1">Hourly investigation volume by severity over the past 24 hours (open + closed)</p>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-semibold">
          <span className="inline-flex items-center text-slate-600"><i className="w-2.5 h-2.5 rounded-full bg-[#ef4444] mr-1.5" />High</span>
          <span className="inline-flex items-center text-slate-600"><i className="w-2.5 h-2.5 rounded-full bg-[#facc15] mr-1.5" />Medium</span>
          <span className="inline-flex items-center text-slate-600"><i className="w-2.5 h-2.5 rounded-full bg-[#22c55e] mr-1.5" />Low</span>
        </div>
      </div>

      {loading ? (
        <div className="h-56 flex items-center justify-center text-slate-500 text-sm">
          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          Building risk trend...
        </div>
      ) : points.length === 0 ? (
        <div className="h-56 flex items-center justify-center text-slate-500 text-sm">
          No investigation data available yet.
        </div>
      ) : (
        <div className="relative">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-56 transition-opacity duration-700 opacity-100"
            onMouseLeave={() => setHoverIndex(null)}
          >
            <defs>
              <linearGradient id="highGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.02" />
              </linearGradient>
              <linearGradient id="mediumGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#facc15" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#facc15" stopOpacity="0.02" />
              </linearGradient>
              <linearGradient id="lowGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#22c55e" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {Array.from({ length: 5 }).map((_, index) => {
              const level = Math.round((maxY / 4) * index);
              const y = topPadding + ((4 - index) / 4) * innerHeight;
              return (
                <g key={`${level}-${index}`}>
                  <line x1={leftPadding} y1={y} x2={chartWidth - rightPadding} y2={y} stroke="#e2e8f0" strokeWidth="1" />
                  <text x={8} y={y + 4} className="fill-slate-400 text-[10px] font-semibold">
                    {level}
                  </text>
                </g>
              );
            })}
            <text x={6} y={14} className="fill-slate-500 text-[10px] font-bold">
              Count
            </text>
            <text x={chartWidth - 52} y={chartHeight - 8} className="fill-slate-500 text-[10px] font-bold">
              Time
            </text>

            {lowAreaPath && <path d={lowAreaPath} fill="url(#lowGradient)" />}
            {mediumAreaPath && <path d={mediumAreaPath} fill="url(#mediumGradient)" />}
            {highAreaPath && <path d={highAreaPath} fill="url(#highGradient)" />}

            {lowLinePath && (
              <path
                d={lowLinePath}
                fill="none"
                stroke="#22c55e"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="1200"
                strokeDashoffset="1200"
              >
                <animate attributeName="stroke-dashoffset" from="1200" to="0" dur="900ms" fill="freeze" />
              </path>
            )}
            {mediumLinePath && (
              <path
                d={mediumLinePath}
                fill="none"
                stroke="#facc15"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="1200"
                strokeDashoffset="1200"
              >
                <animate attributeName="stroke-dashoffset" from="1200" to="0" dur="1s" fill="freeze" />
              </path>
            )}
            {highLinePath && (
              <path
                d={highLinePath}
                fill="none"
                stroke="#ef4444"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="1200"
                strokeDashoffset="1200"
              >
                <animate attributeName="stroke-dashoffset" from="1200" to="0" dur="1100ms" fill="freeze" />
              </path>
            )}

            {points.map((point, index) => {
              const prevX = points[index - 1]?.x ?? leftPadding;
              const nextX = points[index + 1]?.x ?? (chartWidth - rightPadding);
              const bandStart = index === 0 ? leftPadding : (prevX + point.x) / 2;
              const bandEnd = index === points.length - 1 ? chartWidth - rightPadding : (point.x + nextX) / 2;
              return (
                <rect
                  key={`hover-band-${point.timestamp}-${index}`}
                  x={bandStart}
                  y={topPadding}
                  width={Math.max(2, bandEnd - bandStart)}
                  height={innerHeight}
                  fill="transparent"
                  onMouseEnter={() => setHoverIndex(index)}
                />
              );
            })}

            {hoverIndex !== null && points[hoverIndex] && (
              <line
                x1={points[hoverIndex].x}
                y1={topPadding}
                x2={points[hoverIndex].x}
                y2={chartHeight - bottomPadding}
                stroke="#94a3b8"
                strokeWidth="1"
                strokeDasharray="3 4"
              />
            )}

            {points.map((point, index) => (
              <g key={`${point.timestamp}-${index}`}>
                <circle
                  cx={point.x}
                  cy={point.yHigh}
                  r={hoverIndex === index ? 4.5 : 0}
                  fill="#ef4444"
                  stroke="#fff"
                  strokeWidth="1.5"
                />
                <circle cx={point.x} cy={point.yMedium} r={hoverIndex === index ? 4.5 : 0} fill="#facc15" stroke="#fff" strokeWidth="1.5" />
                <circle cx={point.x} cy={point.yLow} r={hoverIndex === index ? 4.5 : 0} fill="#22c55e" stroke="#fff" strokeWidth="1.5" />
              </g>
            ))}

            {points.map((point, index) => (
              index % 3 === 0 || index === points.length - 1 ? (
                <text key={`x-${point.timestamp}-${index}`} x={point.x} y={chartHeight - 8} textAnchor="middle" className="fill-slate-400 text-[10px] font-semibold">
                  {formatTrendLabel(point.timestamp)}
                </text>
              ) : null
            ))}
          </svg>

          {hoverIndex !== null && points[hoverIndex] && (
            <div className="absolute right-3 top-3 w-72 bg-[#0a1324] text-slate-100 rounded-2xl p-3 text-xs shadow-2xl border border-slate-700">
              <p className="font-bold text-[11px]">{formatTrendTooltip(points[hoverIndex].timestamp)}</p>
              <p className="mt-1 text-slate-300">Investigations: {points[hoverIndex].totalCases}</p>
              <p className="text-slate-300">
                High {points[hoverIndex].highCount} | Medium {points[hoverIndex].mediumCount} | Low {points[hoverIndex].lowCount}
              </p>
            </div>
          )}

          {!hasAnyData && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-[11px] font-semibold text-slate-500 bg-white/85 px-3 py-1.5 rounded-lg border border-slate-200">
                No investigations in most of the past 24 hours.
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
