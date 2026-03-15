import { isIP } from 'node:net';
import { getIpInfo, getVpnApi, getVirusTotalFileHash, getVirusTotalIp, getVirusTotalUrl } from './enrichment';

type IndicatorType = 'ip' | 'url' | 'file_hash';

const asVerdict = (maliciousDetections: number, suspiciousDetections = 0) => {
  if (maliciousDetections > 0) {
    return { reputation: 'Malicious', severity: 'MALICIOUS' as const };
  }
  if (suspiciousDetections > 0) {
    return { reputation: 'Suspicious', severity: 'SUSPICIOUS' as const };
  }
  return { reputation: 'Clean', severity: 'CLEAN' as const };
};

async function lookupIp(ip: string) {
  const [ipInfo, vpn, vtIp] = await Promise.all([
    getIpInfo(ip),
    getVpnApi(ip),
    getVirusTotalIp(ip),
  ]);

  const stats = vtIp?.data?.attributes?.last_analysis_stats || {};
  const maliciousDetections = Number(stats.malicious || 0);
  const suspiciousDetections = Number(stats.suspicious || 0);
  const verdict = asVerdict(maliciousDetections, suspiciousDetections);

  return {
    query: ip,
    type: 'ip' as const,
    reputation: verdict.reputation,
    provider: 'VirusTotal + IPInfo + VPNAPI',
    severity: verdict.severity,
    details: {
      geo: `${ipInfo?.city || 'Unknown'}, ${ipInfo?.region || 'Unknown'}, ${ipInfo?.country || 'Unknown'}`,
      asn: ipInfo?.org || 'Unknown ASN/ISP',
      vpn: !!(vpn?.security?.vpn || vpn?.security?.proxy || vpn?.security?.tor),
      proxy: !!vpn?.security?.proxy,
      tor: !!vpn?.security?.tor,
      maliciousDetections,
      suspiciousDetections,
    },
    summary: maliciousDetections > 0
      ? `VirusTotal flagged ${maliciousDetections} malicious detections for this IP.`
      : suspiciousDetections > 0
        ? `No malicious detections but ${suspiciousDetections} suspicious detections found for this IP.`
        : 'No malicious reputation signals detected for this IP.',
  };
}

async function lookupUrl(url: string) {
  const vtUrl = await getVirusTotalUrl(url);
  const stats = vtUrl?.data?.attributes?.last_analysis_stats || {};
  const maliciousDetections = Number(stats.malicious || 0);
  const suspiciousDetections = Number(stats.suspicious || 0);
  const verdict = asVerdict(maliciousDetections, suspiciousDetections);

  return {
    query: url,
    type: 'url' as const,
    reputation: verdict.reputation,
    provider: 'VirusTotal (URL)',
    severity: verdict.severity,
    details: {
      geo: 'N/A',
      asn: 'N/A',
      vpn: false,
      proxy: false,
      tor: false,
      maliciousDetections,
      suspiciousDetections,
    },
    summary: maliciousDetections > 0
      ? `VirusTotal flagged ${maliciousDetections} malicious detections for this URL.`
      : suspiciousDetections > 0
        ? `No malicious detections but ${suspiciousDetections} suspicious detections found for this URL.`
        : 'No malicious reputation signals detected for this URL.',
  };
}

async function lookupFileHash(fileHash: string) {
  const data = await getVirusTotalFileHash(fileHash);
  const stats = data?.data?.attributes?.last_analysis_stats || {};
  const maliciousDetections = Number(stats.malicious || 0);
  const suspiciousDetections = Number(stats.suspicious || 0);
  const verdict = asVerdict(maliciousDetections, suspiciousDetections);

  return {
    query: fileHash,
    type: 'file_hash' as const,
    reputation: verdict.reputation,
    provider: 'VirusTotal',
    severity: verdict.severity,
    details: {
      geo: 'N/A',
      asn: 'N/A',
      vpn: false,
      proxy: false,
      tor: false,
      maliciousDetections,
      suspiciousDetections,
    },
    summary: maliciousDetections > 0
      ? `VirusTotal flagged this hash as malicious (${maliciousDetections} engines).`
      : suspiciousDetections > 0
        ? `No malicious detections but suspicious detections (${suspiciousDetections}) were found for this hash.`
        : 'No malicious reputation signals detected for this hash.',
  };
}

const HASH_REGEX = /^(?:[a-fA-F0-9]{32}|[a-fA-F0-9]{40}|[a-fA-F0-9]{64})$/;

function validateIndicatorByType(value: string, type: IndicatorType) {
  if (type === 'ip') {
    if (isIP(value) === 0) {
      throw new Error('Please enter a valid IP address.');
    }
    return;
  }

  if (type === 'url') {
    try {
      const parsed = new URL(value);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Please enter a valid URL.');
      }
    } catch {
      throw new Error('Please enter a valid URL.');
    }
    return;
  }

  if (!HASH_REGEX.test(value)) {
    throw new Error('Please enter a valid file hash.');
  }
}

export async function lookupThreatIndicator(query: string, type: IndicatorType) {
  const value = query.trim();
  if (!value) {
    throw new Error('Indicator query is required');
  }

  validateIndicatorByType(value, type);

  if (type === 'ip') {
    return lookupIp(value);
  }
  if (type === 'url') {
    return lookupUrl(value);
  }
  return lookupFileHash(value);
}
