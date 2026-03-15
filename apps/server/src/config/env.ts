const parsePort = (value: string | undefined) => {
  const port = Number(value);
  return Number.isInteger(port) && port > 0 ? port : 3001;
};

export const env = {
  get ipInfoToken() {
    return process.env.IPINFO_TOKEN;
  },
  get port() {
    return parsePort(process.env.PORT);
  },
  get virusTotalApiKey() {
    return process.env.VT_API_KEY;
  },
  get vpnApiKey() {
    return process.env.VPNAPI_KEY;
  },
};
