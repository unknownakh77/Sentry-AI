'use client';

import Link from 'next/link';
import { Shield, Brain, Search, FolderOpen, ChevronRight, ArrowRight, Layers } from 'lucide-react';

// ── Reused from layout.tsx ────────────────────────────────────────────────────
function SentryLogo() {
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 128 128" className="h-9 w-9 shrink-0" aria-hidden="true">
        <defs>
          <linearGradient id="shieldBlue2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3ba2ff" />
            <stop offset="100%" stopColor="#1673de" />
          </linearGradient>
        </defs>
        <path d="M64 8L22 18v38c0 29 16 52 42 64 26-12 42-35 42-64V18L64 8z" fill="#040227" />
        <path d="M64 8v112c26-12 42-35 42-64V18L64 8z" fill="url(#shieldBlue2)" />
        <path d="M64 21v86" stroke="#06062a" strokeWidth="6" />
        <ellipse cx="64" cy="64" rx="30" ry="16" fill="none" stroke="#20a0ff" strokeWidth="5" />
        <circle cx="64" cy="64" r="8" fill="#0b3d9d" />
        <circle cx="64" cy="64" r="3.2" fill="#27b2ff" />
        <circle cx="70" cy="58" r="2.8" fill="#ecfbff" />
        <path d="M43 45c7-8 35-8 42 0" fill="none" stroke="#1f95ff" strokeWidth="4" />
        <path d="M43 83c7 8 35 8 42 0" fill="none" stroke="#1f95ff" strokeWidth="4" />
      </svg>
      <span className="text-white font-extrabold text-2xl tracking-tight">Sentry <span style={{ color: '#4488f5' }}>AI</span></span>
    </div>
  );
}

// ── Feature cards (real features only) ───────────────────────────────────────
const FEATURES = [
  {
    icon: Brain,
    title: 'AI Investigation Engine',
    desc: 'LangGraph-powered agent automatically plans, enriches, and scores every security event — from raw alert to risk verdict in seconds.',
    accent: '#4488f5',
  },
  {
    icon: Search,
    title: 'Threat Intelligence Aggregation',
    desc: 'Cross-references VirusTotal, IPInfo, and VPN detection APIs on every indicator. Geo, ASN, Tor, VPN, and malicious-hit data in one place.',
    accent: '#22b59c',
  },
  {
    icon: FolderOpen,
    title: 'SOC Case Management',
    desc: 'Every investigation becomes a structured case with full tool-call audit trail, analyst verdicts, evidence lists, and closure workflows.',
    accent: '#d4922a',
  },
  {
    icon: Shield,
    title: 'Automated Risk Triage',
    desc: 'Deterministic scoring engine maps behavioral signals, threat intel, and MITRE ATT&CK to a LOW / MEDIUM / HIGH classification with a recommended action.',
    accent: '#a78bfa',
  },
];

// ── Dashboard preview ─────────────────────────────────────────────────────────
const PREVIEW_ROWS = [
  { id: 'a3f1', type: 'Login', severity: 'HIGH',   severityColor: '#e05555', action: 'BLOCK SESSION',       status: 'executed', verdict: 'Confirmed',      verdictColor: '#22b59c', verdictBg: 'rgba(34,181,156,0.1)' },
  { id: 'b7c2', type: 'Phishing Email', severity: 'MEDIUM', severityColor: '#d4922a', action: 'REQUIRE MFA', status: 'executed', verdict: 'Pending Review', verdictColor: '#d4922a', verdictBg: 'rgba(212,146,42,0.1)' },
  { id: 'e9d4', type: 'Suspicious Link', severity: 'HIGH',  severityColor: '#e05555', action: 'BLOCK URL',   status: 'executed', verdict: 'Escalated',      verdictColor: '#818cf8', verdictBg: 'rgba(129,140,248,0.1)' },
  { id: 'f2a8', type: 'Transaction',    severity: 'LOW',    severityColor: '#22b59c', action: 'ALLOW',       status: 'executed', verdict: 'Confirmed',      verdictColor: '#22b59c', verdictBg: 'rgba(34,181,156,0.1)' },
  { id: 'c5b3', type: 'Login',          severity: 'MEDIUM', severityColor: '#d4922a', action: 'REQUIRE MFA', status: 'executed', verdict: 'Pending Review', verdictColor: '#d4922a', verdictBg: 'rgba(212,146,42,0.1)' },
];

export default function LandingPage() {
  return (
    <div
      style={{
        background: '#0f1928',
        minHeight: '100vh',
        // Dot grid in brand blue
        backgroundImage: `
          radial-gradient(900px 500px at 20% -5%, rgba(68,136,245,0.09), transparent 60%),
          linear-gradient(rgba(68,136,245,0.055) 1px, transparent 1px),
          linear-gradient(90deg, rgba(68,136,245,0.055) 1px, transparent 1px)
        `,
        backgroundSize: 'auto, 56px 56px, 56px 56px',
        backgroundPosition: 'center, center, center',
        color: 'var(--text-1)',
        fontFamily: 'Inter, SF Pro Display, Segoe UI, system-ui, sans-serif',
      }}
    >
      {/* ── Top Nav ──────────────────────────────────────────────────────────── */}
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 48px',
          height: 64,
          background: 'rgba(15,25,40,0.8)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(68,136,245,0.1)',
        }}
      >
        <SentryLogo />
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 20px',
            borderRadius: 10,
            background: 'linear-gradient(180deg, #4f93ff, #3a7ee8)',
            color: '#fff',
            fontWeight: 700,
            fontSize: 13,
            textDecoration: 'none',
            boxShadow: '0 8px 20px -10px rgba(68,136,245,0.7)',
            transition: 'filter 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.1)')}
          onMouseLeave={e => (e.currentTarget.style.filter = 'brightness(1)')}
        >
          Launch Dashboard <ChevronRight size={14} />
        </Link>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '120px 24px 80px',
          position: 'relative',
        }}
      >
        {/* Status chip */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '5px 14px',
            borderRadius: 999,
            background: 'rgba(68,136,245,0.1)',
            border: '1px solid rgba(68,136,245,0.25)',
            marginBottom: 40,
            fontSize: 11,
            fontWeight: 700,
            color: '#4488f5',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#4488f5',
              boxShadow: '0 0 6px #4488f5',
              display: 'inline-block',
              animation: 'pulse 2s ease-in-out infinite',
            }}
          />
          AI-POWERED SOC PLATFORM
        </div>

        {/* Headline */}
        <h1
          style={{
            margin: 0,
            lineHeight: 1.0,
            letterSpacing: '-0.04em',
            fontWeight: 900,
          }}
        >
          <span
            style={{
              display: 'block',
              fontSize: 'clamp(52px, 9vw, 120px)',
              color: 'var(--text-1)',
            }}
          >
            YOUR AI
          </span>
          <span
            style={{
              display: 'block',
              fontSize: 'clamp(42px, 7vw, 96px)',
              background: 'linear-gradient(135deg, #4f93ff 0%, #22b59c 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            SOC INVESTIGATION
          </span>
          <span
            style={{
              display: 'block',
              fontSize: 'clamp(52px, 9vw, 120px)',
              color: 'var(--text-1)',
            }}
          >
            AGENT
          </span>
        </h1>

        {/* Subtext */}
        <p
          style={{
            marginTop: 32,
            maxWidth: 560,
            fontSize: 18,
            lineHeight: 1.7,
            color: 'var(--text-2)',
            fontWeight: 400,
          }}
        >
          AI-powered threat triage, investigation workflows, and real-time threat intelligence for security teams.
        </p>

        {/* CTA buttons */}
        <div style={{ display: 'flex', gap: 14, marginTop: 44, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '14px 28px',
              borderRadius: 12,
              background: 'linear-gradient(180deg, #4f93ff, #3a7ee8)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 15,
              textDecoration: 'none',
              boxShadow: '0 12px 32px -12px rgba(68,136,245,0.65)',
              transition: 'filter 0.15s, transform 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.filter = 'brightness(1.08)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.filter = 'brightness(1)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Launch Dashboard <ArrowRight size={16} />
          </Link>
          <Link
            href="/investigations"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '14px 28px',
              borderRadius: 12,
              background: 'var(--surface-1)',
              border: '1px solid var(--border-soft)',
              color: 'var(--text-2)',
              fontWeight: 600,
              fontSize: 15,
              textDecoration: 'none',
              transition: 'background 0.15s, color 0.15s, transform 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--surface-2)';
              e.currentTarget.style.color = 'var(--text-1)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'var(--surface-1)';
              e.currentTarget.style.color = 'var(--text-2)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            View Platform
          </Link>
        </div>

        {/* Scroll hint */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
            opacity: 0.35,
          }}
        >
          <div style={{ width: 1, height: 40, background: 'linear-gradient(to bottom, transparent, #4488f5)' }} />
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', color: '#4488f5', textTransform: 'uppercase' }}>Scroll</span>
        </div>
      </section>

      {/* ── Core Platform ─────────────────────────────────────────────────────── */}
      <section style={{ padding: '96px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 14px',
              borderRadius: 999,
              background: 'rgba(68,136,245,0.08)',
              border: '1px solid rgba(68,136,245,0.2)',
              fontSize: 10,
              fontWeight: 800,
              color: '#4488f5',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: 20,
            }}
          >
            <Layers size={11} /> CORE PLATFORM
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: 'clamp(28px, 4vw, 48px)',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              color: 'var(--text-1)',
            }}
          >
            Built for real SOC workflows
          </h2>
          <p style={{ marginTop: 12, fontSize: 16, color: 'var(--text-2)', maxWidth: 480, margin: '12px auto 0' }}>
            Every feature maps to an actual investigation step — no vanity metrics.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 20,
          }}
        >
          {FEATURES.map((f) => (
            <div
              key={f.title}
              style={{
                background: 'var(--surface-1)',
                border: '1px solid var(--border-soft)',
                borderRadius: 20,
                padding: '28px 28px 32px',
                position: 'relative',
                overflow: 'hidden',
                transition: 'border-color 0.2s, transform 0.2s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = `${f.accent}55`;
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-soft)';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
              }}
            >
              {/* Top accent line */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: f.accent, opacity: 0.6 }} />
              {/* Icon */}
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: `${f.accent}18`,
                  border: `1px solid ${f.accent}30`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 20,
                }}
              >
                <f.icon size={20} color={f.accent} />
              </div>
              <h3 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-0.01em' }}>
                {f.title}
              </h3>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: 'var(--text-2)', fontWeight: 400 }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Product Preview ───────────────────────────────────────────────────── */}
      <section style={{ padding: '32px 24px 112px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <h2 style={{ margin: 0, fontSize: 'clamp(26px, 3.5vw, 44px)', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-1)' }}>
            The investigation surface
          </h2>
          <p style={{ marginTop: 12, fontSize: 16, color: 'var(--text-2)' }}>
            Every alert becomes a structured case. Every case gets a verdict.
          </p>
        </div>

        {/* Browser-frame mockup */}
        <div
          style={{
            borderRadius: 20,
            overflow: 'hidden',
            border: '1px solid var(--border-soft)',
            boxShadow: '0 40px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(68,136,245,0.08)',
            background: 'var(--surface-2)',
          }}
        >
          {/* Browser chrome */}
          <div
            style={{
              height: 44,
              background: '#0a1221',
              borderBottom: '1px solid var(--border-soft)',
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px',
              gap: 8,
            }}
          >
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#e05555', opacity: 0.7 }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#d4922a', opacity: 0.7 }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22b59c', opacity: 0.7 }} />
            <div
              style={{
                marginLeft: 16,
                flex: 1,
                maxWidth: 320,
                height: 24,
                borderRadius: 6,
                background: 'var(--surface-1)',
                border: '1px solid var(--border-soft)',
                display: 'flex',
                alignItems: 'center',
                paddingLeft: 10,
                fontSize: 11,
                color: 'var(--text-3)',
                fontFamily: 'monospace',
              }}
            >
              sentryai.internal/investigations
            </div>
          </div>

          {/* App chrome — mini sidebar + content */}
          <div style={{ display: 'flex', height: 440 }}>
            {/* Mini sidebar */}
            <div
              style={{
                width: 56,
                background: '#0a1221',
                borderRight: '1px solid var(--border-soft)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '16px 0',
                gap: 12,
              }}
            >
              {['#4488f5', '#415470', '#415470', '#415470'].map((c, i) => (
                <div
                  key={i}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: i === 0 ? 'rgba(68,136,245,0.2)' : 'transparent',
                    border: i === 0 ? '1px solid rgba(68,136,245,0.35)' : '1px solid transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div style={{ width: 16, height: 2, background: c, borderRadius: 2, boxShadow: i === 0 ? `0 0 6px ${c}` : 'none' }} />
                </div>
              ))}
            </div>

            {/* Main panel */}
            <div style={{ flex: 1, overflow: 'hidden', padding: '24px 28px' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text-1)', marginBottom: 4 }}>Active Investigations</div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 500 }}>Open SOC investigations requiring active analyst workflow</div>
                </div>
                <div
                  style={{
                    padding: '6px 14px',
                    borderRadius: 8,
                    background: 'var(--surface-1)',
                    border: '1px solid var(--border-soft)',
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--text-2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22b59c' }} />
                  Sync All Records
                </div>
              </div>

              {/* Table */}
              <div
                style={{
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: 14,
                  border: '1px solid var(--border-soft)',
                  overflow: 'hidden',
                }}
              >
                {/* Table header */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr 1.5fr 1fr',
                    padding: '10px 20px',
                    background: 'rgba(0,0,0,0.2)',
                    borderBottom: '1px solid var(--border-soft)',
                    fontSize: 10,
                    fontWeight: 800,
                    color: 'var(--text-3)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  <span>Investigation &amp; Subject</span>
                  <span>Triage Time</span>
                  <span>Risk Context</span>
                  <span>Response</span>
                  <span>Verdict</span>
                </div>

                {/* Table rows */}
                {PREVIEW_ROWS.map((row, i) => (
                  <div
                    key={row.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 1fr 1fr 1.5fr 1fr',
                      padding: '12px 20px',
                      borderBottom: i < PREVIEW_ROWS.length - 1 ? '1px solid var(--border-soft)' : 'none',
                      alignItems: 'center',
                      fontSize: 12,
                      background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                    }}
                  >
                    {/* ID + type */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 8,
                          background: 'var(--surface-1)',
                          border: '1px solid var(--border-soft)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <div style={{ width: 12, height: 12, borderRadius: 3, background: row.severityColor, opacity: 0.7 }} />
                      </div>
                      <div>
                        <div style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: 'var(--text-1)' }}>CASE-{row.id.toUpperCase()}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{row.type} Event</div>
                      </div>
                    </div>
                    {/* Time */}
                    <div style={{ color: 'var(--text-2)', fontWeight: 500 }}>{2 + i}m ago</div>
                    {/* Severity */}
                    <div>
                      <span
                        style={{
                          padding: '2px 10px',
                          borderRadius: 5,
                          fontSize: 10,
                          fontWeight: 800,
                          letterSpacing: '0.06em',
                          color: row.severityColor,
                          background: `${row.severityColor}18`,
                          border: `1px solid ${row.severityColor}45`,
                        }}
                      >
                        {row.severity}
                      </span>
                    </div>
                    {/* Action */}
                    <div>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 5,
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '0.06em',
                          color: '#4488f5',
                          background: 'rgba(68,136,245,0.1)',
                          border: '1px solid rgba(68,136,245,0.25)',
                        }}
                      >
                        {row.action}
                      </span>
                    </div>
                    {/* Verdict */}
                    <div>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 5,
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '0.06em',
                          color: row.verdictColor,
                          background: row.verdictBg,
                          border: `1px solid ${row.verdictColor}45`,
                        }}
                      >
                        {row.verdict}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: '1px solid var(--border-soft)',
          padding: '32px 48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 20,
        }}
      >
        <SentryLogo />
        <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
          {[
            { label: 'Docs', href: '#' },
            { label: 'GitHub', href: 'https://github.com/a1desai/Sentry-AI' },
            { label: 'About', href: '#' },
          ].map((l) => (
            <a
              key={l.label}
              href={l.href}
              target={l.href.startsWith('http') ? '_blank' : undefined}
              rel={l.href.startsWith('http') ? 'noopener noreferrer' : undefined}
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-2)',
                textDecoration: 'none',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text-1)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text-2)')}
            >
              {l.label}
            </a>
          ))}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>
          © 2025 Sentry AI — Enterprise SOC Platform
        </div>
      </footer>

      {/* ── Keyframes injected inline ─────────────────────────────────────────── */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
