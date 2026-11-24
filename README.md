# Pranelyx

Pranelyx is an age-aware planner for meals, movement, and routines. It includes meal-by-meal tracking, exercise guides, a weekly view, a local agenda, a daily feeling check-in, and optional cloud backups.

**Staging demo** [daily-grove-wellness.spacestest.com](https://daily-grove-wellness.spacestest.com/?v=pranelyx)

**Pronunciation** Prah-neh-licks

**Tagline** Every age. Every stage. Every you.

The name combines *prana*, Sanskrit for life energy, with the modern suffix *lyx*. The visual identity uses sage green, ivory, deep forest green, and a leaf crossed by a flowing line.

## Run it locally

Use Node.js 24 and npm 11. Install the pinned dependencies and start the Cloudflare Worker on a local port.

```sh
npm ci
npm test
npm run dev -- --port 8723
```

Open `http://localhost:8723`. Local SQLite is managed by Wrangler. The learning card displays its CDC fallback without the DeepSpace runtime bindings. Chrome accepts Secure cookies set by localhost for local testing.

## Pages

Pranelyx uses separate URLs for the homepage, daily plan, agenda, check-in, and coaching. The Worker serves a shared frontend shell for each page, and the browser opens the corresponding view. The check-in offers gentle home-care ideas and a Bhramari-inspired humming breath exercise. Feeling selections are scoped to the active profile and date, saved locally, and excluded from cloud backups.

## Try the core journey

1. Create a profile with an age group, diet, and a movement style. Pick yoga if you want to see Sanskrit and English exercise names.
2. Check off breakfast, open an exercise guide, and add a routine suggestion to the day's agenda.
3. Switch days and return. The check and agenda item are scoped to the first day. Reload to verify the browser saved them.
4. Open **Back up your profiles** and select **Save a backup**. Restore it in the same browser to see the persisted data. A newer cloud revision prevents a stale tab from overwriting it.
5. Open **Learn about physical activity** to see the DeepSpace integration or its CDC fallback. Delete the online backup when you finish testing if desired.

## Architecture and data model

| Layer | Files | Responsibility |
| --- | --- | --- |
| Frontend | `public/index.html`, `public/style.css`, `public/app.js` | Profile form, age themes, date selection, daily planner, progress tracking and local state |
| Planning | `public/preferences.js`, `public/menu-rotation.js`, `public/routine.js`, `public/exercise-guides.js` | Deterministic meal, routine and exercise choices, plus readable exercise instructions |
| Agenda and cloud UI | `public/agenda.js`, `public/cloud-tools.js` | Tasks, events, calendar import, backup actions, and learning card |
| Backend | `worker.js`, `server/backup.js`, `wrangler.toml` | DeepSpace-hosted Worker routing, payload allowlist and validation, SQLite transactions, cookie boundaries, integration cache |

The frontend stores a device's profiles, progress, and agenda in local storage and uses session storage to remember the open profile. Plans are calculated from profile settings and the selected date. A profile ID links date-keyed progress and manual agenda items. Checkbox state is independent from the generated meal text.

The Worker exposes `GET`, `PUT`, and `DELETE /api/backup`. The first successful save issues a cryptographically random, host-only, Secure, HttpOnly, SameSite cookie. It selects an isolated SQLite-backed Durable Object. Each object stores one snapshot with a revision and update timestamp. A size limit, field allowlist, same-origin mutation check, and atomic revision comparison protect writes. Deleting clears the payload and retains its revision so old tabs cannot accidentally overwrite newer data. A backup includes profiles, progress, and manually added agenda items. Imported calendars stay local. Restoring an existing backup asks before replacing the local profile snapshot.

This is a device-scoped backup, with no user-account login or automatic synchronization. This design keeps the existing planner useful offline and limits the scope of the cloud data path. It also means losing the device cookie loses access to its backup. A production release should add authenticated ownership, retention controls, and recovery before relying on it as the only copy.

## DeepSpace capabilities and integration

- DeepSpace hosts the Worker and supplies the SQLite Durable Object migration. The existing plain JavaScript frontend stayed in place, so adding persistence preserved existing browser profiles and kept the build small.
- `GET /api/learn` calls DeepSpace McAPI's `wikipedia/get-page-summary` for a single fixed physical activity topic. No user fields go to the provider. A shared Durable Object permits at most one upstream attempt per week, including failure. Only the Worker sees the runtime token. Healthy cache entries are reusable, and the CDC fallback is available when the proxy is unavailable.
- The coach finder opens a Google Maps search and the planner reads local iCalendar files. These are existing features and do not count as DeepSpace integrations. Live Google Calendar would require user OAuth and should be added once authenticated profiles and provider consent are available. Extra integrations were deferred to keep the planner and backup reliable.

The implementation follows the official quickstart's Worker, durable storage, commit, and deployment workflow. It uses the documented raw Worker path to preserve the existing frontend rather than switching the application to the React scaffold. [DeepSpace quickstart](https://docs.deep.space/get-started/quickstart) · [Raw app publishing](https://docs.deep.space/agents/direct-publish) · [Integration proxy](https://docs.deep.space/guides/external-apis)

## Test commands

```sh
npm test
node tests/hosted-smoke.mjs https://daily-grove-wellness.spacestest.com
```

The automated tests run actual SQLite queries on Node 24 with a small Durable Object adapter and stub the upstream API. The hosted smoke test creates synthetic data, checks read-after-write, cookie isolation, malformed and conflicting writes, cross-origin rejection, and integration availability, then deletes the synthetic payload. Set `NODE_USE_ENV_PROXY=1` if your environment routes Node HTTPS through a configured proxy.

## DeepSpace deployment and GitHub submission

Use the pinned staging CLI and run `npx deepspace auth whoami` before deploying. This app uses an existing staging app ID. To update that deployment, use a synchronized clone and the authorized staging credential configured **outside** the repository. Keep `DEEPSPACE_ENV=staging` set during staging commands.

```sh
npm ci
npm test
npx deepspace auth whoami
git status --short
npx deepspace deploy
```

Commit changes before deploying a DeepSpace-managed checkout. This repository can be submitted to GitHub as a review copy. The hosted app remains DeepSpace-source managed. Deploying from a separate account or app requires registering a new app ID and choosing an available name rather than reusing the staging identity. Follow the official login and source ownership instructions for that new app. Keep any auth file, operator credentials, or generated `.dev.vars` outside tracked source. [DeepSpace source control](https://docs.deep.space/guides/source-control) · [Staging CLI setup](https://docs.deep.space/agents/start)

## Live coding walkthrough

- To add a dietary option or change its rotation, start with `extraMenus` and `dailyMeals`. Goal-specific changes are in `tailorMeals`.
- For a new exercise, add the exercise name to its workout in `movementFor` and give that exact key a description, steps, and benefits in `exercise-guides.js`.
- To change how a routine adapts, edit `dailyRoutine`. It returns morning, midday, and evening rows with goal and activity suggestions.
- To add an agenda field to backups, update its browser shape and `normalizeBackup`. Add a round-trip test. Avoid logging snapshot content.
- To explain a conflict, trace `setupBackup` → `PUT /api/backup` → SQLite revision comparison → HTTP 409. The browser keeps its current data and can explicitly restore.

The next priorities are account-backed ownership and cross-device recovery, followed by consent-based calendar sync. Coach search currently hands off to Google Maps. Booking, payments, and provider availability are future work.
