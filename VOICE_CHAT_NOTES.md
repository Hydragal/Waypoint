# Voice chat — starter implementation

## What it does
- **Join / Leave voice**: from a microphone line icon (`#voiceInd`) in the header's Table group, after Music. It's shown only
  while hosting or at a table, and opens a Sound-style popover (`#voicePop`). The icon is a new drawing, so it needs your OK
  as part of the header icon set, and lookcheck's icon count and control order need updating with it.
- **The icon**: a grey mic with two gold arcs per side ((mic)), shown only while connected. They ripple outward while you
  talk; muted or deafened adds a red strike.
- **Quick mute**: right-click the icon, or Ctrl+Shift+M (Discord's shortcut) from anywhere in the app.
- **Mute** your own mic, or **Deafen** (you hear nobody and send nothing).
- **Devices**: a folded "▸ Devices" section with Microphone and Speakers pickers (System default first). It's saved per
  computer, and the mic can switch mid-call without reconnecting. An unplugged or missing device falls back to the default.
  Speakers apply to voice only, via `setSinkId`, and the row is hidden where the browser lacks it.
- **Per-person mute and volume** (0–100%): only on your own machine, saved in localStorage by profile id.
- **Open mic or Push to talk**: the default key is **V**, rebindable to any key or a mouse side button. It is ignored while typing in a text box or holding Ctrl.
- **Speaking lights** for each person, plus a green ring on the chip while your own mic is sending.

## How it works
The host is the hub. Each player in voice has **one WebRTC connection to the host**, signalled over the table's existing PeerJS
data connection (new message types `voice` host→player and `voice-up` player→host). This is the same approach the video showing
uses. The host always offers, so the two sides never offer at the same time. A player's mic goes up on the first audio line. The
host forwards every other voice down on its own line, and an offer's `who` map (mid → profile) names each line. When someone
leaves, their line is reused, so the session description stays bounded. Bandwidth is capped at about 40 kbps per forwarded voice.

## Files
| File | Change |
|---|---|
| `system/app/scripts/voicecore.js` | **new**: pure helpers (message cleaners, settings, words) |
| `system/app/scripts/voice.js` | **new**: the hub, the player link, push-to-talk, the panel |
| `system/app/scripts/net.js` | `net.rtcConfig()`; `voice` / `voice-up` dispatch branches; hooks on conn close, leave, end and snapshot |
| `system/app/index.html` | two `<script type="module">` tags; `#voiceInd` in the header's Table group; the `#voicePop` popover |
| `system/app/style.css` | the icon's states and the popover (after `#soundInd` / `#soundPop`) |
| `system/resources/app/shellguard.js` | `permOk` grants a `media` request **only** when it is for the microphone alone (`details.mediaTypes = ['audio']`) |

## Status
Tested in a browser with three frames: a GM and two players, fake tone mics, a simulated data channel. Join, relayed audio in
all directions, self-mute, deafen, push-to-talk, per-person mute and volume, and leave/rejoin all worked.

Then tested in the real app on two dev servers: a GM on :3999 hosting the Tutorial, and a player on :4001 with its own saves
folder, joined over PeerJS. Joining and voice links on both sides, quick mute, and device picking and switching all worked.
Mic switching mid-call is verified by WebRTC stats: the sender carries the new live track, and packets keep arriving.

**Not yet tested:** real machines over the internet or a TURN relay, and the packaged Electron app. The silent test tone (10 Hz)
is stripped by Opus, so actually *hearing* the far side needs a real call.

## Your test suite (Node 24, all 28 suites from checks.yml)
On 1.5.8 untouched, everything passes. With this branch, 25 suites pass and 3 fail, all on purpose-built guardrails that need your call:
- **netcheck: 8 failures.** It pins the host's message branches and send sites. Voice adds the `voice` / `voice-up` branches and
  hooks, so its expectations need updating to allow them.
- **lookcheck: 1 failure.** "The top row, nothing is gone" pins the header's controls and their order, and `#voiceInd` is new.
  The mic drawing also needs your OK as part of the icon set: a grey mic with two gold arcs per side, shown while connected.
- **updatercheck: 1 failure.** `shellguard.js` changed, so the core hash (`node tools/shellrev.js`) and `SHELL_WANTED` /
  `MIN_SHELL` need the release version you pick. This was left alone deliberately.

## To do / open questions
- `shellguard.js` is in the Electron shell, so it needs an installer release (`MIN_SHELL` in `tools/release.js`). Until then the
  installed app refuses the microphone. The dev server in a browser works without it.
- `tools/servercheck.js` still passes as written (it never passes `details`), but it has no case for the mic-only grant yet.
- No `netcheck` markers or a `voicecheck.js` yet.
- Possible VTT feature toggle (`wpVtt.on('voice')`), and Help / tutorial text.
- Push-to-talk only works while Waypoint is the focused window. A global hotkey would need the main process (`globalShortcut`).
- Per-person volume tops out at 100%: playback uses `<audio>` elements so Chromium's echo cancellation applies.
- Possible later addition: the GM muting a player for everyone.
- Planned (not started): proximity voice, where the GM toggles it and players hear only players near their tokens; a hard
  cutoff, with the GM always in range.
