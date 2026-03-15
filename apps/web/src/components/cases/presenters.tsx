import { formatDistanceToNow } from 'date-fns';
import { CaseRecord } from '@sentry/shared';
import { CreditCard, FileCheck, Fingerprint, Link as LinkIcon, Mail, ShieldAlert } from 'lucide-react';

export function EventIcon({ type }: { type: CaseRecord['eventType'] }) {
  switch (type) {
    case 'login':
      return <Fingerprint className="w-5 h-5 text-blue-600" />;
    case 'phishing_email':
      return <Mail className="w-5 h-5 text-fuchsia-600" />;
    case 'url_click':
      return <LinkIcon className="w-5 h-5 text-amber-600" />;
    case 'file_hash':
      return <FileCheck className="w-5 h-5 text-slate-600" />;
    case 'transaction':
      return <CreditCard className="w-5 h-5 text-emerald-500" />;
    default:
      return <ShieldAlert className="w-5 h-5 text-slate-600" />;
  }
}

const RISK_PALETTE = {
  HIGH:   { color: '#e05555', bg: 'rgba(224,85,85,0.12)',   border: 'rgba(224,85,85,0.45)'   },
  MEDIUM: { color: '#d4922a', bg: 'rgba(212,146,42,0.12)',  border: 'rgba(212,146,42,0.45)'  },
  LOW:    { color: '#22b59c', bg: 'rgba(34,181,156,0.12)',  border: 'rgba(34,181,156,0.45)'  },
};

export function RiskBadge({
  classification,
  tone = 'default',
}: {
  classification: CaseRecord['classification'];
  tone?: 'default' | 'muted';
}) {
  const p = RISK_PALETTE[classification];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: p.color,
        background: p.bg,
        border: `1px solid ${p.border}`,
        borderRadius: 6,
        padding: '2px 10px',
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: '0.08em',
        lineHeight: 1,
        opacity: tone === 'muted' ? 0.85 : 1,
      }}
    >
      {classification}
    </span>
  );
}

export function formatActionLabel(action: string) {
  return action.replace(/_/g, ' ');
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  login:       'Login',
  phishing_email: 'Phishing Email',
  url_click:   'Suspicious Link',
  file_hash:   'File Hash',
  transaction: 'Transaction',
};

export function formatEventTypeLabel(eventType: string) {
  return EVENT_TYPE_LABELS[eventType] ?? eventType.replace(/_/g, ' ');
}

export function formatCaseAge(timestamp: string) {
  return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
}
