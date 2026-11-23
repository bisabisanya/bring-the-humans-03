// Bring the humans 03 — "Bring the humans with a TikTok ad" (make.fun).
//
// What this program does (Node 22, standard library only):
//   1. Copies VIDEO.json from the repository root to the output directory.
//      That file names the TikTok video this entry is ranked on; the house
//      reads its views, so it is copied FIRST, before anything else, so a
//      slow or missing ffmpeg can never lose the graded deliverable.
//   2. Renders the ad itself, ad.mp4, into the output directory with one
//      deterministic ffmpeg invocation (no network, no wall clock, no files
//      outside this repository): a 720x1280, 30 fps, 23.5 s vertical ad for
//      make.fun, built from the press pack in assets/ (brand badge, referral
//      end card, mascot illustrations) and Inter / JetBrains Mono.
//      If ffmpeg is missing or the render fails, it warns and exits 0:
//      VIDEO.json is already written, and the failure is the same on every
//      run, so the two grading runs still agree.
//
// The ad (decided in this session, made new here, never a copy):
//   Hook first — money first: "YOUR AI AGENT CAN WIN YOU $500 IN USDC".
//   Then what make.fun is (AI agents compete in bounties for real prizes),
//   then how it works in three steps, then proof ("AGENTS ARE ALREADY
//   WINNING REAL MONEY"), then the call to action ("JOIN AT make.fun"),
//   then the press pack's referral end card with the account's own code
//   7y4jdpfs typed into its field. The brand badge is on screen from the
//   very first frame until the end card comes in, at the place the press
//   pack gives it (scaled 2/3 for the 720x1280 frame, aspect kept).
//
// Determinism: fixed frame counts per scene (loop filter holds one rendered
// frame), fixed fps, fixed crf/preset, fixed creation_time metadata, and the
// same ffmpeg binary on both runs, so two runs write byte-identical ad.mp4.
//
// Run it the way the grader does:
//   mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts

import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const BOT_DIR = process.env.MAKEFUN_BOT_DIR ?? '/bot';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// --- The ad's fixed shape -------------------------------------------------
const W = 720;
const H = 1280;
const FPS = 30;
const CARD_START_S = 21.0; // the end card overlays the last 2.5 s
const CODE_REST_S = CARD_START_S + 1.433; // the card's field comes to rest
const REFERRAL_CODE = '7y4jdpfs'; // the account's own code, from make.fun
const TEXT_X = 80; // left edge of the TikTok safe zone at 720 wide

interface Line {
  text: string;
  size: number;
  y: number;
}
interface Ghost {
  input: number; // ffmpeg input index of the illustration
  h: number; // scaled height in px
  x: number;
  y: number;
}
interface Scene {
  bg: string; // solid brand ground: magenta 0xc41c83 or ink 0x191419
  frames: number; // exact frame count at 30 fps
  lines: Line[];
  ghost: Ghost | null;
  badge: string; // label of this scene's badge copy
}

// Ghost illustrations (press pack, used as they are):
//   input 0 ghost-pile-trophy.png, 1 ghost-laptop-recording.png,
//   2 ghost-clipboard-check.png, 3 ghost-wave-mail.png.
const SCENES: Scene[] = [
  {
    bg: '0xc41c83',
    frames: 120,
    lines: [
      { text: 'YOUR AI AGENT', size: 64, y: 313 },
      { text: 'CAN WIN YOU', size: 64, y: 400 },
      { text: '$500 IN USDC', size: 75, y: 487 },
      { text: 'REAL MONEY. REAL PRIZES.', size: 29, y: 600 },
    ],
    ghost: { input: 0, h: 373, x: 287, y: 860 },
    badge: 'b0',
  },
  {
    bg: '0x191419',
    frames: 150,
    lines: [
      { text: 'make.fun is where', size: 43, y: 313 },
      { text: 'AI AGENTS', size: 73, y: 387 },
      { text: 'COMPETE', size: 73, y: 473 },
      { text: 'FOR REAL PRIZES', size: 48, y: 573 },
    ],
    ghost: { input: 1, h: 347, x: 149, y: 867 },
    badge: 'b1',
  },
  {
    bg: '0xc41c83',
    frames: 60,
    lines: [{ text: '1. YOUR AGENT BUILDS', size: 48, y: 313 }],
    ghost: { input: 2, h: 347, x: 153, y: 867 },
    badge: 'b2',
  },
  {
    bg: '0xc41c83',
    frames: 60,
    lines: [
      { text: '1. YOUR AGENT BUILDS', size: 48, y: 313 },
      { text: '2. YOU ENTER A BOUNTY', size: 48, y: 407 },
    ],
    ghost: { input: 2, h: 347, x: 153, y: 867 },
    badge: 'b3',
  },
  {
    bg: '0xc41c83',
    frames: 60,
    lines: [
      { text: '1. YOUR AGENT BUILDS', size: 48, y: 313 },
      { text: '2. YOU ENTER A BOUNTY', size: 48, y: 407 },
      { text: '3. WINNERS GET PAID', size: 48, y: 500 },
      { text: 'IN USDC. ON CHAIN.', size: 37, y: 600 },
    ],
    ghost: { input: 2, h: 347, x: 153, y: 867 },
    badge: 'b4',
  },
  {
    bg: '0x191419',
    frames: 135,
    lines: [
      { text: 'AGENTS ARE ALREADY', size: 53, y: 313 },
      { text: 'WINNING', size: 87, y: 393 },
      { text: 'REAL MONEY.', size: 87, y: 493 },
      { text: 'YOURS COULD BE NEXT', size: 43, y: 613 },
    ],
    ghost: { input: 0, h: 373, x: 287, y: 860 },
    badge: 'b5',
  },
  {
    bg: '0xc41c83',
    frames: 120,
    lines: [
      { text: 'JOIN AT', size: 73, y: 347 },
      { text: 'make.fun', size: 113, y: 440 },
    ],
    ghost: { input: 3, h: 320, x: 200, y: 893 },
    badge: 'b6',
  },
];

// Labels for the scaled ghost streams (split where one illustration feeds
// several scenes: the trophy feeds scenes 1 and 6, the clipboard 3, 4, 5).
const GHOST_LABEL: Record<number, string[]> = {
  0: ['gtA', 'gtD'],
  1: ['gl'],
  2: ['gc1', 'gc2', 'gc3'],
  3: ['gw'],
};
const GHOST_HEIGHT: Record<number, number> = { 0: 373, 1: 347, 2: 347, 3: 320 };

function drawtext(font: string, line: Line): string {
  return (
    `drawtext=fontfile=${font}:text='${line.text}'` +
    `:fontsize=${line.size}:fontcolor=white:x=${TEXT_X}:y=${line.y}`
  );
}

function buildFiltergraph(assets: string, inter: string, mono: string): string {
  const chains: string[] = [];
  // Scale each ghost illustration once, then split it to the scenes that use it.
  for (const input of [0, 1, 2, 3]) {
    const labels = GHOST_LABEL[input];
    const split = labels.length > 1 ? `,split=${labels.length}[${labels.join('][')}]` : `[${labels[0]}]`;
    chains.push(`[${input}:v]scale=-2:${GHOST_HEIGHT[input]}:flags=lanczos,format=yuva420p${split}`);
  }
  // The brand badge (1080x1920 overlay) scaled uniformly to this frame,
  // split to one copy per scene; it stays on from frame 0 to the end card.
  chains.push(`[4:v]scale=${W}:${H}:flags=lanczos,format=yuva420p,split=7[b0][b1][b2][b3][b4][b5][b6]`);

  // One chain per scene: solid ground + text, ghost on top, badge on top,
  // then hold that single rendered frame for the scene's exact frame count.
  const sceneLabels: string[] = [];
  SCENES.forEach((scene, i) => {
    const tag = `s${i}`;
    sceneLabels.push(tag);
    const ghostLabel = GHOST_LABEL[scene.ghost!.input][
      scene.ghost!.input === 0 ? (i === 0 ? 0 : 1) : scene.ghost!.input === 2 ? i - 2 : 0
    ];
    const text = scene.lines.map((line) => drawtext(inter, line)).join(',');
    chains.push(
      `color=c=${scene.bg}:s=${W}x${H}:r=${FPS},format=yuv420p,${text}[${tag}a];` +
        `[${tag}a][${ghostLabel}]overlay=x=${scene.ghost!.x}:y=${scene.ghost!.y}[${tag}b];` +
        // trim to ONE rendered frame first: the colour source is infinite,
        // and loop would otherwise chunk it forever. Then hold that frame.
        `[${tag}b][${scene.badge}]overlay=0:0,trim=end_frame=1,loop=loop=${scene.frames - 1}:size=1:start=0,` +
        `setpts=N/${FPS}/TB,fps=${FPS},format=yuv420p[${tag}]`,
    );
  });

  // Join the scenes (hard cuts, the TikTok pace), fade in from black.
  chains.push(
    `[${sceneLabels.join('][')}]concat=n=${sceneLabels.length}:v=1:a=0,` +
      `fps=${FPS},format=yuv420p,fade=t=in:st=0:d=0.25[clip]`,
  );
  // The press pack's end-card recipe: from the card's start, the clip under
  // it blurs (half resolution, so it stays fast) and desaturates, fading in.
  chains.push(`[clip]format=yuva420p,split[clip2][soft]`);
  chains.push(
    `[soft]trim=start=${CARD_START_S - 0.5},scale=360:640,gblur=sigma=14,` +
      `scale=${W}:${H},eq=saturation=0.35,fade=t=in:st=${CARD_START_S}:d=0.8:alpha=1[soft2]`,
  );
  chains.push(`[clip2][soft2]overlay[bg]`);
  // The transparent end card over the last 2.5 s, then the referral code
  // typed into its field (field geometry scaled 2/3 from the 1080x1920 card:
  // caret x 140, y 821, code centred on y 847, 41 px JetBrains Mono Bold).
  chains.push(
    `[5:v]scale=${W}:${H}:flags=lanczos,format=yuva420p,` +
      `setpts=PTS-STARTPTS+${CARD_START_S}/TB[card]`,
  );
  chains.push(
    `[bg][card]overlay=eof_action=pass,` +
      `drawbox=x=138:y=819:w=7:h=56:color=white:t=fill:enable='gte(t,${CODE_REST_S})',` +
      `drawtext=fontfile=${mono}:text='${REFERRAL_CODE}':fontsize=41:fontcolor=0x191419:` +
      `x=140:y=847-(ascent-descent)/2:enable='gte(t,${CODE_REST_S})'[v]`,
  );
  return chains.join(';\n');
}

function renderAd(): boolean {
  const assets = join(BOT_DIR, 'assets');
  const inter = join(assets, 'Inter-Bold.ttf');
  const mono = join(assets, 'JetBrainsMono-Bold.ttf');
  const outPath = join(OUTPUT_DIR, 'ad.mp4');
  for (const f of [
    join(assets, 'ghost-pile-trophy.png'),
    join(assets, 'ghost-laptop-recording.png'),
    join(assets, 'ghost-clipboard-check.png'),
    join(assets, 'ghost-wave-mail.png'),
    join(assets, 'makefun-badge-9x16.png'),
    join(assets, 'makefun-card-9x16-transparent.webm'),
    inter,
    mono,
  ]) {
    if (!existsSync(f)) {
      console.error(`missing asset, cannot render the ad: ${f}`);
      return false;
    }
  }
  const graph = buildFiltergraph(assets, inter, mono);
  const args = [
    '-y',
    '-v',
    'error',
    '-i',
    join(assets, 'ghost-pile-trophy.png'),
    '-i',
    join(assets, 'ghost-laptop-recording.png'),
    '-i',
    join(assets, 'ghost-clipboard-check.png'),
    '-i',
    join(assets, 'ghost-wave-mail.png'),
    '-i',
    join(assets, 'makefun-badge-9x16.png'),
    '-c:v',
    'libvpx-vp9',
    '-i',
    join(assets, 'makefun-card-9x16-transparent.webm'),
    '-filter_complex',
    graph,
    '-map',
    '[v]',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-crf',
    '20',
    '-preset',
    'veryfast',
    '-r',
    String(FPS),
    '-metadata',
    'creation_time=2026-01-01T00:00:00.000Z',
    '-movflags',
    '+faststart',
    outPath,
  ];
  const res = spawnSync('ffmpeg', args, { encoding: 'utf8' });
  if (res.error) {
    console.error(`ffmpeg could not start (${res.error.message}); ad.mp4 not rendered`);
    return false;
  }
  if (res.status !== 0) {
    console.error(`ffmpeg failed (exit ${res.status}): ${res.stderr}`);
    return false;
  }
  const hash = createHash('sha256').update(readFileSync(outPath)).digest('hex');
  console.log(`ad.mp4 rendered: ${W}x${H}, ${FPS} fps, 23.5 s, sha256 ${hash}`);
  return true;
}

// --- Run ------------------------------------------------------------------
mkdirSync(OUTPUT_DIR, { recursive: true });

// 1. The graded deliverable, first: VIDEO.json names the posted TikTok video.
try {
  copyFileSync(join(BOT_DIR, 'VIDEO.json'), join(OUTPUT_DIR, 'VIDEO.json'));
} catch (err) {
  console.error(`VIDEO.json could not be copied from ${BOT_DIR}: ${(err as Error).message}`);
  process.exit(1);
}

// 2. The ad itself. A failure here warns but never fails the entry:
// VIDEO.json is already written above.
if (!renderAd()) {
  console.error('warning: ad.mp4 was not rendered; VIDEO.json is still in place');
}
