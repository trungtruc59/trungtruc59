const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const escapeXml = (text = '') => String(text)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;');

export const baseStyles = () => `
  <style>
    :root { color-scheme: dark; }
    .bg { fill: #0d1117; }
    .muted { fill: #8b949e; }
    .text { fill: #c9d1d9; }
    .heading { fill: #f0f6fc; font-weight: 600; }
    .accent { fill: #58a6ff; }
    .soft { fill: #21262d; }
    .bar-track { fill: #30363d; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; }
    .sans { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; }
    .pulse { transform-origin: center; animation: pulse 4s ease-in-out infinite; }
    .slide { animation: slide 10s linear infinite; }
    .grow { animation: grow 1.2s ease-out; }
    @keyframes pulse { 0%,100% { opacity: .45; } 50% { opacity: 1; } }
    @keyframes slide { 0% { transform: translateX(0); } 100% { transform: translateX(-160px); } }
    @keyframes grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
    @media (prefers-reduced-motion: reduce) {
      .pulse, .slide, .grow { animation: none !important; }
      animate { display: none; }
    }
  </style>
`;

export const svgDocument = ({ width, height, body, defs = '' }) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">GitHub profile metric</title>
  <desc id="desc">Automatically generated profile visual card.</desc>
  <defs>
    ${defs}
  </defs>
  ${baseStyles()}
  ${body}
</svg>`;

export const animatedGradient = (id, from = '#58a6ff', mid = '#1f6feb', to = '#2ea043') => `
  <linearGradient id="${id}" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%" stop-color="${from}">
      <animate attributeName="stop-color" values="${from};${mid};${from}" dur="8s" repeatCount="indefinite"/>
    </stop>
    <stop offset="50%" stop-color="${mid}">
      <animate attributeName="stop-color" values="${mid};${to};${mid}" dur="8s" repeatCount="indefinite"/>
    </stop>
    <stop offset="100%" stop-color="${to}">
      <animate attributeName="stop-color" values="${to};${from};${to}" dur="8s" repeatCount="indefinite"/>
    </stop>
  </linearGradient>
`;

export const createCard = ({ width, height, title, subtitle = '', content }) => `
  <rect class="bg" x="0" y="0" width="${width}" height="${height}" rx="16" />
  <rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="15" fill="none" stroke="#30363d" />
  <text class="heading sans" x="24" y="36" font-size="20">${escapeXml(title)}</text>
  ${subtitle ? `<text class="muted sans" x="24" y="58" font-size="13">${escapeXml(subtitle)}</text>` : ''}
  ${content}
`;

export const statGrid = (stats, { x = 24, y = 90, columns = 2, cellWidth = 280, rowHeight = 60 } = {}) => stats
  .map((item, index) => {
    const row = Math.floor(index / columns);
    const col = index % columns;
    const sx = x + (col * cellWidth);
    const sy = y + (row * rowHeight);
    return `
      <text class="muted sans" x="${sx}" y="${sy}" font-size="12">${escapeXml(item.label)}</text>
      <text class="text mono" x="${sx}" y="${sy + 26}" font-size="22">${escapeXml(item.value)}</text>
    `;
  })
  .join('');

export const progressBar = ({ x, y, width, height = 10, value = 0, fill = 'url(#accent-gradient)', label = '', percentLabel = true }) => {
  const safeValue = clamp(value, 0, 100);
  const barWidth = Math.round((safeValue / 100) * width);
  return `
    ${label ? `<text class="muted sans" x="${x}" y="${y - 8}" font-size="12">${escapeXml(label)}</text>` : ''}
    <rect class="bar-track" x="${x}" y="${y}" width="${width}" height="${height}" rx="${height / 2}" />
    <rect class="grow" x="${x}" y="${y}" width="${barWidth}" height="${height}" rx="${height / 2}" fill="${fill}" style="transform-origin:${x}px ${y + (height / 2)}px" />
    ${percentLabel ? `<text class="muted mono" x="${x + width + 8}" y="${y + height - 1}" font-size="11">${safeValue.toFixed(1)}%</text>` : ''}
  `;
};

export const circularIndicator = ({ cx, cy, radius = 32, value = 0, color = '#58a6ff', label = '', text = '' }) => {
  const safeValue = clamp(value, 0, 100);
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - ((safeValue / 100) * circumference);

  return `
    <circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="#30363d" stroke-width="7" />
    <circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round"
      stroke-dasharray="${circumference.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}" transform="rotate(-90 ${cx} ${cy})" class="pulse" />
    <text class="text mono" x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="13">${escapeXml(text || `${safeValue.toFixed(0)}%`)}</text>
    ${label ? `<text class="muted sans" x="${cx}" y="${cy + 52}" text-anchor="middle" font-size="11">${escapeXml(label)}</text>` : ''}
  `;
};

export const languageBars = (items, { x = 24, y = 84, width = 640, rowGap = 30 } = {}) => {
  let output = '';
  items.forEach((item, index) => {
    const rowY = y + (index * rowGap);
    output += `
      <text class="text sans" x="${x}" y="${rowY}" font-size="13">${escapeXml(item.label)}</text>
      <text class="muted mono" x="${x + width}" y="${rowY}" text-anchor="end" font-size="12">${item.value.toFixed(1)}%</text>
      ${progressBar({ x, y: rowY + 8, width, height: 10, value: item.value, percentLabel: false })}
    `;
  });
  return output;
};

export const activityBars = (items, { x = 24, y = 92, chartHeight = 150, barWidth = 36, gap = 14 } = {}) => {
  const max = Math.max(...items.map((item) => item.value), 1);
  return items
    .map((item, index) => {
      const normalized = item.value / max;
      const height = Math.max(4, Math.round(chartHeight * normalized));
      const bx = x + (index * (barWidth + gap));
      const by = y + (chartHeight - height);
      return `
        <rect class="bar-track" x="${bx}" y="${y}" width="${barWidth}" height="${chartHeight}" rx="6" />
        <rect x="${bx}" y="${by}" width="${barWidth}" height="${height}" rx="6" fill="url(#accent-gradient)" class="pulse" />
        <text class="muted mono" x="${bx + (barWidth / 2)}" y="${y + chartHeight + 16}" text-anchor="middle" font-size="10">${escapeXml(item.label)}</text>
        <text class="text mono" x="${bx + (barWidth / 2)}" y="${by - 6}" text-anchor="middle" font-size="10">${item.value}</text>
      `;
    })
    .join('');
};
