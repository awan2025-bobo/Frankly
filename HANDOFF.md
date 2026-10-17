# Handoff

Update this before you stop working, then commit and push. Newest status at the top of each section.

**Every commit adds a line to the Change log at the bottom**, in the same commit, so the other Claude knows what happened.

_Last updated: Sat Oct 17, 2026, 2:15 AM by Rick's Claude._

## Who owns what

| Area | Owner |
| --- | --- |
| Screens / UI | Rick |
| Supabase, Kroger API, data | Partner (`awan2025-bobo`) |

Change this table if you swap areas.

## Done

- Repo created by partner (`awan2025-bobo/Frankly`) with README, Node `.gitignore` and MIT license.
- Rick cloned it to `C:\Users\ricar\Frankly` and pushed a test edit to `README.md`.
- Stack chosen (see `CLAUDE.md`).
- Added `CLAUDE.md` and this file.
- Rough product idea, chosen track (Cook Smarter) and judging rubric saved in `docs/IDEA.md`.

## In progress

- README push test: **partner still needs to pull, edit `README.md`, commit and push**, then Rick pulls. If both edits show up on both laptops, the setup works.

## Next (before coding starts)

- [ ] Partner: README push test (above).
- [ ] Rick: create the second Supabase project (West US region), save the DB password, invite partner under Organization → Team, note the Project URL and anon key.
- [ ] Claude Console: add ~$10 credit, **set a spend limit**, create an API key for this project.
- [ ] Rick: sign up at developer.kroger.com (account only; app setup happens during the build, with teaching).
- [ ] Both: expo.dev account, Expo Go on phones, Node v20+ on laptops (`node -v`).
- [ ] Both: Devpost accounts, register for DubHacks 2026.
- [ ] Share keys in one private chat between the two of you.

## Next (once the hackathon starts)

- [ ] **Waiting on the MVP document** from the team. Don't build until it arrives. Then: one-shot the first demo version from it.
- [ ] Create the Expo app in this repo and fill in "Run the app" in `CLAUDE.md`.
- [ ] Add `.env.example` with variable names only.
- [ ] Kroger Edge Function (teach Rick step by step, see `CLAUDE.md`).

## Known bugs

None yet.

## Env vars

None yet. List names here (never values) as they're added to `.env.example`.

## Change log

Newest first. Format: `date time — who — what changed (and anything the other Claude must know)`.

- Oct 17 2:15 AM — Rick's Claude — Added `docs/IDEA.md` (rough idea, Cook Smarter track, rubric, open questions). Updated `CLAUDE.md` with the track and the change-log rule. Nothing built yet; waiting on the MVP doc.
- Oct 17 ~2:00 AM — Rick's Claude — Added `CLAUDE.md` and `HANDOFF.md`.
- Oct 17 ~1:00 AM — Rick — README push test.
