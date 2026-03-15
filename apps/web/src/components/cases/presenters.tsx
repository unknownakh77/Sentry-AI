import { formatDistanceToNow } from 'date-fns';
import { CaseRecord } from '@sentry/shared';
import { FileCheck, Fingerprint, Link as LinkIcon, Mail, ShieldAlert } from 'lucide-react';

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
    default:
      return <ShieldAlert className="w-5 h-5 text-slate-600" />;
  }
}

export function RiskBadge({
  classification,
  tone = 'default',
}: {
  classification: CaseRecord['classification'];
  tone?: 'default' | 'muted';
}) {
  const styles = {
    HIGH: tone === 'muted'
      ? 'bg-red-100/50 text-red-700 border-red-200'
      : 'bg-red-100 text-red-800 border-red-200',
    MEDIUM: tone === 'muted'
      ? 'bg-amber-100/50 text-amber-700 border-amber-200'
      : 'bg-amber-100 text-amber-800 border-amber-200',
    LOW: tone === 'muted'
      ? 'bg-green-100/50 text-green-700 border-green-200'
      : 'bg-green-100 text-green-800 border-green-200',
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${styles[classification]}`}>
      {classification}
    </span>
  );
}

export function formatActionLabel(action: string) {
  return action.replace(/_/g, ' ');
}

export function formatEventTypeLabel(eventType: string) {
  return eventType.replace(/_/g, ' ');
}

export function formatCaseAge(timestamp: string) {
  return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
}
