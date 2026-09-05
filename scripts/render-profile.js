import { mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { svgDocument, animatedGradient, createCard } from './utils/svg.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const BANNERS_DIR = path.join(ROOT_DIR, 'assets', 'banners');
const ANIMATIONS_DIR = path.join(ROOT_DIR, 'assets', 'animations');

const createHeaderSvg = () => svgDocument({
  width: 1200,
  height: 320,
  defs: `${animatedGradient('header-gradient', '#58a6ff', '#1f6feb', '#2ea043')}
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#30363d" stroke-width="1" opacity="0.6"/>
    </pattern>`,
  body: `
    <rect class="bg" x="0" y="0" width="1200" height="320" rx="20" />
    <rect x="0" y="0" width="1200" height="320" fill="url(#grid)" opacity="0.45" />
    <rect x="0" y="0" width="1200" height="6" fill="url(#header-gradient)" class="slide" />
    <text class="heading sans" x="72" y="130" font-size="72" letter-spacing="2">FULL-STACK</text>
    <text class="heading sans" x="72" y="208" font-size="72" letter-spacing="2">ENGINEER</text>
    <text class="accent mono" x="72" y="258" font-size="24">BUILD · SHIP · SCALE</text>
    <g transform="translate(900 60)">
      <rect x="0" y="0" width="240" height="170" rx="14" class="soft" />
      <rect x="16" y="24" width="208" height="10" rx="5" fill="#58a6ff" opacity="0.75"/>
      <rect x="16" y="52" width="170" height="8" rx="4" fill="#2ea043" opacity="0.8"/>
      <rect x="16" y="74" width="190" height="8" rx="4" fill="#58a6ff" opacity="0.6"/>
      <rect x="16" y="96" width="130" height="8" rx="4" fill="#d29922" opacity="0.8"/>
      <circle cx="24" cy="148" r="6" fill="#2ea043" class="pulse"/>
      <text class="muted mono" x="38" y="152" font-size="12">deploy --production</text>
    </g>
  `
});

const createCodingAnimationSvg = () => svgDocument({
  width: 680,
  height: 180,
  defs: animatedGradient('coding-gradient', '#58a6ff', '#2ea043', '#58a6ff'),
  body: createCard({
    width: 680,
    height: 180,
    title: 'Coding Flow',
    subtitle: 'Lightweight SVG animation',
    content: `
      <rect x="24" y="78" width="632" height="72" rx="10" class="soft" />
      <text class="mono text" x="44" y="106" font-size="14">const ship = async () =&gt; {'{'}</text>
      <text class="mono text" x="44" y="128" font-size="14">  await pipeline(test, build, deploy);</text>
      <text class="mono text" x="44" y="150" font-size="14">{'}'};</text>
      <rect x="352" y="137" width="10" height="16" fill="url(#coding-gradient)" class="pulse" />
    `
  })
});

const createActivityAnimationSvg = () => svgDocument({
  width: 680,
  height: 180,
  defs: animatedGradient('activity-gradient', '#2ea043', '#58a6ff', '#2ea043'),
  body: createCard({
    width: 680,
    height: 180,
    title: 'Build Activity',
    subtitle: 'Pipeline heartbeat',
    content: `
      <path d="M24 126 C 120 60, 180 160, 280 108 C 380 56, 470 150, 656 84" stroke="url(#activity-gradient)" stroke-width="4" fill="none"/>
      <circle cx="24" cy="126" r="5" fill="#2ea043" class="pulse" />
      <circle cx="280" cy="108" r="5" fill="#58a6ff" class="pulse" />
      <circle cx="656" cy="84" r="6" fill="#2ea043" class="pulse" />
      <text class="muted mono" x="24" y="154" font-size="12">CI checks • code quality • deployment</text>
    `
  })
});

const createTerminalGifPlaceholder = async (gifPath) => {
  try {
    await access(gifPath);
    return;
  } catch {
    // file does not exist
  }

  const onePixelTransparentGif = Buffer.from('R0lGODlhAQABAIABAP///wAAACwAAAAAAQABAAACAkQBADs=', 'base64');
  await writeFile(gifPath, onePixelTransparentGif);
};

const renderProfileAssets = async () => {
  await mkdir(BANNERS_DIR, { recursive: true });
  await mkdir(ANIMATIONS_DIR, { recursive: true });

  await Promise.all([
    writeFile(path.join(BANNERS_DIR, 'header.svg'), createHeaderSvg(), 'utf8'),
    writeFile(path.join(ANIMATIONS_DIR, 'coding.svg'), createCodingAnimationSvg(), 'utf8'),
    writeFile(path.join(ANIMATIONS_DIR, 'activity.svg'), createActivityAnimationSvg(), 'utf8')
  ]);

  await createTerminalGifPlaceholder(path.join(ANIMATIONS_DIR, 'terminal.gif'));

  process.stdout.write('Profile visuals generated.\n');
};

renderProfileAssets().catch((error) => {
  process.stderr.write(`Failed to render profile visuals: ${error.message}\n`);
  process.exitCode = 1;
});
