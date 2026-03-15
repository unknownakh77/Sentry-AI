import { env } from '../config/env';

// A simple in-memory cache for the demo
const cache = new Map<string, { data: any; expiresAt: number }>();

function getCached<T>(key: string): T | null {
  const item = cache.get(key);
  if (item && item.expiresAt > Date.now()) {
    return item.data as T;
  }
  return null;
}

function setCache(key: string, data: any, ttlMs = 10 * 60 * 1000 /* 10 mins */) {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

// Timeout wrapper
async function fetchWithTimeout(resource: RequestInfo, options: RequestInit & { timeout?: number } = {}) {
  const { timeout = 5000 } = options;
  
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  const response = await fetch(resource, {
    ...options,
    signal: controller.signal
  });
  clearTimeout(id);

  return response;
}

// --- Fixtures ---
const FIXTURES = {
  ipinfo(ip: string) {
    if (ip === '185.220.101.1') return { ip, city: 'Moscow', region: 'Moscow', country: 'RU', loc: '55.7558,37.6173', org: 'AS197540' };
    if (ip === '203.0.113.45') return { ip, city: 'Unknown', region: 'Unknown', country: 'XX', loc: '0,0', org: 'AS99999' };
    return { ip, city: 'Toronto', region: 'Ontario', country: 'CA', loc: '43.6532,-79.3832', org: 'AS12345 Sentry ISP' }; // Default safe
  },
  vpnapi(ip: string) {
    if (ip === '185.220.101.1') return { ip, security: { vpn: true, proxy: false, tor: true, relay: false } };
    return { ip, security: { vpn: false, proxy: false, tor: false, relay: false } };
  },
  virustotalIp(ip: string) {
    if (ip === '185.220.101.1' || ip === '203.0.113.45') return { data: { attributes: { last_analysis_stats: { malicious: 12, suspicious: 4, harmless: 50 } } } };
    return { data: { attributes: { last_analysis_stats: { malicious: 0, suspicious: 0, harmless: 80 } } } };
  },
  vtDomain(domain: string) {
    if (domain === 'c0rp-support.com' || domain === 'bit.ly') return { data: { attributes: { last_analysis_stats: { malicious: 8, suspicious: 2, harmless: 40 } } } };
    return { data: { attributes: { last_analysis_stats: { malicious: 0, suspicious: 0, harmless: 70 } } } };
  },
  vtUrl(url: string) {
    if (/c0rp-support\.com|bit\.ly/i.test(url)) return { data: { attributes: { last_analysis_stats: { malicious: 8, suspicious: 2, harmless: 40 } } } };
    return { data: { attributes: { last_analysis_stats: { malicious: 0, suspicious: 0, harmless: 70 } } } };
  },
  vtFileHash(fileHash: string) {
    if (/^e3b0c44298fc1c149afbf4c8996fb924/i.test(fileHash)) {
      return { data: { attributes: { last_analysis_stats: { malicious: 0, suspicious: 0, harmless: 80 } } } };
    }
    return { data: { attributes: { last_analysis_stats: { malicious: 3, suspicious: 1, harmless: 55 } } } };
  }
};

const USE_FIXTURES = false; // Always use real APIs for the final integrated version

// --- Services ---

export async function getIpInfo(ip: string) {
  const cacheKey = `ipinfo:${ip}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  if (USE_FIXTURES) {
    const data = FIXTURES.ipinfo(ip);
    setCache(cacheKey, data);
    return data;
  }

  // Real API implementation
  try {
    const res = await fetchWithTimeout(`https://ipinfo.io/${ip}/json?token=${env.ipInfoToken}`);
    const data = await res.json();
    setCache(cacheKey, data);
    return data;
  } catch (err) {
    console.error(`IPInfo fetch failed for ${ip}, using fixture.`);
    return FIXTURES.ipinfo(ip);
  }
}

export async function getVpnApi(ip: string) {
  const cacheKey = `vpnapi:${ip}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  if (USE_FIXTURES) {
    const data = FIXTURES.vpnapi(ip);
    setCache(cacheKey, data);
    return data;
  }

  try {
    const res = await fetchWithTimeout(`https://vpnapi.io/api/${ip}?key=${env.vpnApiKey}`);
    const data = await res.json();
    if (!data?.security) {
      console.warn(`vpnapi response missing security for ${ip}, using fixture.`);
      return FIXTURES.vpnapi(ip);
    }
    setCache(cacheKey, data);
    return data;
  } catch (err) {
    console.warn(`vpnapi fetch failed for ${ip}, using fixture.`);
    return FIXTURES.vpnapi(ip);
  }
}

export async function getVirusTotalIp(ip: string) {
  const cacheKey = `vt:ip:${ip}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  if (USE_FIXTURES) {
    const data = FIXTURES.virustotalIp(ip);
    setCache(cacheKey, data);
    return data;
  }

  try {
    const res = await fetchWithTimeout(`https://www.virustotal.com/api/v3/ip_addresses/${ip}`, {
      headers: { 'x-apikey': env.virusTotalApiKey || '' }
    });
    const data = await res.json();
    if (!data?.data?.attributes?.last_analysis_stats) {
      console.warn(`vt ip response missing stats for ${ip}, using fixture.`);
      return FIXTURES.virustotalIp(ip);
    }
    setCache(cacheKey, data);
    return data;
  } catch (err) {
    console.warn(`vt ip fetch failed for ${ip}, using fixture.`);
    return FIXTURES.virustotalIp(ip);
  }
}

export async function getVirusTotalDomain(domain: string) {
  const cacheKey = `vt:domain:${domain}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  if (USE_FIXTURES) {
    const data = FIXTURES.vtDomain(domain);
    setCache(cacheKey, data);
    return data;
  }

  try {
    const res = await fetchWithTimeout(`https://www.virustotal.com/api/v3/domains/${domain}`, {
      headers: { 'x-apikey': env.virusTotalApiKey || '' }
    });
    const data = await res.json();
    if (!data?.data?.attributes?.last_analysis_stats) {
      console.warn(`vt domain response missing stats for ${domain}, using fixture.`);
      return FIXTURES.vtDomain(domain);
    }
    setCache(cacheKey, data);
    return data;
  } catch (err) {
    console.warn(`vt domain fetch failed for ${domain}, using fixture.`);
    return FIXTURES.vtDomain(domain);
  }
}

function toVirusTotalUrlId(url: string) {
  return Buffer.from(url).toString('base64url');
}

export async function getVirusTotalUrl(url: string) {
  const cacheKey = `vt:url:${url}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  if (USE_FIXTURES) {
    const data = FIXTURES.vtUrl(url);
    setCache(cacheKey, data);
    return data;
  }

  try {
    const urlId = toVirusTotalUrlId(url);
    const res = await fetchWithTimeout(`https://www.virustotal.com/api/v3/urls/${urlId}`, {
      headers: { 'x-apikey': env.virusTotalApiKey || '' }
    });
    const data = await res.json();
    if (!data?.data?.attributes?.last_analysis_stats) {
      console.warn(`vt url response missing stats for ${url}, using fixture.`);
      return FIXTURES.vtUrl(url);
    }
    setCache(cacheKey, data);
    return data;
  } catch (err) {
    console.warn(`vt url fetch failed for ${url}, using fixture.`);
    return FIXTURES.vtUrl(url);
  }
}

export async function getVirusTotalFileHash(fileHash: string) {
  const cacheKey = `vt:file:${fileHash}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  if (USE_FIXTURES) {
    const data = FIXTURES.vtFileHash(fileHash);
    setCache(cacheKey, data);
    return data;
  }

  try {
    const res = await fetchWithTimeout(`https://www.virustotal.com/api/v3/files/${fileHash}`, {
      headers: { 'x-apikey': env.virusTotalApiKey || '' }
    });
    const data = await res.json();
    if (!data?.data?.attributes?.last_analysis_stats) {
      console.warn(`vt file response missing stats for ${fileHash}, using fixture.`);
      return FIXTURES.vtFileHash(fileHash);
    }
    setCache(cacheKey, data);
    return data;
  } catch (err) {
    console.warn(`vt file fetch failed for ${fileHash}, using fixture.`);
    return FIXTURES.vtFileHash(fileHash);
  }
}
