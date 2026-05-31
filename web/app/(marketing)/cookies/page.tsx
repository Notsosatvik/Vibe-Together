import type { Metadata } from "next";
import {
  LEGAL_APP_NAME,
  LEGAL_OPERATOR_NAME,
  LEGAL_CONTACT_EMAIL,
  LEGAL_EFFECTIVE_DATE,
} from "@/lib/legal";

export const metadata: Metadata = {
  title: `Cookie Policy — ${LEGAL_APP_NAME}`,
  description: `How ${LEGAL_APP_NAME} uses cookies and local storage.`,
};

export default function CookiesPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 prose prose-invert prose-headings:font-display prose-headings:tracking-tight prose-a:text-neon-green prose-a:no-underline hover:prose-a:underline">
      <h1>Cookie Policy</h1>
      <p className="text-white/55">
        Effective {LEGAL_EFFECTIVE_DATE}. Operated by {LEGAL_OPERATOR_NAME}.
      </p>

      <p>
        This page describes the cookies and similar browser storage that{" "}
        {LEGAL_APP_NAME} uses, and why. We aim to use as little as possible —
        just what&apos;s needed to keep you signed in and route you between
        our frontend and our API.
      </p>

      <h2>1. What is a cookie?</h2>
      <p>
        A cookie is a small piece of text a website asks your browser to store
        and send back on later visits. &quot;Local storage&quot; is a similar
        browser feature that holds slightly larger values and is not sent
        automatically with each request. We use both in narrow ways described
        below.
      </p>

      <h2>2. Cookies we set</h2>
      <p>All of the cookies below are first-party — we set them ourselves
      under our own domain, not via any third-party ad network.</p>
      <ul>
        <li>
          <strong><code>session</code></strong> (HTTP-only, Secure, SameSite=Lax)
          — your signed-in identity. Created when you log in with Google and
          deleted when you sign out. Without it the app cannot tell who you
          are. Lifetime: 30 days, refreshed on use.
        </li>
        <li>
          <strong><code>spotify_state</code></strong> (HTTP-only, Secure,
          SameSite=None) — a short-lived random value used during the Spotify
          OAuth handshake to prevent CSRF on the redirect back to our API.
          Lifetime: 5 minutes, deleted as soon as the OAuth callback finishes.
        </li>
        <li>
          <strong><code>spotify_return_to</code></strong> (HTTP-only, Secure,
          SameSite=None) — optional. Remembers which page you were on when you
          clicked &quot;Connect Spotify&quot; so we can bounce you back to it
          after Spotify finishes. Lifetime: 5 minutes, deleted on callback.
        </li>
      </ul>

      <h2>3. Local storage we use</h2>
      <ul>
        <li>
          <strong>Cached Spotify access token</strong> — a short-lived (≈1
          hour) token the Spotify Web Playback SDK needs to talk to Spotify
          directly. The matching refresh token lives only on our server, so
          even if someone reads this value off your machine they can&apos;t
          maintain access.
        </li>
        <li>
          <strong>UI preferences</strong> — small interface state (which tab
          you had open, volume) so the app feels the same when you come back.
        </li>
      </ul>

      <h2>4. What we do NOT set</h2>
      <ul>
        <li>No advertising cookies. We don&apos;t run ads.</li>
        <li>No third-party tracking pixels or fingerprinting scripts.</li>
        <li>
          No cross-site cookies that follow you to other websites. The only
          third party your browser talks to as part of using {LEGAL_APP_NAME}{" "}
          is Spotify itself, and that only happens during the OAuth flow and
          when the Web Playback SDK streams audio.
        </li>
      </ul>

      <h2>5. How to opt out</h2>
      <p>
        Because the cookies above are strictly necessary for sign-in and
        Spotify OAuth, opting out means you cannot use the Service. To stop
        all storage, sign out of {LEGAL_APP_NAME} (which deletes the session
        cookie) and clear cookies + site data for our domain in your
        browser&apos;s settings. You can also revoke our Spotify access at{" "}
        <a
          href="https://www.spotify.com/account/apps/"
          target="_blank"
          rel="noreferrer"
        >
          spotify.com/account/apps
        </a>
        .
      </p>

      <h2>6. Changes</h2>
      <p>
        If we add or change cookies we&apos;ll update this page and bump the
        Effective date. Material changes will be announced in-product before
        they take effect.
      </p>

      <h2>7. Contact</h2>
      <p>
        Questions about cookies or storage:{" "}
        <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>.
      </p>
    </article>
  );
}
