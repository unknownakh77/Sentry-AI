'use client';

import Link from 'next/link';
import { ChevronRight, ArrowRight } from 'lucide-react';

// ── Logo ──────────────────────────────────────────────────────────────────────
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
      <span className="text-white font-extrabold text-2xl tracking-tight">
        Sentry <span style={{ color: '#4488f5' }}>AI</span>
      </span>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div
      style={{
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        background: '#0f1928',
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
      {/* ── Nav ────────────────────────────────────────────────────────────── */}
      <nav
        style={{
          flexShrink: 0,
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
          }}
          onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.1)')}
          onMouseLeave={e => (e.currentTarget.style.filter = 'brightness(1)')}
        >
          Launch Dashboard <ChevronRight size={14} />
        </Link>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '0 24px',
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
          <span style={{ display: 'block', fontSize: 'clamp(52px, 9vw, 120px)', color: 'var(--text-1)' }}>
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
          <span style={{ display: 'block', fontSize: 'clamp(52px, 9vw, 120px)', color: 'var(--text-1)' }}>
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
            href="/core-functionalities"
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
            Core Functionalities
          </Link>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer
        style={{
          flexShrink: 0,
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderTop: '1px solid rgba(68,136,245,0.08)',
          fontSize: 12,
          color: 'var(--text-3)',
          fontWeight: 500,
        }}
      >
        © 2025 Sentry AI — Enterprise SOC Platform
      </footer>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
