import { v4 as uuidv4 } from 'uuid';
import { NormalizedEvent } from '@sentry/shared';
import db from '../db';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

type Tier = 'LOW' | 'MEDIUM' | 'HIGH';

/** Strict uniform 33/33/33 distribution */
function pickTier(): Tier {
  const r = Math.random();
  if (r < 0.333) return 'LOW';
  if (r < 0.666) return 'MEDIUM';
  return 'HIGH';
}

/**
 * 2–4 AM UTC timestamp — guarantees off_hours_login (+10) fires in behaviorNode
 * once login history has been seeded (history.length > 0 is required).
 */
function offHoursTimestamp(): string {
  const d = new Date();
  d.setUTCHours(randInt(2, 4));
  d.setUTCMinutes(randInt(0, 59));
  d.setUTCSeconds(randInt(0, 59));
  return d.toISOString();
}

/**
 * Pre-seeds login_history rows for a user so that behaviorNode can compute
 * off_hours_login, new_login_location, repeated_login_failures, and
 * impossible_travel — all of which are skipped when history.length === 0.
 *
 * This is the root cause of LOW domination on a fresh DB: without prior
 * history rows, every behavioral signal stays false and score stays at 0.
 *
 * @param user     User email
 * @param geo      Last-known safe geo string (e.g. "New York, New York, US")
 * @param numFailed  Number of failed-attempt rows (≥3 triggers repeated_login_failures +15)
 */
const _seedStmt = db.prepare(
  'INSERT OR IGNORE INTO login_history (user, sourceIp, geo, timestamp, result) VALUES (?, ?, ?, ?, ?)'
);
function seedLoginHistory(user: string, geo: string, numFailed = 0) {
  // One successful baseline login 3 hours ago from a safe corporate IP
  const baseTime = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
  _seedStmt.run(user, '10.0.0.12', geo, baseTime, 'success');

  // Failed attempts spaced 90 s apart going backwards in time
  for (let i = 0; i < numFailed; i++) {
    const t = new Date(Date.now() - (i + 1) * 90 * 1000).toISOString();
    _seedStmt.run(user, `198.51.100.${randInt(1, 254)}`, geo, t, 'failed');
  }
}

// ─── IP / Domain pools ────────────────────────────────────────────────────────

const CORP_IPS = ['192.168.1.50', '10.0.0.12', '172.16.25.101', '10.10.1.88'];

// Commercial VPN provider IPs — vpnapi.io detects these → vpn_detected (+20)
const VPN_IPS  = ['104.28.15.200', '162.247.74.201', '185.159.160.88', '45.159.204.30'];

// Well-known Tor exit nodes — VirusTotal flags as malicious → ip_malicious (+40)
// vpnapi.io also identifies as Tor → vpn_detected (+20)
const TOR_IPS  = ['185.220.101.10', '185.220.102.8', '199.249.230.69', '171.25.193.25'];

// IPs that IPInfo geolocates to Russia or China → triggers impossible_travel (+30)
// when combined with a seeded domestic-US login history
// 77.88.55.66 = Yandex Moscow (RU), 218.92.0.101 = China Telecom (CN)
const RU_CN_IPS = ['77.88.55.66', '218.92.0.101', '91.92.136.1', '103.255.61.44'];
const FIXTURE_MAL_IPS = ['185.220.101.1', '203.0.113.45'];

const BAD_IPS   = ['45.227.253.100', '103.14.26.190', '91.108.4.1', '5.188.86.192'];

const PHISH_DOMAINS     = ['c0rp-support.com', 'security-verify.net', 'account-update.org', 'login-portal.info', 'corp-helpdesk.biz'];
const MALICIOUS_DOMAINS = ['malware-cdn.ru', 'phish-kit.xyz', 'track-redirect.io', 'evil-c2.top', 'dropper-host.net'];
const TYPOSQUAT_DOMAINS = ['micosoft.com', 'g00gle.net', 'paypa1.com', 'amaz0n-secure.com', 'linkedln.com'];
const SHORTENER_URLS    = ['https://bit.ly/3xR9qZ2', 'https://t.co/aBcDeF123', 'https://tinyurl.com/y7k2xpqm'];
const VT_FLAGGED_DOMAINS = ['c0rp-support.com', 'bit.ly'];

const USERS = [
  'bob.banking@corp.com',
  'alice.assets@corp.com',
  'charlie.crypto@corp.com',
  'diana.deposits@corp.com',
  'eve.excess@corp.com',
  'frank.finance@corp.com',
  'grace.grants@corp.com',
];

// ─── Scenario names ───────────────────────────────────────────────────────────

export const SCENARIO_NAMES = [
  'login',
  'phishing_email',
  'suspicious_link',
  'fraudulent_transaction',
] as const;

export type ScenarioName = typeof SCENARIO_NAMES[number];

// ─── Login ────────────────────────────────────────────────────────────────────
// Scoring paths (behaviorNode only fires when history.length > 0):
//
//   LOW    → no seeding, clean signals → score ≈ 0 → LOW
//   MEDIUM → seed 1 history row + VPN IP + off-hours timestamp
//             → vpn_detected(+20) + new_location(+10) + off_hours(+10) = 40 → MEDIUM
//   HIGH   → seed 1 success + 3 failures + Tor IP + off-hours
//             Tor: ip_malicious(+40) + vpn_detected(+20) + new_location(+10) + repeated_failures(+15) + off_hours(+10) = 95 → HIGH
//             RU/CN: impossible_travel(+30) + new_location(+10) + repeated_failures(+15) + off_hours(+10) = 65 + vpn/ip if detected → HIGH

function generateLogin(user: string, eventId: string, tier: Tier): NormalizedEvent {
  if (tier === 'LOW') {
    return pick<() => NormalizedEvent>([
      () => ({
        eventId, eventType: 'login', user,
        sourceIp: pick(CORP_IPS),
        timestamp: new Date().toISOString(),
        artifacts: {
          device: pick(['Windows 11 — Chrome 121', 'macOS Sonoma — Safari 17']),
          alertDescription: 'Baseline office login from allowlisted IP with successful MFA.',
        },
        context: { mfaUsed: true, privilegedUser: false, allowlistMatch: true, sessionTag: 'office_wifi', authenticationMethod: 'Password + Push MFA' },
      }),
      () => ({
        eventId, eventType: 'login', user,
        sourceIp: pick(CORP_IPS),
        timestamp: new Date().toISOString(),
        artifacts: {
          device: 'Managed MacBook Pro — Chrome',
          alertDescription: 'Known user and known device. Low-confidence anomaly only.',
          additionalLogs: 'Post-alert: matches approved red-team simulation window. Verify before escalating.',
        },
        context: { mfaUsed: true, privilegedUser: false, allowlistMatch: true, sessionTag: 'corp_vpn_managed_device', authenticationMethod: 'Password + WebAuthn' },
      }),
    ])();
  }

  if (tier === 'MEDIUM') {
    seedLoginHistory(user, 'New York, New York, US', 0);
    return pick<() => NormalizedEvent>([
      () => ({
        eventId, eventType: 'login', user,
        sourceIp: pick(VPN_IPS),
        timestamp: offHoursTimestamp(),
        artifacts: {
          device: pick(['Unknown Android — Chrome Mobile', 'Linux — Firefox 122']),
          alertDescription: 'Login via commercial VPN at off-hours with no MFA challenge. Session fingerprint changed from prior office session.',
          additionalLogs: 'Previous successful office login 3h ago. Atypical ASN and endpoint posture mismatch.',
        },
        context: { mfaUsed: false, privilegedUser: false, allowlistMatch: false, sessionTag: 'vpn_remote_offhours', authenticationMethod: 'Password only' },
      }),
      () => ({
        eventId, eventType: 'login', user,
        sourceIp: pick(VPN_IPS),
        timestamp: offHoursTimestamp(),
        artifacts: {
          device: 'Corporate Laptop — Endpoint Compliance Drift',
          alertDescription: 'Conditional access policy violation: stale endpoint posture and external network. Possible false positive due to MDM sync delay.',
          additionalLogs: 'EDR heartbeat delayed 4h. Posture drift can trigger escalation incorrectly — analyst should verify.',
        },
        context: { mfaUsed: true, privilegedUser: false, allowlistMatch: false, sessionTag: 'policy_drift', authenticationMethod: 'Password + Push MFA' },
      }),
      () => ({
        eventId, eventType: 'login', user,
        sourceIp: pick(VPN_IPS),
        timestamp: offHoursTimestamp(),
        artifacts: {
          device: 'iPhone — Mobile Safari',
          alertDescription: 'First-seen geography for user, login via VPN at off-hours. Travel not impossible but inconsistent with prior quarter activity.',
          additionalLogs: 'User filed WFH notice for this week — verify travel before blocking.',
        },
        context: { mfaUsed: false, privilegedUser: false, allowlistMatch: false, sessionTag: 'new_geo_unfamiliar_asn', authenticationMethod: 'Password only' },
      }),
    ])();
  }

  // HIGH: seed history (ensures behavioral signals fire) + failure burst
  seedLoginHistory(user, 'New York, New York, US', 3);
  return pick<() => NormalizedEvent>([
    // Tor IP → ip_malicious(+40) + vpn_detected(+20) + behavioral signals
    () => ({
      eventId, eventType: 'login', user,
      sourceIp: pick([...FIXTURE_MAL_IPS, ...TOR_IPS]),
      timestamp: offHoursTimestamp(),
      artifacts: {
        device: 'Tor Browser 13 — Linux',
        alertDescription: 'Privileged account login via confirmed Tor exit node after 3 failed attempts. Credential stuffing signature detected.',
        additionalLogs: 'Burst of 401s from rotating Tor IPs in prior 6 minutes before this success.',
      },
      context: { mfaUsed: false, privilegedUser: true, allowlistMatch: false, sessionTag: 'tor_exit_brute_force', authenticationMethod: 'Password only' },
    }),
    // RU/CN IP → impossible_travel(+30) fires without needing API to flag IP
    () => {
      const ip = pick(FIXTURE_MAL_IPS);
      const country = ip === '185.220.101.1' ? 'RU' : 'Unknown';
      return {
        eventId, eventType: 'login', user,
        sourceIp: ip,
        timestamp: offHoursTimestamp(),
        artifacts: {
          device: 'Unknown Device — Unrecognized User-Agent',
          alertDescription: `Impossible travel: active session from ${country} 9 minutes after domestic office login. Privileged account targeted.`,
          additionalLogs: `Velocity check failed. 3 prior failed attempts from rotating IPs. ${country} is high-risk jurisdiction.`,
        },
        context: { mfaUsed: false, privilegedUser: true, allowlistMatch: false, sessionTag: `impossible_travel_${country.toLowerCase()}`, authenticationMethod: 'Password only' },
      };
    },
    // Bad IP + session token replay
    () => ({
      eventId, eventType: 'login', user,
      sourceIp: pick(FIXTURE_MAL_IPS),
      timestamp: offHoursTimestamp(),
      artifacts: {
        device: 'Headless Browser Automation',
        alertDescription: 'Session token replay from known malicious infrastructure. Token reused across multiple ASNs within 60 seconds.',
        additionalLogs: '3 prior auth failures. Device fingerprint entropy abnormal. Concurrent session from office IP still active.',
      },
      context: { mfaUsed: false, privilegedUser: true, allowlistMatch: false, sessionTag: 'token_replay_multi_asn', authenticationMethod: 'Session Replay' },
    }),
  ])();
}

// ─── Phishing Email ───────────────────────────────────────────────────────────
// spf_pass is always set to false by authNode (+15, guaranteed for phishing).
// domain_malicious adds +40 if VT flags the domain.
// Max achievable: 15 + 40 = 55 → MEDIUM (pipeline cannot score phishing to HIGH).

function generatePhishing(user: string, eventId: string, tier: Tier): NormalizedEvent {
  if (tier === 'LOW') {
    return pick<() => NormalizedEvent>([
      () => {
        const domain = pick(PHISH_DOMAINS);
        return {
          eventId, eventType: 'phishing_email', user,
          sourceIp: `203.0.113.${randInt(1, 254)}`,
          timestamp: new Date().toISOString(),
          artifacts: { sender: `noreply@${domain}`, subject: 'Package delivery notification', domain, alertDescription: 'Generic bulk spam blocked at perimeter. No credential-harvesting indicators.' },
          context: { mfaUsed: false, privilegedUser: false, allowlistMatch: false, authenticationMethod: 'Email' },
        };
      },
      () => {
        const domain = pick(PHISH_DOMAINS);
        return {
          eventId, eventType: 'phishing_email', user,
          sourceIp: `203.0.113.${randInt(1, 254)}`,
          timestamp: new Date().toISOString(),
          artifacts: {
            sender: `alerts@${domain}`, subject: 'Security awareness campaign — simulated phishing test', domain,
            alertDescription: 'Suspected spam but DMARC failed only due to forwarding chain. Likely internal awareness simulation false positive.',
            additionalLogs: 'Banner and templates match prior internal simulations.',
          },
          context: { mfaUsed: false, privilegedUser: false, allowlistMatch: true, authenticationMethod: 'Email' },
        };
      },
    ])();
  }

  if (tier === 'MEDIUM') {
    return pick<() => NormalizedEvent>([
      () => {
        const domain = pick(PHISH_DOMAINS);
        return {
          eventId, eventType: 'phishing_email', user,
          sourceIp: `198.51.100.${randInt(1, 254)}`,
          timestamp: new Date().toISOString(),
          artifacts: {
            sender: `it-support@${domain}`, subject: 'URGENT: Corporate password expires in 2 hours', domain,
            url: `https://${domain}/corp-reset?uid=${uuidv4().substring(0, 8)}`,
            alertDescription: 'Spoofed IT sender with credential-harvesting link. SPF/DKIM failed. Sender IP on 3 blocklists.',
            additionalLogs: 'Link destination matches known credential-phishing kit pattern.',
          },
          context: { mfaUsed: false, privilegedUser: false, allowlistMatch: false, authenticationMethod: 'Email Link' },
        };
      },
      () => {
        const domain = pick(PHISH_DOMAINS);
        return {
          eventId, eventType: 'phishing_email', user,
          sourceIp: pick(BAD_IPS),
          timestamp: new Date().toISOString(),
          artifacts: {
            sender: `hr-benefits@${domain}`, subject: 'Benefits enrollment update required today', domain,
            url: `https://${domain}/benefits/verify`,
            alertDescription: 'Credential bait with urgent HR pretext and lookalike sign-in portal. Landing page cert created within 24h.',
            additionalLogs: 'Hostname entropy suspicious. Sender IP flagged in threat feeds.',
          },
          context: { mfaUsed: false, privilegedUser: false, allowlistMatch: false, authenticationMethod: 'Email Link' },
        };
      },
      () => {
        const domain = pick(PHISH_DOMAINS);
        return {
          eventId, eventType: 'phishing_email', user,
          sourceIp: `198.51.100.${randInt(1, 254)}`,
          timestamp: new Date().toISOString(),
          artifacts: {
            sender: `security-training@${domain}`, subject: 'Security awareness action required', domain,
            alertDescription: 'Mail resembles phishing but may be simulation. Header integrity mixed. DMARC failed due to forwarding.',
            additionalLogs: 'Analyst note: verify whether this is internal awareness campaign before actioning.',
          },
          context: { mfaUsed: false, privilegedUser: false, allowlistMatch: true, authenticationMethod: 'Email' },
        };
      },
    ])();
  }

  // HIGH
  return pick<() => NormalizedEvent>([
    () => {
      const domain = pick(VT_FLAGGED_DOMAINS);
      const hash = uuidv4().replace(/-/g, '').substring(0, 40);
      return {
        eventId, eventType: 'phishing_email', user,
        sourceIp: pick(BAD_IPS),
        timestamp: new Date().toISOString(),
        artifacts: {
          sender: `cfo@${domain}`, subject: 'Q4 Payroll Adjustment — Confidential Review Required', domain, fileHash: hash,
          alertDescription: 'Macro-enabled attachment detonated in sandbox: spawned cmd.exe, outbound C2 beacon initiated.',
          additionalLogs: 'PowerShell execution + scheduled task persistence. Sender IP on 5 threat feeds.',
        },
        context: { mfaUsed: false, privilegedUser: false, allowlistMatch: false, authenticationMethod: 'Email Attachment' },
      };
    },
    () => {
      const domain = pick(VT_FLAGGED_DOMAINS);
      return {
        eventId, eventType: 'phishing_email', user,
        sourceIp: pick(BAD_IPS),
        timestamp: new Date().toISOString(),
        artifacts: {
          sender: `ceo@${domain}`, subject: `Wire Transfer Authorization — ${user.split('@')[0]} — CONFIDENTIAL`, domain,
          url: `https://${domain}/secure/wire?ref=${uuidv4().substring(0, 10)}`,
          alertDescription: 'Spear-phishing BEC attack impersonating CEO for urgent $47,500 wire transfer. Display-name spoofing confirmed.',
          additionalLogs: 'Same campaign hit 3 peer organizations this week per threat sharing feed.',
        },
        context: { mfaUsed: false, privilegedUser: true, allowlistMatch: false, authenticationMethod: 'Email Link' },
      };
    },
    () => {
      const domain = pick(VT_FLAGGED_DOMAINS);
      return {
        eventId, eventType: 'phishing_email', user,
        sourceIp: pick(BAD_IPS),
        timestamp: new Date().toISOString(),
        artifacts: {
          sender: `legal@${domain}`, subject: 'Immediate litigation hold acknowledgement required', domain,
          url: `https://${domain}/legal/ack?ref=${uuidv4().substring(0, 8)}`,
          alertDescription: 'Targeted legal pretext with credential capture and follow-on malware redirect chain.',
          additionalLogs: 'MTA telemetry links campaign to known threat actor infrastructure cluster.',
        },
        context: { mfaUsed: false, privilegedUser: true, allowlistMatch: false, authenticationMethod: 'Email Link' },
      };
    },
  ])();
}

// ─── Suspicious Link ──────────────────────────────────────────────────────────

function generateSuspiciousLink(user: string, eventId: string, tier: Tier): NormalizedEvent {
  if (tier === 'LOW') {
    return pick<() => NormalizedEvent>([
      () => {
        const shortUrl = pick(SHORTENER_URLS);
        return {
          eventId, eventType: 'url_click', user,
          sourceIp: pick(CORP_IPS),
          timestamp: new Date().toISOString(),
          artifacts: { url: shortUrl, domain: new URL(shortUrl).hostname, alertDescription: 'URL-shortener click from internal chat, queued for async destination expansion.' },
          context: { mfaUsed: false, privilegedUser: false, allowlistMatch: false, authenticationMethod: 'Web Session' },
        };
      },
      () => ({
        eventId, eventType: 'url_click', user,
        sourceIp: pick(CORP_IPS),
        timestamp: new Date().toISOString(),
        artifacts: {
          url: 'https://docs.internal.example/redirect?target=partner-portal', domain: 'docs.internal.example',
          alertDescription: 'Internal redirect flagged by heuristic. Host reputation appears benign. Possible DLP false positive.',
        },
        context: { mfaUsed: false, privilegedUser: false, allowlistMatch: true, authenticationMethod: 'Web Session' },
      }),
    ])();
  }

  if (tier === 'MEDIUM') {
    return pick<() => NormalizedEvent>([
      () => {
        const domain = pick(TYPOSQUAT_DOMAINS);
        return {
          eventId, eventType: 'url_click', user,
          sourceIp: `198.51.100.${randInt(1, 254)}`,
          timestamp: new Date().toISOString(),
          artifacts: {
            url: `https://${domain}/account/login?next=%2Fdashboard`, domain,
            alertDescription: `Typosquatted brand domain "${domain}" with credential replica page and fresh TLS cert (3 days old).`,
            additionalLogs: 'Registrar risk score elevated. No legitimate history on domain.',
          },
          context: { mfaUsed: false, privilegedUser: false, allowlistMatch: false, authenticationMethod: 'Web Session' },
        };
      },
      () => {
        const domain = pick(TYPOSQUAT_DOMAINS);
        return {
          eventId, eventType: 'url_click', user,
          sourceIp: pick(VPN_IPS),
          timestamp: new Date().toISOString(),
          artifacts: {
            url: `https://${domain}/sso/re-auth`, domain,
            alertDescription: 'Suspicious SSO prompt on lookalike domain. DOM fingerprint matches known credential kit templates.',
            additionalLogs: 'Script obfuscation detected. May be awareness exercise — verify with security team.',
          },
          context: { mfaUsed: false, privilegedUser: false, allowlistMatch: false, authenticationMethod: 'Web Session' },
        };
      },
      () => {
        const domain = pick(TYPOSQUAT_DOMAINS);
        return {
          eventId, eventType: 'url_click', user,
          sourceIp: pick(CORP_IPS),
          timestamp: new Date().toISOString(),
          artifacts: {
            url: `https://${domain}/training/simulated-login`, domain,
            alertDescription: 'Phishing-like link flagged. IOC overlap with awareness templates — may be false positive.',
            additionalLogs: 'Confirm whether this is security training campaign before actioning.',
          },
          context: { mfaUsed: true, privilegedUser: false, allowlistMatch: true, authenticationMethod: 'Web Session' },
        };
      },
    ])();
  }

  // HIGH
  return pick<() => NormalizedEvent>([
    () => {
      const domain = pick(VT_FLAGGED_DOMAINS);
      return {
        eventId, eventType: 'url_click', user,
        sourceIp: pick(BAD_IPS),
        timestamp: new Date().toISOString(),
        artifacts: {
          url: `http://${domain}/dl/${uuidv4().substring(0, 8)}.exe`, domain,
          alertDescription: `Known malicious domain "${domain}" on 11 threat intel blocklists. Serves active malware dropper on click.`,
          additionalLogs: 'VirusTotal: 38/72 engines flagged. User endpoint may require isolation.',
        },
        context: { mfaUsed: false, privilegedUser: false, allowlistMatch: false, authenticationMethod: 'Web Session' },
      };
    },
    () => {
      const finalDomain = pick(VT_FLAGGED_DOMAINS);
      const hopDomain   = pick(TYPOSQUAT_DOMAINS);
      return {
        eventId, eventType: 'url_click', user,
        sourceIp: pick(TOR_IPS),
        timestamp: new Date().toISOString(),
        artifacts: {
          url: `https://${hopDomain}/r?next=${encodeURIComponent(`http://${finalDomain}/stage2`)}`, domain: finalDomain,
          alertDescription: `Multi-hop redirect: ${hopDomain} → ${finalDomain}/stage2. Final endpoint is active C2. Beacon callback pattern detected post-click.`,
          additionalLogs: 'Stage-2 payload fingerprint matches Cobalt Strike beacon. Immediate containment recommended.',
        },
        context: { mfaUsed: false, privilegedUser: true, allowlistMatch: false, authenticationMethod: 'Web Session' },
      };
    },
    () => {
      const domain = pick(VT_FLAGGED_DOMAINS);
      return {
        eventId, eventType: 'url_click', user,
        sourceIp: pick(BAD_IPS),
        timestamp: new Date().toISOString(),
        artifacts: {
          url: `https://${domain}/auth/device-check`, domain,
          alertDescription: 'Exploit-kit landing page attempting browser exploitation and persistence stager download.',
          additionalLogs: 'Exploit signatures match active campaign targeting enterprise browsers. EDR alert queued.',
        },
        context: { mfaUsed: false, privilegedUser: true, allowlistMatch: false, authenticationMethod: 'Web Session' },
      };
    },
  ])();
}

// ─── Fraudulent Transaction ───────────────────────────────────────────────────

function generateFraudTx(user: string, eventId: string, tier: Tier): NormalizedEvent {
  if (tier === 'LOW') {
    return pick<() => NormalizedEvent>([
      () => {
        const amount = parseFloat((Math.random() * 75 + 15).toFixed(2));
        return {
          eventId, eventType: 'transaction', user,
          sourceIp: `192.168.${randInt(1, 10)}.${randInt(1, 254)}`,
          timestamp: new Date().toISOString(),
          artifacts: {
            transactionAmount: amount, transactionCurrency: 'USD',
            transactionMerchant: pick(['QuickPay Online', 'StreamFlix', 'CloudStore Inc.']),
            transactionRegion: 'US-CA', transactionType: 'card_present',
            alertDescription: `Small velocity anomaly: $${amount} domestic spend with known merchant profile. Likely benign.`,
          },
          context: { mfaUsed: false, privilegedUser: false, allowlistMatch: true, sessionTag: 'domestic_card_velocity', authenticationMethod: 'Card Present' },
        };
      },
      () => {
        const amount = parseFloat((Math.random() * 120 + 5).toFixed(2));
        return {
          eventId, eventType: 'transaction', user,
          sourceIp: `10.10.${randInt(1, 20)}.${randInt(1, 254)}`,
          timestamp: new Date().toISOString(),
          artifacts: {
            transactionAmount: amount, transactionCurrency: 'USD',
            transactionMerchant: pick(['TransitPass', 'Grocery Direct', 'OfficeCafe']),
            transactionRegion: 'US-NY', transactionType: 'card_present',
            alertDescription: `Low-risk card activity: minor behavior deviation for $${amount} at routine merchant.`,
            additionalLogs: 'Matched approved expense exception ticket post-review.',
          },
          context: { mfaUsed: true, privilegedUser: false, allowlistMatch: true, sessionTag: 'routine_spend', authenticationMethod: 'Chip + PIN' },
        };
      },
    ])();
  }

  if (tier === 'MEDIUM') {
    return pick<() => NormalizedEvent>([
      () => {
        const amount = parseFloat((Math.random() * 6000 + 2500).toFixed(2));
        return {
          eventId, eventType: 'transaction', user,
          sourceIp: `10.0.${randInt(1, 20)}.${randInt(1, 254)}`,
          timestamp: new Date().toISOString(),
          artifacts: {
            transactionAmount: amount, transactionCurrency: 'USD',
            transactionMerchant: pick(['LuxuryGoods.com', 'CryptoExchange Pro', 'GiftCard Depot']),
            transactionRegion: pick(['US-NY', 'US-TX', 'US-FL']), transactionType: 'card_not_present',
            alertDescription: `Card-not-present $${amount} in high-risk merchant category (MCC 6051 quasi-cash). No prior merchant history. 3DS absent.`,
            additionalLogs: 'Fraud model score: 87/100. Merchant chargeback rate: 4.2%.',
          },
          context: { mfaUsed: false, privilegedUser: false, allowlistMatch: false, sessionTag: 'cnp_high_risk_merchant', authenticationMethod: 'Card Not Present' },
        };
      },
      () => {
        const amount = parseFloat((Math.random() * 4500 + 1200).toFixed(2));
        return {
          eventId, eventType: 'transaction', user,
          sourceIp: `172.16.${randInt(1, 20)}.${randInt(1, 254)}`,
          timestamp: new Date().toISOString(),
          artifacts: {
            transactionAmount: amount, transactionCurrency: 'USD',
            transactionMerchant: pick(['TravelNow', 'ElectroMarket', 'HotelExpress']),
            transactionRegion: pick(['US-IL', 'US-WA', 'US-GA']), transactionType: 'card_not_present',
            alertDescription: `Cross-state spend spike of $${amount} with unseen device and atypical merchant. Velocity above baseline.`,
            additionalLogs: 'Analyst note: user may have changed device. Confirm before blocking.',
          },
          context: { mfaUsed: false, privilegedUser: false, allowlistMatch: false, sessionTag: 'cross_state_spike', authenticationMethod: 'Card Not Present' },
        };
      },
      () => {
        const amount = parseFloat((Math.random() * 3000 + 2000).toFixed(2));
        return {
          eventId, eventType: 'transaction', user,
          sourceIp: `10.0.${randInt(1, 20)}.${randInt(1, 254)}`,
          timestamp: new Date().toISOString(),
          artifacts: {
            transactionAmount: amount, transactionCurrency: 'USD',
            transactionMerchant: 'Emergency Supplier Portal', transactionRegion: 'US-DC', transactionType: 'wire_transfer',
            alertDescription: `Urgent transfer of $${amount} looks anomalous but may be false positive from approved procurement exception.`,
            additionalLogs: 'Transfer later matched approved procurement ticket — analyst review recommended.',
          },
          context: { mfaUsed: true, privilegedUser: false, allowlistMatch: true, sessionTag: 'approved_exception', authenticationMethod: 'Online Banking' },
        };
      },
    ])();
  }

  // HIGH
  return pick<() => NormalizedEvent>([
    () => {
      const amount = parseFloat((Math.random() * 20000 + 8000).toFixed(2));
      const region = pick(['NG-LA', 'RO-BUC', 'BR-SP', 'PH-MNL', 'UA-KIV']);
      return {
        eventId, eventType: 'transaction', user,
        sourceIp: pick(BAD_IPS),
        timestamp: new Date().toISOString(),
        artifacts: {
          transactionAmount: amount, transactionCurrency: pick(['EUR', 'GBP', 'USD']),
          transactionMerchant: pick(['InternationalWire LLC', 'FX Exchange Ltd']),
          transactionRegion: region, transactionType: 'wire_transfer',
          alertDescription: `First-seen foreign wire of $${amount} to ${region}. Beneficiary bank flagged in FinCEN advisory. AML typology: layering.`,
          additionalLogs: 'Transfer initiated 3 min after unusual login from foreign IP. Beneficiary entity registered 14 days ago.',
        },
        context: { mfaUsed: false, privilegedUser: false, allowlistMatch: false, sessionTag: `foreign_wire_${region.split('-')[0].toLowerCase()}`, authenticationMethod: 'Online Banking — Foreign Session' },
      };
    },
    () => {
      const amount = parseFloat((Math.random() * 40000 + 15000).toFixed(2));
      const region = pick(['RU-MOW', 'KP-PYO', 'IR-THR', 'BY-MSK']);
      return {
        eventId, eventType: 'transaction', user,
        sourceIp: pick(TOR_IPS),
        timestamp: new Date().toISOString(),
        artifacts: {
          transactionAmount: amount, transactionCurrency: 'USDT',
          transactionMerchant: 'Crypto OTC Desk — Unregulated', transactionRegion: region, transactionType: 'crypto_transfer',
          alertDescription: `Account-drain: $${amount.toLocaleString()} USDT to OFAC-sanctioned ${region} from Tor session. Password reset 11 min prior — ATO confirmed.`,
          additionalLogs: 'Receiving wallet linked to prior ransomware settlements. Immediate freeze recommended.',
        },
        context: { mfaUsed: false, privilegedUser: false, allowlistMatch: false, sessionTag: 'ato_crypto_drain', authenticationMethod: 'Post-ATO Tor Session' },
      };
    },
    () => {
      const amount = parseFloat((Math.random() * 25000 + 12000).toFixed(2));
      return {
        eventId, eventType: 'transaction', user,
        sourceIp: pick(BAD_IPS),
        timestamp: new Date().toISOString(),
        artifacts: {
          transactionAmount: amount, transactionCurrency: 'USD',
          transactionMerchant: 'Trade Settlement Desk', transactionRegion: pick(['AE-DXB', 'SG-SIN', 'HK-HKG']), transactionType: 'wire_transfer',
          alertDescription: `Rapid high-value wire chain of $${amount}: 3 beneficiary changes in 10 min. Mule-account staging indicators.`,
          additionalLogs: 'Settlement instructions overwritten mid-session. Escalate to AML team immediately.',
        },
        context: { mfaUsed: false, privilegedUser: true, allowlistMatch: false, sessionTag: 'mule_chain_rapid_wire', authenticationMethod: 'Online Banking Admin Session' },
      };
    },
  ])();
}

// ─── Public API ───────────────────────────────────────────────────────────────

export class SimulatorService {
  static listScenarioNames() {
    return [...SCENARIO_NAMES];
  }

  static generateEvent(scenario: ScenarioName): NormalizedEvent {
    const user    = pick(USERS);
    const eventId = uuidv4();
    const tier    = pickTier();

    switch (scenario) {
      case 'login':                  return generateLogin(user, eventId, tier);
      case 'phishing_email':         return generatePhishing(user, eventId, tier);
      case 'suspicious_link':        return generateSuspiciousLink(user, eventId, tier);
      case 'fraudulent_transaction': return generateFraudTx(user, eventId, tier);
      default: throw new Error(`Unknown scenario: ${scenario}`);
    }
  }
}
