# dsh-museum-guide

Museum guide writer for [DeepSeek Harness](https://github.com/deepseek-ai): give it a museum name and it writes a 22,000-character, hall-by-hall, read-aloud tour script — with a route map, per-hall walkthrough videos, and a hard character-count audit.

[中文说明](#中文说明)

## What it does

- **Map first.** The agent records the official floor plan / brochure layout (`floors`, `rooms`, `stops`) before writing. The panel shows the visit route in order — click a stop and its full script appears on the right.
- **Hall-by-hall writing.** One section per hall or exhibition chapter, exhibit-centred storytelling, all-ages, read-aloud.
- **Hard rules.** No interactive gimmicks, no closing summary, opening ≤ 1,200 characters (≈5 minutes).
- **Length audit.** Target 22,000 characters, floor 20,000; the audit counts characters deterministically, flags a missing map, a summary-style ending, interactive text, or a short script, and reports exactly how much is still missing.
- **Per-hall videos.** Each hall can carry Bilibili / Xiaohongshu / Douyin / Kuaishou / Video Account links; only real, openable URLs.
- **Route map + reader.** The Map tab lists stops 01, 02, 03… in walking order, grouped by floor; clicking a stop shows that hall’s text immediately, with text-to-speech playback in the browser.
- **Speech.** Read the selected hall aloud with the browser’s speech synthesis (zh-CN), pause/resume/stop.

## Install

```sh
dsh plugin add github:femnn/dsh-museum-guide
```

Or from a local checkout:

```sh
dsh plugin add link:/path/to/dsh-museum-guide
```

No build step, no API key. Speech uses the browser’s built-in voice; research uses the Harness web tools and the agent’s own search.

## Use

1. Open the “博物馆导游辅助器” panel from the left sidebar.
2. Type a museum name and press 建档 — the start prompt is copied automatically.
3. Paste it into the chat: the agent records the map, researches the web plus Xiaohongshu / Douyin / Kuaishou / Video Account / Bilibili, writes hall by hall, attaches videos, and runs the audit until it passes.
4. Read the result in the panel: Map tab (route + reader + speech), Script tab (all sections, click anywhere to expand), Details (counts and checks).

There is also a `museum-guide` skill (`~/.dsh/skills/museum-guide/SKILL.md`) that runs the whole pipeline from a single museum name.

## Data

- Projects: `~/.dsh/museum-guide/projects/<id>.json` (override with `dataDir`)
- Exports: `~/.dsh/museum-guide/exports/<id>-<museum>.md`
- Uploaded floor-plan photos: `~/.dsh/museum-guide/maps/`

## Limits

- The panel does not call an LLM itself; writing runs in the chat, where the Harness model and search live. One paste is required unless you wire a model into the plugin.
- Social platforms are searched through their indexed public pages; login-only content is recorded as “title/summary only”, never invented.
- The drawn map is a schematic based on official space IDs and visit order. Upload a photo of the official brochure for the real plan.

## 中文说明

给一座博物馆，产出一条能直接照读的讲解逐字稿：先定导览图与参观路线，再按展厅写，最后用确定性字数审核卡住下限。

- 左侧栏「博物馆导游辅助器」：参观路线 01、02、03… 点一站，右侧立刻显示这一站的全部文字，可朗读。
- 目标 22000 字、下限 20000 字；没有地图、结尾写总结、出现互动、开场过长都会判不合格。
- 每厅可挂 B站/小红书/抖音/快手/视频号讲解视频，只挂真实链接。
- 现场拍的官方导览图照片可直接上传，显示在地图上方。

MIT License.
