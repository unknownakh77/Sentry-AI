'use client';

import Link from 'next/link';
import { Brain, Zap, Globe, Swords, ArrowLeft, ArrowRight } from 'lucide-react';

// ── Logo ──────────────────────────────────────────────────────────────────────
function SentryLogo() {
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 128 128" className="h-9 w-9 shrink-0" aria-hidden="true">
        <defs>
          <linearGradient id="shieldBlue3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3ba2ff" />
            <stop offset="100%" stopColor="#1673de" />
          </linearGradient>
        </defs>
        <path d="M64 8L22 18v38c0 29 16 52 42 64 26-12 42-35 42-64V18L64 8z" fill="#040227" />
        <path d="M64 8v112c26-12 42-35 42-64V18L64 8z" fill="url(#shieldBlue3)" />
        <path d="M64 21v86" stroke="#06062a" strokeWidth="6" />
        <ellipse cx="64" cy="64" rx="30" ry="16" fill="none" stroke="#20a0ff" strokeWidth="5" />
        <circle cx="64" cy="64" r="8" fill="#0b3d9d" />
        <circle cx="64" cy="64" r="3.2" fill="#27b2ff" />
        <circle cx="70" cy="58" r="2.8" fill="#ecfbff" />
        <path d="M43 45c7-8 35-8 42 0" fill="none" stroke="#1f95ff" strokeWidth="4" />
        <path d="M43 83c7 8 35 8 42 0" fill="none" stroke="#1f95ff" strokeWidth="4" />
      </svg>
      <span className="text-white font-extrabold text-2xl tracking-tight">
        Sentry <span style={{ color: '#4488f5' }}>AI</span>
      </span>
    </div>
  );
}

// ── Cards ─────────────────────────────────────────────────────────────────────
const CARDS = [
  {
    icon: Brain,
    accent: '#4488f5',
    title: 'Self-Healing AI Agent',
    tag: 'Human-in-the-Loop',
    desc: 'The agent doesn\'t just act — it learns from analyst corrections. When an analyst overrides a decision, the agent adapts its reasoning and improves its future triage logic.',
    bullets: [
      'Analysts can confirm, override, or escalate any AI decision',
      'Agent re-evaluates its reasoning based on analyst feedback',
      'Full audit trail of every override and rationale',
    ],
  },
  {
    icon: Zap,
    accent: '#22b59c',
    title: 'Automated Investigations',
    tag: 'AI-Powered Triage',
    desc: 'Every incoming security event is automatically enriched, scored, and resolved — from raw alert ingestion to a structured risk verdict — without manual analyst effort.',
    bullets: [
      'Ingests login, phishing, suspicious link, and transaction events',
      'Enriches with threat intel APIs and behavioral signal analysis',
      'Assigns LOW / MEDIUM / HIGH risk and recommends a response action',
    ],
  },
  {
    icon: Globe,
    accent: '#d4922a',
    title: 'Threat Intelligence Lookup',
    tag: 'IOC Checks',
    desc: 'Analysts can investigate any indicator of compromise directly — cross-referencing multiple threat intelligence providers in a single query.',
    bullets: [
      'IP reputation via VirusTotal and IPInfo with geo & ASN data',
      'URL and file hash scanning for malicious detections',
      'VPN, proxy, and Tor exit node detection',
    ],
  },
  {
    icon: Swords,
    accent: '#a78bfa',
    title: 'Attack Simulator',
    tag: 'Scenario Testing',
    desc: 'Generate realistic attack scenarios on demand to validate the investigation pipeline, tune severity thresholds, and train analysts — without waiting for real incidents.',
    bullets: [
      'Simulate login attacks, phishing, suspicious links, and fraud',
      'Scenarios produce all three severity levels (LOW / MEDIUM / HIGH)',
      'Randomized signals — IPs, geos, behavioral patterns — per run',
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
export default function CoreFunctionalitiesPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0f1928',
        backgroundImage: `
          radial-gradient(900px 500px at 20% -5%, rgba(68,136,245,0.09), transparent 60%),
          linear-gradient(rgba(68,136,245,0.055) 1px, transparent 1px),
          linear-gradient(90deg, rgba(68,136,245,0.055) 1px, transparent 1px)
        `,
        backgroundSize: 'auto, 56px 56px, 56px 56px',
        color: 'var(--text-1)',
        fontFamily: 'Inter, SF Pro Display, Segoe UI, system-ui, sans-serif',
      }}
    >
      {/* ── Nav ────────────────────────────────────────────────────────────── */}
      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 48px',
          height: 64,
          background: 'rgba(15,25,40,0.85)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(68,136,245,0.1)',
        }}
      >
        <Link href="/landing" style={{ textDecoration: 'none' }}>
          <SentryLogo />
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link
            href="/landing"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '7px 16px',
              borderRadius: 9,
              background: 'var(--surface-1)',
              border: '1px solid var(--border-soft)',
              color: 'var(--text-2)',
              fontWeight: 600,
              fontSize: 13,
              textDecoration: 'none',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--surface-2)';
              e.currentTarget.style.color = 'var(--text-1)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'var(--surface-1)';
              e.currentTarget.style.color = 'var(--text-2)';
            }}
          >
            <ArrowLeft size={13} /> Back
          </Link>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '7px 18px',
              borderRadius: 9,
              background: 'linear-gradient(180deg, #4f93ff, #3a7ee8)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 13,
              textDecoration: 'none',
              boxShadow: '0 6px 18px -8px rgba(68,136,245,0.75)',
              letterSpacing: '-0.01em',
            }}
            onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.1)')}
            onMouseLeave={e => (e.currentTarget.style.filter = 'brightness(1)')}
          >
            Launch Dashboard <ArrowRight size={13} />
          </Link>
        </div>
      </nav>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          textAlign: 'center',
          padding: '72px 24px 56px',
        }}
      >
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
            marginBottom: 24,
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
          PLATFORM CAPABILITIES
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: 'clamp(32px, 5vw, 56px)',
            fontWeight: 900,
            letterSpacing: '-0.04em',
            lineHeight: 1.1,
            color: 'var(--text-1)',
          }}
        >
          Core Functionalities
        </h1>
        <p
          style={{
            marginTop: 16,
            fontSize: 16,
            lineHeight: 1.7,
            color: 'var(--text-2)',
            maxWidth: 520,
            margin: '16px auto 0',
            fontWeight: 400,
          }}
        >
          Four capabilities that power the Sentry AI investigation pipeline — from ingestion to resolution.
        </p>
      </div>

      {/* ── Cards grid ─────────────────────────────────────────────────────── */}
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '0 24px 96px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))',
          gap: 20,
        }}
      >
        {CARDS.map((card) => (
          <div
            key={card.title}
            style={{
              background: 'var(--surface-1)',
              border: '1px solid var(--border-soft)',
              borderRadius: 20,
              padding: '32px 32px 36px',
              position: 'relative',
              overflow: 'hidden',
              transition: 'border-color 0.2s, transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.borderColor = `${card.accent}55`;
              el.style.transform = 'translateY(-3px)';
              el.style.boxShadow = `0 20px 48px rgba(0,0,0,0.35), 0 0 0 1px ${card.accent}22`;
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.borderColor = 'var(--border-soft)';
              el.style.transform = 'translateY(0)';
              el.style.boxShadow = 'none';
            }}
          >
            {/* Top accent line */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                background: `linear-gradient(90deg, ${card.accent}, ${card.accent}44)`,
              }}
            />

            {/* Icon + tag row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: `${card.accent}16`,
                  border: `1px solid ${card.accent}35`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <card.icon size={24} color={card.accent} />
              </div>
              <div>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '2px 10px',
                    borderRadius: 999,
                    background: `${card.accent}12`,
                    border: `1px solid ${card.accent}30`,
                    fontSize: 10,
                    fontWeight: 700,
                    color: card.accent,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    marginBottom: 6,
                  }}
                >
                  {card.tag}
                </div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 19,
                    fontWeight: 800,
                    color: 'var(--text-1)',
                    letterSpacing: '-0.03em',
                    lineHeight: 1.2,
                  }}
                >
                  {card.title}
                </h2>
              </div>
            </div>

            {/* Description */}
            <p
              style={{
                margin: '0 0 20px',
                fontSize: 14,
                lineHeight: 1.7,
                color: 'var(--text-2)',
                fontWeight: 400,
              }}
            >
              {card.desc}
            </p>

            {/* Divider */}
            <div style={{ height: 1, background: 'var(--border-soft)', marginBottom: 20 }} />

            {/* Bullets */}
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {card.bullets.map((b) => (
                <li
                  key={b}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    fontSize: 13,
                    color: 'var(--text-2)',
                    lineHeight: 1.55,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: card.accent,
                      flexShrink: 0,
                      marginTop: 5,
                      boxShadow: `0 0 5px ${card.accent}80`,
                    }}
                  />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* ── Footer CTA ─────────────────────────────────────────────────────── */}
      <div
        style={{
          textAlign: 'center',
          padding: '0 24px 80px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
        }}
      >
        <p style={{ margin: 0, fontSize: 15, color: 'var(--text-2)' }}>
          Ready to see it in action?
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '13px 28px',
              borderRadius: 11,
              background: 'linear-gradient(180deg, #4f93ff, #3a7ee8)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 14,
              textDecoration: 'none',
              boxShadow: '0 10px 28px -10px rgba(68,136,245,0.7)',
              letterSpacing: '-0.01em',
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
            Launch Dashboard <ArrowRight size={15} />
          </Link>
          <Link
            href="/landing"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '13px 24px',
              borderRadius: 11,
              background: 'var(--surface-1)',
              border: '1px solid var(--border-soft)',
              color: 'var(--text-2)',
              fontWeight: 600,
              fontSize: 14,
              textDecoration: 'none',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--surface-2)';
              e.currentTarget.style.color = 'var(--text-1)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'var(--surface-1)';
              e.currentTarget.style.color = 'var(--text-2)';
            }}
          >
            <ArrowLeft size={14} /> Back to Home
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
      `}</style>
    </div>
  );
}
