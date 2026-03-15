import { getIpInfo, getVpnApi, getVirusTotalDomain, getVirusTotalIp } from './enrichment';
import { env } from '../config/env';

type IndicatorType = 'ip' | 'domain' | 'url' | 'file_hash';

const isIp = (value: string) => /^(?:\d{1,3}\.){3}\d{1,3}$/.test(value.trim());

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

async function lookupDomain(domain: string) {
  const vtDomain = await getVirusTotalDomain(domain);
  const stats = vtDomain?.data?.attributes?.last_analysis_stats || {};
  const maliciousDetections = Number(stats.malicious || 0);
  const suspiciousDetections = Number(stats.suspicious || 0);
  const verdict = asVerdict(maliciousDetections, suspiciousDetections);

  return {
    query: domain,
    type: 'domain' as const,
    reputation: verdict.reputation,
    provider: 'VirusTotal',
    severity: verdict.severity,
    details: {
      geo: 'N/A',
      asn: 'N/A',
      vpn: false,
      maliciousDetections,
      suspiciousDetections,
    },
    summary: maliciousDetections > 0
      ? `VirusTotal flagged ${maliciousDetections} malicious detections for this domain.`
      : suspiciousDetections > 0
        ? `No malicious detections but ${suspiciousDetections} suspicious detections found for this domain.`
        : 'No malicious reputation signals detected for this domain.',
  };
}

async function lookupFileHash(fileHash: string) {
  if (!env.virusTotalApiKey) {
    throw new Error('VT_API_KEY is missing');
  }

  const response = await fetch(`https://www.virustotal.com/api/v3/files/${fileHash}`, {
    headers: { 'x-apikey': env.virusTotalApiKey },
  });
  const data = await response.json();
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

export async function lookupThreatIndicator(query: string, type: IndicatorType) {
  const value = query.trim();
  if (!value) {
    throw new Error('Indicator query is required');
  }

  if (type === 'ip') {
    return lookupIp(value);
  }
  if (type === 'domain') {
    return lookupDomain(value.toLowerCase());
  }
  if (type === 'url') {
    const url = new URL(value);
    const result = await lookupDomain(url.hostname.toLowerCase());
    return {
      ...result,
      query: value,
      type: 'url' as const,
      summary: `${result.summary} URL host analyzed: ${url.hostname.toLowerCase()}.`,
    };
  }
  if (type === 'file_hash') {
    return lookupFileHash(value);
  }

  if (isIp(value)) {
    return lookupIp(value);
  }
  return lookupDomain(value.toLowerCase());
}
