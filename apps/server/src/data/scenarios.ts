import { NormalizedEvent } from '@sentry/shared';
import { v4 as uuidv4 } from 'uuid';

export const scenarios: Record<string, Partial<NormalizedEvent>> = {
  safe_login: {
    eventType: 'login',
    user: 'alice@corp.com',
    sourceIp: '192.168.1.50',
    timestamp: new Date().toISOString(),
    artifacts: {},
    context: {
      mfaUsed: true,
      privilegedUser: false,
      allowlistMatch: true,
      sessionTag: 'office-wifi',
    },
  },
  malicious_login: {
    eventType: 'login',
    user: 'bob.banking@corp.com',
    sourceIp: '185.220.101.1', // Known Tor/VPN IP
    timestamp: new Date().toISOString(),
    artifacts: {},
    context: {
      mfaUsed: false,
      privilegedUser: true,
      allowlistMatch: false,
      sessionTag: 'unknown-device',
    },
  },
  phishing_email: {
    eventType: 'phishing_email',
    user: 'carol@corp.com',
    sourceIp: '203.0.113.45',
    timestamp: new Date().toISOString(),
    artifacts: {
      sender: 'admin@c0rp-support.com', // Typosquat
      subject: 'URGENT: Verify your payment details immediately',
      url: 'http://c0rp-support.com/login',
    },
    context: {
      mfaUsed: false,
      privilegedUser: false,
      allowlistMatch: false,
    },
  },
  url_click: {
    eventType: 'url_click',
    user: 'dave@corp.com',
    sourceIp: '198.51.100.22',
    timestamp: new Date().toISOString(),
    artifacts: {
      url: 'http://bit.ly/3x8f9Aa', // Resolves to malicious
      domain: 'bit.ly',
    },
    context: {
      mfaUsed: true,
      privilegedUser: false,
      allowlistMatch: false,
    },
  },
};

export const getReplayEvent = (scenarioName: string): NormalizedEvent => {
  const base = scenarios[scenarioName];
  if (!base) {
    throw new Error(`Scenario ${scenarioName} not found`);
  }

  return {
    eventId: uuidv4(),
    eventType: base.eventType as any,
    user: base.user!,
    sourceIp: base.sourceIp!,
    timestamp: new Date().toISOString(),
    artifacts: base.artifacts || {},
    context: {
      mfaUsed: base.context?.mfaUsed ?? false,
      privilegedUser: base.context?.privilegedUser ?? false,
      allowlistMatch: base.context?.allowlistMatch ?? false,
      sessionTag: base.context?.sessionTag ?? null,
    },
  };
};
