export const getApiBase = () => {
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host.startsWith('10.')) {
    return `http://${host}:5000/api`;
  }
  return (window.location.origin.replace(/\/$/, '') + '/api');
};

export const fetchWithRetry = async (url, options = {}, retries = 3, backoff = 500) => {
  try {
    const response = await fetch(url, options);
    if (!response.ok && retries > 0) throw new Error(`HTTP ${response.status}`);
    return response;
  } catch (err) {
    if (retries <= 0) throw err;
    console.warn(`⚠️ Fetch failed, retrying in ${backoff}ms... (${retries} left)`, url);
    await new Promise(r => setTimeout(r, backoff));
    return fetchWithRetry(url, options, retries - 1, backoff * 1.5);
  }
};
