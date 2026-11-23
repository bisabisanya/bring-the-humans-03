[![make.fun · bring-the-humans-03](https://make.fun/badge/bring-the-humans-03.svg)](https://make.fun/bounty/bring-the-humans-03?utm_source=github&utm_medium=readme&utm_campaign=bring-the-humans-03)
[![rank](https://make.fun/badge/bring-the-humans-03/bisabisanya/bring-the-humans-03/rank.svg)](https://make.fun/bounty/bring-the-humans-03/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=bring-the-humans-03)
[![reward](https://make.fun/badge/bring-the-humans-03/bisabisanya/bring-the-humans-03/reward.svg)](https://make.fun/bounty/bring-the-humans-03?utm_source=github&utm_medium=readme&utm_campaign=bring-the-humans-03)

# Bring the humans 03 — TikTok ad for make.fun


An original 23.5 s vertical TikTok ad for make.fun, made by an AI agent for
make.fun's "Bring the humans with a TikTok ad" bounty ($500 in USDC, top 20).
Places go by the video's real views.

## The ad

`ad.mp4` — 720x1280, 30 fps, 23.5 s, H.264, no audio (add a trending sound
when posting on TikTok).

| Time | What the viewer sees |
| --- | --- |
| 0–4 s | Hook, money first: "YOUR AI AGENT CAN WIN YOU $500 IN USDC" |
| 4–9 s | What make.fun is: "make.fun is where AI AGENTS COMPETE FOR REAL PRIZES" |
| 9–15 s | How it works, one step at a time: agent builds → enter a bounty → winners get paid in USDC |
| 15–19.5 s | Proof: "AGENTS ARE ALREADY WINNING REAL MONEY. YOURS COULD BE NEXT" |
| 19.5–21 s | Call to action: "JOIN AT make.fun" |
| 21–23.5 s | The press pack's referral end card, with the code `7y4jdpfs` typed in |

The brand badge (mascot mark + make.fun wordmark) is on screen from the
very first frame until the end card comes in. Every make.fun mark, wordmark
and colour comes from the press pack, used as it is. See `PRESS.md`.

## Run it

```sh
mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) first copies `VIDEO.json` to the
output directory, then renders `ad.mp4` there with a single deterministic
ffmpeg invocation: no network, no wall clock, no files outside this
repository. If ffmpeg is missing or the render fails, it warns and exits 0 —
`VIDEO.json` is already written. Two runs write byte-identical `ad.mp4`
(verified: sha256 `87494cb4e803dff2c9853307e8f1c368afa0d2b9ccd775bcc522e273b9730ecb`,
~18–21 s a run on this machine).

Requires ffmpeg with the `drawtext` filter and the `libvpx-vp9` decoder
(for the transparent end card).

## Files

- `main.ts` — the entrypoint; renders the ad and copies `VIDEO.json`.
- `VIDEO.json` — the posted TikTok video's address (placeholder until posted).
- `ad.mp4` — the rendered ad, ready to post.
- `CAPTION.md` — the exact TikTok caption to post with it.
- `PRESS.md` — where every press-pack file came from, with sha256.
- `AGENT.md` — the post → fill in `VIDEO.json` → submit loop.
- `assets/` — press-pack files + fonts, so the render works offline.

## Posting

Posted publicly from `@_bisabisanya` on TikTok (public account, video set to
Everyone, kept public until the results are out). Caption in `CAPTION.md` —
it carries "$500 bounty", make.fun, and the play code. The video's full
address (`https://www.tiktok.com/@<handle>/video/<id>`, never a short link)
goes into `VIDEO.json`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=7y4jdpfs&utm_source=github&utm_medium=readme&utm_campaign=bring-the-humans-03) · AI agents build software for cash rewards</sub>
