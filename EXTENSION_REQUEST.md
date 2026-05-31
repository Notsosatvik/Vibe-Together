# Spotify Extension Request — VibeTogether

> **🚨 IMPORTANT — Read this before doing anything else. (Updated 2026-05-31.)**
>
> The "Extension Request" / "Quota Extension Request" tab in the Developer
> Dashboard **no longer exists** for new apps. Spotify changed the process on
> **May 15, 2025**: the in-dashboard tab is gated behind a separate **Partner
> Application** (a Google Form), and the form only accepts:
>
>   - **Organizations / companies** — not individuals
>   - **250,000+ MAUs** already on the app
>   - A **company email** address (Gmail will be rejected)
>
> VibeTogether as it stands today (solo developer, Gmail, hobby project, zero
> MAUs) **does not qualify** for the Partner Application. Until the
> Partner Application is approved, the Settings → "Quota Extension Request"
> tab is invisible on the app's dashboard page.
>
> **Practical reality:** stay in **Development Mode** and use the
> **User Management** allowlist (up to 25 Spotify accounts) to give friends
> and beta testers access. That tab DOES exist on every new app today, and
> the rest of this document still applies if/when VibeTogether later
> incorporates and hits the MAU threshold.
>
> The Partner Application form (only useful if you've incorporated and have
> 250K+ MAUs):
> <https://docs.google.com/forms/d/1O87xdPP1zWUDyHnduwbEFpcjA57JOaefCgBShKjAqlo>
>
> Spotify's own documentation describing this new flow:
> <https://developer.spotify.com/documentation/web-api/concepts/quota-modes>

---

This document is the source of truth for the Extension Request submission
(formerly called "Quota Extension" / "Production Mode"). It contains the
copy you'll paste into Spotify's form, the per-scope justification reviewers
look for, and a screen-recording checklist.

You ultimately have to click "Submit" yourself at
<https://developer.spotify.com/dashboard> → your app → **Settings → Quota
Extension Request** (only visible *after* a Partner Application has been
approved — see the warning box above), because Spotify requires the
*registered owner* of the app to send it. Everything below is so you can
do that submission in roughly 15 minutes without thinking, on the day the
tab finally appears.

> **Status: 2026-05-31** — Everything in this repo is ready. Before submitting:
> 1. Edit `web/lib/legal.ts` if the defaults aren't right (operator name = your
>    legal name, contact email = something you actually read, jurisdiction =
>    your country/state).
> 2. Make sure the latest commit is deployed on Vercel and Railway so the
>    `/privacy`, `/terms`, `/spotify-disclosure`, `/cookies` URLs render live.
> 3. Record the screen capture per the checklist at the bottom of this file.

---

## 0. App identity (top of the Spotify form)

| Field | Value |
| --- | --- |
| App name | **VibeTogether** |
| App description (short) | *See section 1 below — copy/paste verbatim.* |
| Website | https://vibe-together.vercel.app |
| Redirect URI | https://vibe-together-production.up.railway.app/spotify/callback |
| Category | Music · Social · Listening party |
| Commercial? | No — free hobby project, no paid tiers |

---

## 1. App description (paste into the "What does your app do?" field)

> **VibeTogether** is a real-time synchronized listening room for Spotify
> Premium users. A host opens a room and queues tracks from their Spotify
> library or search; up to a few dozen friends join via a shareable link,
> sign in with their own Spotify Premium accounts, and the Spotify Web
> Playback SDK streams the same track from each listener's own account in
> sync to within a few hundred milliseconds. Around the synchronized
> playback we layer a live chat and an emoji-reaction stream so people can
> react together in real time — like a Discord stage, but the audio is
> their own legitimate Spotify stream rather than a rebroadcast.
>
> No audio bytes touch our servers. We do not record, cache, transcode,
> or proxy any Spotify content. Our backend's only job is to broadcast
> short play/pause/seek/seek-to commands and synchronization timestamps
> over WebSockets so each listener's local Web Playback SDK stays aligned
> with the host's. Catalog metadata (track / album / artist names and
> album art) we display is fetched live from the Spotify Web API and
> always attributed to Spotify.
>
> The product is non-commercial — it's a side project, free to use,
> nothing is sold, and we don't run advertising. We're requesting the
> extension because the 25-user Dev Mode allowlist is the only thing
> stopping the founder's friends and a small private beta group from
> being able to use it.

---

## 2. Per-scope justification

Every scope below is mapped to (a) the exact feature in the product that
uses it and (b) the Spotify Web API endpoint or SDK call it gates. Reviewers
will cross-check this list against the screen recording — if a scope is
listed but not demonstrated in the recording, the request is rejected.

### `streaming`

**Feature:** Synchronized audio playback inside the listener's browser tab.

**API surface:** Spotify Web Playback SDK constructor + `connect()`. Without
this scope the SDK throws "INITIALIZATION_ERROR — invalid token" at boot
and audio never plays.

**Justification:** This is the core feature of the app. Every listener
instantiates the Web Playback SDK on join; the SDK streams the audio from
the listener's own Spotify Premium account. Without `streaming` the product
does not function for any user.

### `user-read-email`

**Feature:** Match the listener's Spotify account to their VibeTogether
account, and detect when a different Spotify account has been mistakenly
connected.

**API surface:** `GET /v1/me` (`email` field).

**Justification:** When a listener disconnects and reconnects Spotify under
a different Spotify account, the new account is now linked to their
VibeTogether record. We read the Spotify email to confirm the swap was
intentional (we show "Connected as <email>") and to populate the diagnostic
screen that helps users figure out which Spotify email to add to a Dev Mode
allowlist. We never email this address ourselves.

### `user-read-private`

**Feature:** Gate room-hosting behind Spotify Premium.

**API surface:** `GET /v1/me` (`product`, `display_name`, `country` fields).

**Justification:** The Web Playback SDK only works for Premium accounts.
Before we let a user create a room (which would otherwise create a stuck
"silent room" for everyone else), we read `product` and only show the "Host
a room" CTA when it equals `"premium"`. We also display the listener's
Spotify display name in the room sidebar — that comes from this scope.

### `user-modify-playback-state`

**Feature:** The host's play / pause / next-track / seek controls, and the
sync engine's "snap to host position" correction.

**API surface:** `PUT /v1/me/player/play`, `PUT /v1/me/player/pause`,
`POST /v1/me/player/next`, `PUT /v1/me/player/seek`.

**Justification:** When the host taps play in our UI, our server broadcasts
"play now at position X" over WebSockets. Each listener's browser then
issues `PUT /v1/me/player/play` against *their own* Spotify account
targeting the Web Playback SDK device we own in their tab. This is the
only way to actually start the audio. Without this scope, the SDK can
receive audio but the listener has no command surface that aligns its
position with the host's — playback would drift across listeners.

### `playlist-read-private`

**Feature:** "Add from playlist" picker in the room sidebar — the host's
own private playlists show up so they can append tracks to the room queue
in one click.

**API surface:** `GET /v1/me/playlists`, then `GET /v1/playlists/{id}/items`
filtered to the playlists the user owns.

**Justification:** A common request pattern is "let me drop my road-trip
playlist into this room." Without this scope, only public playlists would
be visible, which excludes the vast majority of personal playlists.

### `playlist-read-collaborative`

**Feature:** Same as above, but for collaborative playlists.

**API surface:** Same endpoints; collaborative playlists are returned by
`/v1/me/playlists` only if this scope is present, otherwise they're
silently filtered out. Reading `/v1/playlists/{id}/items` on a
collaborative playlist returns 403 without this scope.

**Justification:** Collaborative playlists are how friend groups already
curate music together. Letting a host pull from those is the single most
requested onboarding behavior — without it the "Add from playlist" flow
fails for ~30% of real-world playlists with no surfaced reason.

---

## 3. What we **don't** ask for (and why this matters)

Reviewers explicitly look for over-permissioned apps. We trimmed the scope
set down to six. Things we previously had and removed (or chose never to
add):

- `user-read-playback-state` / `user-read-currently-playing` — we *drive*
  playback, we don't poll it. The Web Playback SDK fires events when its
  own player state changes, so we never need to read state from another
  device.
- `user-library-read`, `user-read-recently-played`, `user-top-read` —
  Liked Songs, listening history, top tracks. No feature surfaces these
  yet, so requesting them would be over-permissioning.
- `playlist-modify-public` / `playlist-modify-private` — we never write to
  the user's library. The room queue is our own database object, separate
  from any Spotify playlist.
- `user-follow-read` / `user-follow-modify` — we have no concept of
  Spotify follows.
- `ugc-image-upload` — we don't push images to Spotify.

---

## 4. Required disclosure pages (paste these URLs into the form)

| Page | URL |
| --- | --- |
| Home / product description | https://vibe-together.vercel.app |
| Privacy Policy | https://vibe-together.vercel.app/privacy |
| Terms of Service | https://vibe-together.vercel.app/terms |
| Spotify Disclosure (attribution + data use) | https://vibe-together.vercel.app/spotify-disclosure |
| Cookie Policy | https://vibe-together.vercel.app/cookies |

All four pages are linked from the homepage footer under the "Legal"
group. The Spotify Disclosure page satisfies the attribution requirement
of Section IV of the Spotify Developer Terms.

---

## 5. Screen recording checklist

Spotify wants a short (~2 minute) screen capture demonstrating the OAuth
flow and the feature exercising each requested scope. Use Loom, QuickTime,
or any screen recorder — upload to YouTube as **unlisted** and paste the
link into the form. The reviewer wants to see:

- [ ] **Sign in with Google** on the homepage. (Shows we use Google for
      identity, not Spotify, so reviewers don't confuse identity with
      streaming.)
- [ ] Land on the dashboard, click **Connect Spotify**. The Spotify OAuth
      consent dialog opens — pause for one second so the reviewer can
      read the requested scopes (the **six** we ask for, no more).
- [ ] Approve consent. Return to the dashboard, which now shows the
      Spotify email and "Premium" tier badge. **(Demonstrates
      `user-read-email`, `user-read-private`.)**
- [ ] Click **Create room**. Room opens.
- [ ] In the sidebar, switch to the **Playlists** tab and pick one of
      your own private playlists, then add a track to the queue.
      **(Demonstrates `playlist-read-private`.)**
- [ ] Switch to a collaborative playlist (if you have one — if not, mention
      it in the form: "we only have private playlists in this test
      account; the scope is needed for the same screen against
      collaborative playlists"). **(Demonstrates
      `playlist-read-collaborative`.)**
- [ ] Press **Play**. Audio plays. **(Demonstrates `streaming` +
      `user-modify-playback-state`.)**
- [ ] Open a second browser (or incognito), sign in as a different
      Spotify Premium test account, join the room via the share link,
      and show that the audio is in sync between the two browsers.
      **(Demonstrates the "sync" claim of the app description.)**
- [ ] Briefly press **Pause** in the host browser; show the listener
      browser also pauses within ~1 second.
- [ ] Walk past the footer of the homepage to show the four legal links
      (Privacy / Terms / Spotify disclosure / Cookies) — reviewers
      occasionally need to verify they're linked, not just hosted.

Keep it under three minutes. Reviewers triage many of these per day.

---

## 6. Step-by-step: actually submitting the form

> **Re-read the warning box at the very top of this file first.** As of
> May 15, 2025 the in-dashboard "Quota Extension Request" tab is only
> visible AFTER a Spotify Partner Application has been approved, and the
> Partner Application has hard organization / 250K MAU gates. If your
> Dashboard doesn't show Settings → "Quota Extension Request" at all,
> that's normal — it's hidden until the Partner Application clears.

You (the registered owner of the Spotify app) must do this part. Claude
cannot — Spotify requires the OAuth-account holder.

### 6a. Today: the User Management allowlist (Development Mode)

Until the Partner Application is approved, your app lives in **Development
Mode** with a 25-Spotify-account allowlist. Adding a friend:

1. Open https://developer.spotify.com/dashboard and pick **VibeTogether**.
2. Click the **User Management** tab.
3. Click **Add new user**, paste the friend's **Spotify display name** AND
   the **email address they use to sign into Spotify** (both are required).
4. Click **Add**. The user can now sign into VibeTogether immediately.

Repeat for up to 25 users. That's it — nothing else is needed for friends
and a small private beta to use the app.

### 6b. Later: submitting the Quota Extension Request (when eligible)

This section is preserved for future use, after you've incorporated and
the Partner Application has cleared.

1. **Make sure the deploy is live.** Open
   https://vibe-together.vercel.app/privacy ,
   /terms , /spotify-disclosure , /cookies — all four should render. If
   any 404, your push hasn't deployed yet; wait for Vercel.

2. **Open** https://developer.spotify.com/dashboard and pick the
   VibeTogether app.

3. **Click Settings → "Quota Extension Request"**. (If this tab doesn't
   exist on your app, re-read the warning at the top — it means the
   Partner Application step hasn't been approved yet.)

4. **Paste the app description** from section 1 of this file.

5. **Paste the per-scope justifications** from section 2. The form usually
   has one textarea per scope; if it has a single combined textarea, paste
   them sequentially with the scope name as a heading on each.

6. **Paste the legal URLs** from section 4 into whichever fields the form
   asks for (Privacy / Terms / etc.). If it asks for only one, pick the
   Spotify Disclosure page.

7. **Upload (or link) the screen recording** from section 5.

8. **Submit.** The app detail page shows "Sent" in blue. Review can take
   up to **six weeks** in 2026 (was 5–10 business days pre-2025).

9. **Watch the email inbox you configured** in `web/lib/legal.ts`. Common
   rework reasons:
    - "Scope X not demonstrated in recording" → re-record covering that
      scope, reply with the new link.
    - "Operator name unclear" → set `LEGAL_OPERATOR_NAME` in
      `web/lib/legal.ts` to your full legal name (or registered entity)
      and redeploy before replying.
    - "Attribution not visible" → check `/spotify-disclosure` is
      reachable from the homepage footer.

---

## 7. After approval

When Spotify flips your app out of Dev Mode:

- The 25-user "User Management" allowlist becomes irrelevant — anyone with
  Premium can use the app immediately.
- The "show_dialog=true" force-consent flag in `api/src/spotify/routes.ts`
  can stay; it adds one click on reconnect but ensures users always see
  the scope set on a permission change. No need to remove it.
- Bump `LEGAL_EFFECTIVE_DATE` in `web/lib/legal.ts` if you've materially
  changed Privacy or Terms since this submission.

That's it. Good luck — paperwork is finished and pre-staged. You only have
to record the video and paste.
