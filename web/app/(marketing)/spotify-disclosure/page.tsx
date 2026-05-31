import type { Metadata } from "next";
import {
  LEGAL_APP_NAME,
  LEGAL_OPERATOR_NAME,
  LEGAL_CONTACT_EMAIL,
  LEGAL_EFFECTIVE_DATE,
} from "@/lib/legal";

export const metadata: Metadata = {
  title: `Spotify Disclosure — ${LEGAL_APP_NAME}`,
  description: `How ${LEGAL_APP_NAME} uses Spotify and what data it accesses.`,
};

/**
 * Required transparency page for any app that integrates the Spotify Web API
 * or Web Playback SDK. Spotify's Developer Terms (Section IV "Attribution")
 * require that we (a) clearly attribute Spotify, (b) disclose what user data
 * we access, and (c) make it obvious we are not Spotify. This page does all
 * three and is linked from the footer alongside Privacy and Terms.
 *
 * The Extension Request reviewer will read this page in detail.
 */
export default function SpotifyDisclosurePage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 prose prose-invert prose-headings:font-display prose-headings:tracking-tight prose-a:text-neon-green prose-a:no-underline hover:prose-a:underline">
      <h1>Spotify Disclosure</h1>
      <p className="text-white/55">Effective {LEGAL_EFFECTIVE_DATE}.</p>

      <p>
        {LEGAL_APP_NAME} integrates with Spotify so that you and your friends
        can listen to Spotify music together, in real time, from your own
        Spotify accounts. This page explains exactly what we do with Spotify
        and what data we access.
      </p>

      <h2>1. We are not Spotify</h2>
      <p>
        {LEGAL_APP_NAME} is an independent product operated by{" "}
        {LEGAL_OPERATOR_NAME}. We are not affiliated with, endorsed by, or
        sponsored by Spotify AB. Spotify is a registered trademark of Spotify
        AB. The Spotify Web Playback SDK and Spotify Web API are used under
        license per the{" "}
        <a href="https://developer.spotify.com/terms" target="_blank" rel="noreferrer">
          Spotify Developer Terms
        </a>
        .
      </p>

      <h2>2. How playback works</h2>
      <p>
        When you host a room, the audio is streamed by the official Spotify
        Web Playback SDK running in your browser tab, from your own Spotify
        Premium subscription. {LEGAL_APP_NAME}&apos;s servers do not store,
        rehost, or proxy any audio content. Each listener also streams from
        their own Spotify account — there is no shared audio stream. Our
        server only sends short play / pause / seek commands and timing
        information so everyone&apos;s playback stays in sync.
      </p>

      <h2>3. Spotify Premium requirement</h2>
      <p>
        Spotify&apos;s Web Playback SDK is restricted to Spotify Premium
        accounts. If your Spotify account is on the Free tier, you can still
        sign in, join rooms, chat, and react with emoji — but no audio will
        play in your tab. This restriction is enforced by Spotify, not by
        us.
      </p>

      <h2>4. Spotify data we access</h2>
      <p>
        When you connect Spotify we request the following OAuth scopes. Each
        is needed to provide a specific feature; we use only what we ask
        for.
      </p>
      <ul>
        <li>
          <code>streaming</code> — required by Spotify to instantiate the
          Web Playback SDK in your browser. Without it, audio cannot play.
        </li>
        <li>
          <code>user-read-email</code> — reads your Spotify email so we can
          (a) match your Spotify account to your {LEGAL_APP_NAME} account
          and (b) detect if a different Spotify account is connected by
          mistake.
        </li>
        <li>
          <code>user-read-private</code> — reads your Spotify display name,
          user ID, country, and subscription tier. The subscription tier
          determines whether we let you host rooms (Premium-only feature).
        </li>
        <li>
          <code>user-modify-playback-state</code> — sends play, pause, and
          seek commands to your active Spotify device. This is the core of
          how synchronized listening works.
        </li>
        <li>
          <code>playlist-read-private</code> — lists the playlists you own
          so you can add their tracks to a room queue from inside{" "}
          {LEGAL_APP_NAME}.
        </li>
        <li>
          <code>playlist-read-collaborative</code> — same as above for
          collaborative playlists you participate in.
        </li>
      </ul>

      <h2>5. What we DO NOT do with Spotify data</h2>
      <ul>
        <li>
          We do not store audio content, audio metadata files, or any
          downloadable representation of the audio.
        </li>
        <li>
          We do not modify your library, follow lists, or playlists. We have
          no scopes that would allow it.
        </li>
        <li>We do not post to your account or send messages on your behalf.</li>
        <li>
          We do not aggregate Spotify data with data from other music
          services or sell Spotify-derived data to anyone.
        </li>
        <li>
          We do not use Spotify Content (track audio, album art, artist
          images) to train machine-learning or recommendation models.
        </li>
      </ul>

      <h2>6. Tokens &amp; security</h2>
      <p>
        We store your Spotify refresh token encrypted at rest so we can mint
        short-lived access tokens to control your playback. You can revoke
        our access at any time at{" "}
        <a href="https://www.spotify.com/account/apps/" target="_blank" rel="noreferrer">
          spotify.com/account/apps
        </a>
        , or by disconnecting Spotify from your {LEGAL_APP_NAME} Settings
        page, which deletes the stored tokens on our side.
      </p>

      <h2>7. Attribution</h2>
      <p>
        Track and artist names, album art, and any other metadata
        originating from Spotify are the property of Spotify and its
        licensors. Where we display this content we identify it as coming
        from Spotify or link it back to Spotify&apos;s catalog.
      </p>

      <h2>8. Contact</h2>
      <p>
        Questions about how we use Spotify, or a request to remove the
        Spotify integration from your account:{" "}
        <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>.
      </p>
    </article>
  );
}
