const DEFAULT_API_BASE = 'https://api.github.com';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const buildUrl = (path, params = {}) => {
  const url = new URL(path.startsWith('http') ? path : `${DEFAULT_API_BASE}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  });
  return url;
};

const parseLinkHeader = (linkHeader = '') => {
  const links = {};
  linkHeader
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
      if (match) {
        links[match[2]] = match[1];
      }
    });
  return links;
};

export class GitHubApiClient {
  constructor({ username, token } = {}) {
    if (!username) {
      throw new Error('Missing required environment variable: GITHUB_USERNAME');
    }
    this.username = username;
    this.token = token;
    this.cache = new Map();
  }

  get headers() {
    const headers = {
      Accept: 'application/vnd.github+json',
      'User-Agent': `${this.username}-profile-readme-generator`
    };
    if (this.token) {
      headers.Authorization = 'Bearer ' + this.token;
    }
    return headers;
  }

  async request(path, params = {}, { useCache = true, retries = 2 } = {}) {
    const url = buildUrl(path, params);
    const cacheKey = url.toString();

    if (useCache && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const response = await fetch(url, { headers: this.headers });

    if (response.status === 403) {
      const remaining = Number(response.headers.get('x-ratelimit-remaining') || '1');
      const reset = Number(response.headers.get('x-ratelimit-reset') || '0');
      const body = await response.text();
      if (remaining === 0 && retries > 0) {
        const waitMs = Math.max((reset * 1000) - Date.now(), 1000);
        await sleep(Math.min(waitMs, 60_000));
        return this.request(path, params, { useCache, retries: retries - 1 });
      }
      throw new Error(`GitHub API rate limit or access error (${response.status}): ${body}`);
    }

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`GitHub API request failed (${response.status}) for ${url}: ${body}`);
    }

    const data = await response.json();
    const result = {
      data,
      links: parseLinkHeader(response.headers.get('link'))
    };

    if (useCache) {
      this.cache.set(cacheKey, result);
    }

    return result;
  }

  async paginate(path, params = {}, { maxPages = 10 } = {}) {
    let nextUrl = buildUrl(path, params).toString();
    const pages = [];

    for (let page = 0; page < maxPages && nextUrl; page += 1) {
      const { data, links } = await this.request(nextUrl, {}, { useCache: false });
      if (!Array.isArray(data)) {
        throw new Error(`Expected paginated array response for ${nextUrl}`);
      }
      pages.push(...data);
      nextUrl = links.next || null;
    }

    return pages;
  }

  async getUser() {
    const { data } = await this.request(`/users/${this.username}`);
    return data;
  }

  async getPublicRepos() {
    return this.paginate(`/users/${this.username}/repos`, {
      per_page: 100,
      sort: 'updated'
    });
  }

  async getRecentEvents() {
    return this.paginate(`/users/${this.username}/events/public`, { per_page: 100 }, { maxPages: 3 });
  }

  async getRepoLanguages(owner, repo) {
    const { data } = await this.request(`/repos/${owner}/${repo}/languages`);
    return data;
  }
}

export const createGitHubClient = (env = process.env) => {
  const username = env.GITHUB_USERNAME;
  const token = env.GITHUB_TOKEN;
  return new GitHubApiClient({ username, token });
};
