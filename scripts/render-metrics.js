import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGitHubClient } from './utils/github-api.js';
import {
  svgDocument,
  animatedGradient,
  createCard,
  statGrid,
  languageBars,
  activityBars,
  circularIndicator,
  progressBar
} from './utils/svg.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const METRICS_DIR = path.join(ROOT_DIR, 'assets', 'metrics');

const numberFormat = new Intl.NumberFormat('en-US');
const monthFormat = new Intl.DateTimeFormat('en-US', { month: 'short' });

const sumObjectValues = (object = {}) => Object.values(object).reduce((total, value) => total + Number(value || 0), 0);

const computeLanguageDistribution = async (client, repos) => {
  const languageTotals = new Map();

  for (const repo of repos) {
    if (repo.fork || !repo.owner?.login || !repo.name) {
      continue;
    }
    const languages = await client.getRepoLanguages(repo.owner.login, repo.name);
    Object.entries(languages).forEach(([language, bytes]) => {
      languageTotals.set(language, (languageTotals.get(language) || 0) + Number(bytes || 0));
    });
  }

  const totalBytes = [...languageTotals.values()].reduce((sum, value) => sum + value, 0) || 1;
  return [...languageTotals.entries()]
    .map(([label, bytes]) => ({ label, value: (bytes / totalBytes) * 100 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 7);
};

const monthBuckets = (events, months = 6) => {
  const now = new Date();
  const map = new Map();

  for (let i = months - 1; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    map.set(key, { label: monthFormat.format(date), value: 0 });
  }

  events.forEach((event) => {
    if (!event.created_at) {
      return;
    }
    const date = new Date(event.created_at);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    if (map.has(key)) {
      const current = map.get(key);
      current.value += 1;
    }
  });

  return [...map.values()];
};

const createStatsSvg = ({ username, user, repos, stars, forks, events }) => {
  const repoCount = repos.length;
  const activityRate = Math.min(100, Math.round((events.length / 300) * 100));
  const starsPerRepo = repoCount ? (stars / repoCount) : 0;

  const content = `
    ${statGrid([
      { label: 'Developer', value: `@${username}` },
      { label: 'Public repositories', value: numberFormat.format(repoCount) },
      { label: 'Followers', value: numberFormat.format(user.followers || 0) },
      { label: 'Total stars', value: numberFormat.format(stars) },
      { label: 'Total forks', value: numberFormat.format(forks) },
      { label: 'Following', value: numberFormat.format(user.following || 0) }
    ])}
    ${circularIndicator({ cx: 530, cy: 112, value: activityRate, label: 'Recent activity', color: '#2ea043' })}
    ${circularIndicator({ cx: 620, cy: 112, value: Math.min(100, starsPerRepo * 25), label: 'Star density', color: '#58a6ff' })}
  `;

  return svgDocument({
    width: 680,
    height: 240,
    defs: animatedGradient('accent-gradient'),
    body: createCard({
      width: 680,
      height: 240,
      title: 'GitHub Stats',
      subtitle: 'Live data generated from GitHub REST API',
      content
    })
  });
};

const createLanguagesSvg = (languages) => svgDocument({
  width: 680,
  height: 320,
  defs: animatedGradient('accent-gradient'),
  body: createCard({
    width: 680,
    height: 320,
    title: 'Top Languages',
    subtitle: 'Calculated from repository language byte usage',
    content: languageBars(languages)
  })
});

const createActivitySvg = (monthlyActivity) => svgDocument({
  width: 680,
  height: 300,
  defs: animatedGradient('accent-gradient', '#2ea043', '#58a6ff', '#8957e5'),
  body: createCard({
    width: 680,
    height: 300,
    title: 'Contribution Activity',
    subtitle: 'Public events over recent months',
    content: activityBars(monthlyActivity)
  })
});

const createRepositoryActivitySvg = (repos) => {
  const topRepos = repos
    .slice()
    .sort((a, b) => new Date(b.pushed_at || 0) - new Date(a.pushed_at || 0))
    .slice(0, 5)
    .map((repo) => {
      const score = Math.min(100, ((repo.open_issues_count || 0) * 5) + ((repo.stargazers_count || 0) * 3) + ((repo.forks_count || 0) * 2) + 20);
      return {
        name: repo.name,
        score,
        stars: repo.stargazers_count || 0,
        forks: repo.forks_count || 0
      };
    });

  const rows = topRepos.map((repo, index) => `
    <text class="text sans" x="24" y="${96 + (index * 48)}" font-size="13">${repo.name}</text>
    <text class="muted mono" x="640" y="${96 + (index * 48)}" text-anchor="end" font-size="11">★ ${repo.stars} · ⑂ ${repo.forks}</text>
    ${progressBar({ x: 24, y: 104 + (index * 48), width: 616, value: repo.score })}
  `).join('');

  return svgDocument({
    width: 680,
    height: 340,
    defs: animatedGradient('accent-gradient', '#58a6ff', '#1f6feb', '#2ea043'),
    body: createCard({
      width: 680,
      height: 340,
      title: 'Repository Activity',
      subtitle: 'Recently updated repositories and signal score',
      content: rows || '<text class="muted sans" x="24" y="110" font-size="13">No repositories available.</text>'
    })
  });
};

const fallbackDataset = () => ({
  user: { followers: 0, following: 0 },
  repos: [],
  events: [],
  stars: 0,
  forks: 0,
  contributions: monthBuckets([], 8),
  topLanguages: [
    { label: 'JavaScript', value: 0 },
    { label: 'TypeScript', value: 0 },
    { label: 'PHP', value: 0 },
    { label: 'Vue', value: 0 },
    { label: 'React', value: 0 }
  ]
});

const renderMetrics = async () => {
  const client = createGitHubClient(process.env);
  const username = process.env.GITHUB_USERNAME;

  await mkdir(METRICS_DIR, { recursive: true });

  let dataset;
  try {
    const [user, repos, events] = await Promise.all([
      client.getUser(),
      client.getPublicRepos(),
      client.getRecentEvents()
    ]);
    const stars = repos.reduce((sum, repo) => sum + Number(repo.stargazers_count || 0), 0);
    const forks = repos.reduce((sum, repo) => sum + Number(repo.forks_count || 0), 0);
    const contributions = monthBuckets(events, 8);
    const topLanguages = await computeLanguageDistribution(client, repos);
    dataset = { user, repos, events, stars, forks, contributions, topLanguages };
  } catch (error) {
    process.stderr.write(`Warning: API unavailable, generating fallback metrics. ${error.message}\n`);
    dataset = fallbackDataset();
  }

  const files = [
    ['github-stats.svg', createStatsSvg({ username, user: dataset.user, repos: dataset.repos, stars: dataset.stars, forks: dataset.forks, events: dataset.events })],
    ['languages.svg', createLanguagesSvg(dataset.topLanguages)],
    ['activity.svg', createRepositoryActivitySvg(dataset.repos)],
    ['contribution.svg', createActivitySvg(dataset.contributions)]
  ];

  await Promise.all(files.map(([name, svg]) => writeFile(path.join(METRICS_DIR, name), svg, 'utf8')));

  const summary = {
    repositories: dataset.repos.length,
    followers: dataset.user.followers || 0,
    stars: dataset.stars,
    forks: dataset.forks,
    activityEvents: dataset.events.length,
    totalLanguageSharePercent: sumObjectValues(Object.fromEntries(dataset.topLanguages.map((item) => [item.label, item.value])))
  };

  process.stdout.write(`Metrics generated for @${username}: ${JSON.stringify(summary)}\n`);
};

renderMetrics().catch((error) => {
  process.stderr.write(`Failed to render metrics: ${error.message}\n`);
  process.exitCode = 1;
});
