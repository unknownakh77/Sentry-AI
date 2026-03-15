'use client';

import React, { useState, useEffect } from 'react';
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
      <div className="flex justify-between items-end mb-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="live-dot" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]" style={{color:'rgba(0,194,255,0.6)'}}>Mission Control</span>
          </div>
          <h1 className="ui-title text-4xl" style={{letterSpacing:'-0.04em'}}>SOC Dashboard</h1>
          <p className="ui-subtitle mt-1.5">Real-time fraud surveillance · autonomous triage</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/investigations" className="text-xs font-bold uppercase tracking-widest transition-colors"
            style={{color:'rgba(0,194,255,0.5)'}}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color='#00c2ff'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color='rgba(0,194,255,0.5)'}>
            Archive &rarr;
          </Link>
          <button
            onClick={() => { void fetchCases(); void fetchRiskTrend(); }}
            className="ui-btn-secondary flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} style={{color: loading ? '#00c2ff' : undefined}} />
            Sync
          </button>
        </div>
      </div>

      <SecurityRiskTrendCard trend={riskTrend} loading={trendLoading} />

      <div className="grid grid-cols-12 gap-6">
        {/* Main Table */}
        <div className="col-span-12 lg:col-span-8">
          <div className="ui-card-elevated overflow-hidden">
            <div className="px-6 py-4 flex justify-between items-center" style={{borderBottom:'1px solid rgba(0,194,255,0.08)', background:'rgba(0,194,255,0.02)'}}>
              <div className="flex items-center gap-2">
                <span className="live-dot" />
                <h2 className="font-black uppercase tracking-widest text-[10px]" style={{color:'rgba(0,194,255,0.7)'}}>Priority Queue</h2>
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md" style={{color:'rgba(0,194,255,0.5)', border:'1px solid rgba(0,194,255,0.12)', background:'rgba(0,194,255,0.05)'}}>Top 5 Active</span>
            </div>
            <div className="overflow-x-auto">
              {cases.length === 0 && !loading ? (
                <div className="p-16 text-center text-sm font-medium" style={{color:'rgba(122,155,191,0.4)'}}>
                  No active investigations. Inject a scenario to begin.
                </div>
              ) : (
                <table className="ui-table w-full text-left text-sm">
                  <thead>
                    <tr>
                      <th className="px-6 py-3.5">Security Event</th>
                      <th className="px-6 py-3.5">Age</th>
                      <th className="px-6 py-3.5 text-center">Risk</th>
                      <th className="px-6 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cases.map((c) => (
                      <tr key={c.caseId} onClick={() => window.location.href = `/case/${c.caseId}`} className="cursor-pointer group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg transition-all" style={{background:'rgba(0,194,255,0.06)', border:'1px solid rgba(0,194,255,0.1)'}}>
                              <EventIcon type={c.eventType} />
                            </div>
                            <div>
                              <div className="font-bold text-sm capitalize transition-colors group-hover:text-[#00c2ff]" style={{color:'#e2f0ff'}}>{formatEventTypeLabel(c.eventType)}</div>
                              <div className="text-[10px] font-mono font-bold uppercase" style={{color:'rgba(122,155,191,0.5)', fontFamily:'JetBrains Mono, monospace'}}>#{c.caseId.slice(0, 8)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold whitespace-nowrap" style={{color:'rgba(122,155,191,0.7)', fontFamily:'JetBrains Mono, monospace'}}>
                          {formatCaseAge(c.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            <RiskBadge classification={c.classification} />
                            <span className="text-[9px] font-black uppercase" style={{color:'rgba(122,155,191,0.4)', fontFamily:'JetBrains Mono, monospace'}}>score {c.riskScore}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md" style={{color:'rgba(0,194,255,0.6)', background:'rgba(0,194,255,0.06)', border:'1px solid rgba(0,194,255,0.12)'}}>
                              {formatActionLabel(c.action)}
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 transition-all group-hover:translate-x-0.5" style={{color:'rgba(0,194,255,0.3)'}} />
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

        {/* Scenario Simulator */}
        <div className="col-span-12 lg:col-span-4">
          <div className="rounded-2xl p-6 relative overflow-hidden h-full" style={{background:'#040e1f', border:'1px solid rgba(0,194,255,0.1)', boxShadow:'0 0 40px rgba(0,194,255,0.04)'}}>
            <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 20px,rgba(0,194,255,1) 20px,rgba(0,194,255,1) 21px),repeating-linear-gradient(90deg,transparent,transparent 20px,rgba(0,194,255,1) 20px,rgba(0,194,255,1) 21px)'}} />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1">
                <Play className="w-3.5 h-3.5" style={{color:'#00c2ff'}} />
                <h2 className="font-black uppercase tracking-[0.2em] text-[10px]" style={{color:'#00c2ff'}}>Scenario Engine</h2>
              </div>
              <p className="text-xs mb-6 font-medium" style={{color:'rgba(122,155,191,0.5)'}}>Inject synthetic threat events for live demo</p>
            
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
      <div className="flex items-end justify-between mb-5">
        <div>
          <h2 className="font-black tracking-tight text-base" style={{color:'#e2f0ff'}}>Security Risk Trend</h2>
          <p className="text-xs mt-0.5" style={{color:'rgba(122,155,191,0.7)'}}>Hourly investigation volume · past 24 hours</p>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider">
          <span className="flex items-center gap-1.5" style={{color:'#ff3355'}}><i className="w-2 h-2 rounded-full inline-block" style={{background:'#ff3355', boxShadow:'0 0 6px #ff3355'}} />High</span>
          <span className="flex items-center gap-1.5" style={{color:'#ffb020'}}><i className="w-2 h-2 rounded-full inline-block" style={{background:'#ffb020', boxShadow:'0 0 6px #ffb020'}} />Medium</span>
          <span className="flex items-center gap-1.5" style={{color:'#00e5a0'}}><i className="w-2 h-2 rounded-full inline-block" style={{background:'#00e5a0', boxShadow:'0 0 6px #00e5a0'}} />Low</span>
        </div>
      </div>

      {loading ? (
        <div className="h-56 flex items-center justify-center gap-2 text-sm" style={{color:'rgba(0,194,255,0.5)'}}>
          <RefreshCw className="w-4 h-4 animate-spin" />
          Scanning threat data...
        </div>
      ) : points.length === 0 ? (
        <div className="h-56 flex items-center justify-center text-sm" style={{color:'rgba(122,155,191,0.5)'}}>
          No data yet.
        </div>
      ) : (
        <div className="relative">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-56" onMouseLeave={() => setHoverIndex(null)}>
            <defs>
              <linearGradient id="highGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff3355" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#ff3355" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="mediumGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffb020" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#ffb020" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="lowGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00e5a0" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#00e5a0" stopOpacity="0" />
              </linearGradient>
              <filter id="glowRed"><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
              <filter id="glowAmber"><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
              <filter id="glowGreen"><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            </defs>

            {Array.from({ length: 5 }).map((_, index) => {
              const level = Math.round((maxY / 4) * index);
              const y = topPadding + ((4 - index) / 4) * innerHeight;
              return (
                <g key={`${level}-${index}`}>
                  <line x1={leftPadding} y1={y} x2={chartWidth - rightPadding} y2={y} stroke="rgba(0,194,255,0.07)" strokeWidth="1" />
                  <text x={8} y={y + 4} fill="rgba(122,155,191,0.5)" fontSize="10" fontWeight="600">{level}</text>
                </g>
              );
            })}

            {lowAreaPath && <path d={lowAreaPath} fill="url(#lowGradient)" />}
            {mediumAreaPath && <path d={mediumAreaPath} fill="url(#mediumGradient)" />}
            {highAreaPath && <path d={highAreaPath} fill="url(#highGradient)" />}

            {lowLinePath && (
              <path d={lowLinePath} fill="none" stroke="#00e5a0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                strokeDasharray="1200" strokeDashoffset="1200" filter="url(#glowGreen)">
                <animate attributeName="stroke-dashoffset" from="1200" to="0" dur="900ms" fill="freeze" />
              </path>
            )}
            {mediumLinePath && (
              <path d={mediumLinePath} fill="none" stroke="#ffb020" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                strokeDasharray="1200" strokeDashoffset="1200" filter="url(#glowAmber)">
                <animate attributeName="stroke-dashoffset" from="1200" to="0" dur="1s" fill="freeze" />
              </path>
            )}
            {highLinePath && (
              <path d={highLinePath} fill="none" stroke="#ff3355" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                strokeDasharray="1200" strokeDashoffset="1200" filter="url(#glowRed)">
                <animate attributeName="stroke-dashoffset" from="1200" to="0" dur="1100ms" fill="freeze" />
              </path>
            )}

            {points.map((point, index) => {
              const prevX = points[index - 1]?.x ?? leftPadding;
              const nextX = points[index + 1]?.x ?? (chartWidth - rightPadding);
              const bandStart = index === 0 ? leftPadding : (prevX + point.x) / 2;
              const bandEnd = index === points.length - 1 ? chartWidth - rightPadding : (point.x + nextX) / 2;
              return (
                <rect key={`hb-${index}`} x={bandStart} y={topPadding} width={Math.max(2, bandEnd - bandStart)}
                  height={innerHeight} fill="transparent" onMouseEnter={() => setHoverIndex(index)} />
              );
            })}

            {hoverIndex !== null && points[hoverIndex] && (
              <line x1={points[hoverIndex].x} y1={topPadding} x2={points[hoverIndex].x} y2={chartHeight - bottomPadding}
                stroke="rgba(0,194,255,0.3)" strokeWidth="1" strokeDasharray="3 4" />
            )}

            {points.map((point, index) => (
              <g key={`dot-${index}`}>
                <circle cx={point.x} cy={point.yHigh} r={hoverIndex === index ? 5 : 0} fill="#ff3355" stroke="#020c1b" strokeWidth="2" />
                <circle cx={point.x} cy={point.yMedium} r={hoverIndex === index ? 5 : 0} fill="#ffb020" stroke="#020c1b" strokeWidth="2" />
                <circle cx={point.x} cy={point.yLow} r={hoverIndex === index ? 5 : 0} fill="#00e5a0" stroke="#020c1b" strokeWidth="2" />
              </g>
            ))}

            {points.map((point, index) => (
              index % 3 === 0 || index === points.length - 1 ? (
                <text key={`xl-${index}`} x={point.x} y={chartHeight - 8} textAnchor="middle"
                  fill="rgba(122,155,191,0.5)" fontSize="10" fontWeight="600">
                  {formatTrendLabel(point.timestamp)}
                </text>
              ) : null
            ))}
          </svg>

          {hoverIndex !== null && points[hoverIndex] && (
            <div className="absolute right-3 top-3 rounded-xl p-3 text-xs animate-float-in"
              style={{background:'rgba(10,22,40,0.95)', border:'1px solid rgba(0,194,255,0.2)', boxShadow:'0 8px 32px rgba(0,0,0,0.5)', backdropFilter:'blur(12px)', minWidth:'180px'}}>
              <p className="font-black text-[11px] mb-1.5" style={{color:'#00c2ff'}}>{formatTrendTooltip(points[hoverIndex].timestamp)}</p>
              <div className="space-y-1">
                <p style={{color:'#ff3355'}}>● High — {points[hoverIndex].highCount}</p>
                <p style={{color:'#ffb020'}}>● Medium — {points[hoverIndex].mediumCount}</p>
                <p style={{color:'#00e5a0'}}>● Low — {points[hoverIndex].lowCount}</p>
              </div>
            </div>
          )}

          {!hasAnyData && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{color:'rgba(122,155,191,0.5)', border:'1px solid rgba(0,194,255,0.08)', background:'rgba(10,22,40,0.8)'}}>
                No investigations in the past 24 hours
              </span>
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

function ChevronRight({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
