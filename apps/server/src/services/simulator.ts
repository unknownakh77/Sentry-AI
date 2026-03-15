import { v4 as uuidv4 } from 'uuid';
import { NormalizedEvent } from '@sentry/shared';

const USERS = [
  'bob.banking@corp.com',
  'alice.assets@corp.com',
  'charlie.crypto@corp.com',
  'diana.deposits@corp.com',
  'eve.excess@corp.com'
];

const MALICIOUS_IPS = [
  '185.220.101.10', // Tor Exit Node
  '45.227.253.100', // Known malicious RU IP
  '103.14.26.190'   // Suspicious CN IP
];

const SAFE_IPS = [
  '192.168.1.50',
  '10.0.0.12',
  '172.16.25.101'
];

const DOMAINS = [
  'c0rp-support.com',
  'security-verify.net',
  'account-update.org',
  'login-portal.info'
];

export class SimulatorService {
  static generateEvent(scenario: string): NormalizedEvent {
    const user = USERS[Math.floor(Math.random() * USERS.length)];
    const eventId = uuidv4();
    const timestamp = new Date().toISOString();

    switch (scenario) {
      case 'safe_login':
        return {
          eventId,
          eventType: 'login',
          user,
          sourceIp: SAFE_IPS[Math.floor(Math.random() * SAFE_IPS.length)],
          timestamp,
          artifacts: {},
          context: {
            mfaUsed: true,
            privilegedUser: false,
            allowlistMatch: true,
            sessionTag: 'office_wifi'
          }
        };

      case 'malicious_login':
        return {
          eventId,
          eventType: 'login',
          user,
          sourceIp: MALICIOUS_IPS[Math.floor(Math.random() * MALICIOUS_IPS.length)],
          timestamp,
          artifacts: {},
          context: {
            mfaUsed: false,
            privilegedUser: Math.random() > 0.5,
            allowlistMatch: false,
            sessionTag: 'unknown_mobile'
          }
        };

      case 'phishing_email':
        const domain = DOMAINS[Math.floor(Math.random() * DOMAINS.length)];
        return {
          eventId,
          eventType: 'phishing_email',
          user,
          sourceIp: '203.0.113.' + Math.floor(Math.random() * 255),
          timestamp,
          artifacts: {
            sender: `it-support@${domain}`,
            subject: 'CRITICAL: Account Password Expiry Notice',
            domain: domain
          },
          context: {
            mfaUsed: false,
            privilegedUser: false,
            allowlistMatch: false
          }
        };

      case 'url_click':
        return {
          eventId,
          eventType: 'url_click',
          user,
          sourceIp: '198.51.100.' + Math.floor(Math.random() * 255),
          timestamp,
          artifacts: {
            url: `http://${DOMAINS[Math.floor(Math.random() * DOMAINS.length)]}/verify?token=${uuidv4().substring(0, 8)}`
          },
          context: {
            mfaUsed: false,
            privilegedUser: false,
            allowlistMatch: false
          }
        };

      default:
        throw new Error(`Unknown scenario: ${scenario}`);
    }
  }
}
