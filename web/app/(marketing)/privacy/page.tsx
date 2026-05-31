import type { Metadata } from "next";
import {
  LEGAL_APP_NAME,
  LEGAL_APP_URL,
  LEGAL_OPERATOR_NAME,
  LEGAL_CONTACT_EMAIL,
  LEGAL_JURISDICTION,
  LEGAL_EFFECTIVE_DATE,
} from "@/lib/legal";

export const metadata: Metadata = {
  title: `Privacy Policy — ${LEGAL_APP_NAME}`,
  description: `How ${LEGAL_APP_NAME} collects, uses, and protects your information.`,
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 prose prose-invert prose-headings:font-display prose-headings:tracking-tight prose-a:text-neon-green prose-a:no-underline hover:prose-a:underline">
      <h1>Privacy Policy</h1>
      <p className="text-white/55">
        Effective {LEGAL_EFFECTIVE_DATE}. Operated by {LEGAL_OPERATOR_NAME}.
      </p>

      <p>
        {LEGAL_APP_NAME} (&quot;the Service&quot;) is a real-time listening
        room product. This policy explains what personal information we
        collect, how we use it, who we share it with, and the choices you
        have.
      </p>

      <h2>1. Information we collect</h2>
      <p>We collect only what we need to run the Service:</p>
      <ul>
        <li>
          <strong>Google account profile</strong> — when you sign in with
          Google we receive your name, email address, profile image URL, and
          Google account ID. We do not receive your Google password.
        </li>
        <li>
          <strong>Spotify account profile</strong> — when you connect Spotify
          we receive your Spotify display name, Spotify user ID, email
          address on file with Spotify, country code, and subscription tier
          (Premium / Free). We use this to determine whether your account is
          eligible to host audio playback (Premium-only).
        </li>
        <li>
          <strong>Spotify access &amp; refresh tokens</strong> — required to
          control playback in your Spotify app on your behalf. Stored
          encrypted at rest in our database; never shared.
        </li>
        <li>
          <strong>Room activity</strong> — rooms you create or join, tracks
          you queue, chat messages, emoji reactions, and the timestamps of
          those actions.
        </li>
        <li>
          <strong>Operational telemetry</strong> — IP address, browser
          user-agent, and error logs, used for security, abuse prevention,
          and debugging. Logs are retained for up to 30 days.
        </li>
      </ul>

      <h2>2. What we do NOT collect</h2>
      <ul>
        <li>
          We never see or store your Google or Spotify password.
        </li>
        <li>
          We never store the audio content itself — playback happens entirely
          inside the official Spotify Web Playback SDK on your device, and
          streaming bytes never touch our servers.
        </li>
        <li>
          We do not run third-party advertising trackers, fingerprinting, or
          cross-site behavioural advertising.
        </li>
      </ul>

      <h2>3. How we use it</h2>
      <ul>
        <li>To authenticate you and keep your session signed in.</li>
        <li>
          To control Spotify playback on your device when you (or the host
          of a room you&apos;ve joined) press play, pause, skip, or seek.
        </li>
        <li>
          To synchronize playback state, queue contents, chat messages, and
          reactions in real time across everyone in a room.
        </li>
        <li>To investigate abuse, debug failures, and improve the Service.</li>
      </ul>

      <h2>4. Third parties we share data with</h2>
      <p>
        We use the following sub-processors. We share only the minimum data
        needed for each one to do its job:
      </p>
      <ul>
        <li>
          <strong>Google</strong> — sign-in and identity verification only.
          Subject to Google&apos;s privacy policy.
        </li>
        <li>
          <strong>Spotify AB</strong> — playback control and catalog metadata.
          Subject to Spotify&apos;s privacy policy.
        </li>
        <li>
          <strong>Vercel Inc.</strong> — hosts the web frontend. Sees request
          metadata (IP, user-agent).
        </li>
        <li>
          <strong>Railway Corp.</strong> — hosts the API server. Sees request
          metadata and application logs.
        </li>
        <li>
          <strong>Neon Inc.</strong> — managed PostgreSQL hosting for user
          accounts, rooms, queues, and chat messages.
        </li>
        <li>
          <strong>Upstash Inc.</strong> — managed Redis for real-time
          pub/sub between server instances.
        </li>
      </ul>
      <p>
        We do not sell, rent, or trade your personal information to any
        third party for any purpose.
      </p>

      <h2>5. Cookies and local storage</h2>
      <p>
        We use a single first-party session cookie to keep you signed in,
        and browser local storage to cache your access token between page
        loads. We do not set advertising cookies or share cookie identifiers
        with third parties. See the{" "}
        <a href="/cookies">Cookie Policy</a> for details.
      </p>

      <h2>6. Data retention</h2>
      <ul>
        <li>Account and connected-service data: kept until you delete your account.</li>
        <li>Chat messages and emoji reactions: kept for the life of the room.</li>
        <li>Queue history: retained for analytics on what people listen to.</li>
        <li>Operational logs (request, error): up to 30 days, then deleted.</li>
      </ul>

      <h2>7. Your rights</h2>
      <p>You may at any time:</p>
      <ul>
        <li>
          Disconnect your Spotify account from Settings, which deletes your
          stored Spotify tokens.
        </li>
        <li>
          Revoke {LEGAL_APP_NAME}&apos;s access to your Spotify account at{" "}
          <a href="https://www.spotify.com/account/apps/" target="_blank" rel="noreferrer">
            spotify.com/account/apps
          </a>
          .
        </li>
        <li>
          Request a copy of all data we hold about you, or request deletion
          of your account and all associated data, by emailing{" "}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>.
          We will respond within 30 days.
        </li>
      </ul>

      <h2>8. Children</h2>
      <p>
        {LEGAL_APP_NAME} is not directed to children under 13 (or under 16 in
        the EEA / UK). We do not knowingly collect personal information from
        children. If you believe a child has used the Service, contact us at{" "}
        <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>{" "}
        and we will delete the account.
      </p>

      <h2>9. Security</h2>
      <p>
        We use HTTPS in transit and encrypted disk storage at rest. Spotify
        refresh tokens are stored encrypted. No system is perfectly secure;
        if we ever become aware of a breach affecting your data we will
        notify affected users without undue delay.
      </p>

      <h2>10. International transfers</h2>
      <p>
        Our sub-processors operate servers in the United States and the
        European Union. By using the Service, you consent to the transfer of
        your information to these jurisdictions.
      </p>

      <h2>11. Changes to this policy</h2>
      <p>
        We will update the &quot;Effective&quot; date at the top of this page
        and, for material changes, notify you in-product before the new
        version applies.
      </p>

      <h2>12. Contact</h2>
      <p>
        Questions, data requests, or complaints:{" "}
        <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>
        . You may also reach the operator, {LEGAL_OPERATOR_NAME}, at the
        same address.
      </p>

      <p className="text-white/45 text-sm mt-12">
        Governing law: {LEGAL_JURISDICTION}. The Service is operated at{" "}
        <a href={LEGAL_APP_URL}>{LEGAL_APP_URL}</a>.
      </p>
    </article>
  );
}
