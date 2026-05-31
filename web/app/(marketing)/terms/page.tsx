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
  title: `Terms of Service — ${LEGAL_APP_NAME}`,
  description: `The agreement between you and ${LEGAL_APP_NAME}.`,
};

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 prose prose-invert prose-headings:font-display prose-headings:tracking-tight prose-a:text-neon-green prose-a:no-underline hover:prose-a:underline">
      <h1>Terms of Service</h1>
      <p className="text-white/55">
        Effective {LEGAL_EFFECTIVE_DATE}. Operated by {LEGAL_OPERATOR_NAME}.
      </p>

      <p>
        These Terms govern your use of {LEGAL_APP_NAME} (the
        &quot;Service&quot;), provided by {LEGAL_OPERATOR_NAME}. By using the
        Service you agree to these Terms. If you do not agree, do not use the
        Service.
      </p>

      <h2>1. Eligibility</h2>
      <p>
        You must be at least 13 years old (16 in the EEA / UK) and able to
        form a binding contract to use the Service. To host audio playback
        you must have an active Spotify Premium subscription tied to your
        Spotify account.
      </p>

      <h2>2. Account</h2>
      <p>
        You sign in with Google. You are responsible for the security of your
        Google account and Spotify account. You must not share your account
        with others or allow anyone else to use it on your behalf.
      </p>

      <h2>3. Spotify integration</h2>
      <p>
        {LEGAL_APP_NAME} uses the Spotify Web Playback SDK and Spotify Web
        API under license from Spotify AB to provide synchronized playback
        in your own Spotify app. Your use of Spotify through {LEGAL_APP_NAME}{" "}
        is additionally governed by{" "}
        <a href="https://www.spotify.com/legal/end-user-agreement/" target="_blank" rel="noreferrer">
          Spotify&apos;s Terms of Use
        </a>
        . {LEGAL_APP_NAME} is not endorsed by or affiliated with Spotify AB.
        See the <a href="/spotify-disclosure">Spotify Disclosure</a> for full
        details.
      </p>

      <h2>4. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>
          Use the Service to host content you don&apos;t have the right to
          play (e.g. via unlicensed third-party plugins that bypass
          Spotify).
        </li>
        <li>
          Attempt to redistribute, record, rip, or save the audio content
          played through the Service.
        </li>
        <li>
          Use the chat or reaction features to harass, threaten, defame, or
          impersonate any person, or to share illegal content.
        </li>
        <li>
          Attempt to circumvent rate limits, reverse-engineer the Service,
          probe for vulnerabilities, or run automated traffic against the
          API.
        </li>
        <li>
          Use the Service to violate any law or third-party right, including
          but not limited to copyright, privacy, and publicity rights.
        </li>
      </ul>

      <h2>5. User content</h2>
      <p>
        Chat messages and emoji reactions you post are visible to everyone
        in the room. You retain ownership of what you post; by posting you
        grant {LEGAL_APP_NAME} a non-exclusive, royalty-free license to
        store and display that content as needed to operate the Service.
        You are solely responsible for your content. We may remove content
        or terminate accounts that violate these Terms without notice.
      </p>

      <h2>6. Intellectual property</h2>
      <p>
        The {LEGAL_APP_NAME} name, logo, design, and source code are owned
        by {LEGAL_OPERATOR_NAME}. Audio content streamed via Spotify is
        owned by Spotify and its licensors. Nothing in these Terms gives
        you any ownership over either.
      </p>

      <h2>7. Termination</h2>
      <p>
        You may stop using the Service at any time and delete your account
        by emailing{" "}
        <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>.
        We may suspend or terminate your access for material breach of
        these Terms or to comply with law.
      </p>

      <h2>8. Disclaimers</h2>
      <p>
        The Service is provided &quot;as is&quot; and &quot;as
        available&quot;. To the maximum extent permitted by law,{" "}
        {LEGAL_OPERATOR_NAME} disclaims all warranties, express or implied,
        including merchantability, fitness for a particular purpose, and
        non-infringement. We do not guarantee uninterrupted or error-free
        operation. Audio playback depends on Spotify&apos;s availability,
        your network, and your device — outages on any of those will
        affect the Service.
      </p>

      <h2>9. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, in no event will{" "}
        {LEGAL_OPERATOR_NAME} be liable for any indirect, incidental,
        consequential, special, exemplary, or punitive damages, or for any
        loss of profits, data, or goodwill, arising out of or in connection
        with your use of the Service. Our total cumulative liability for any
        claim arising from these Terms will not exceed the greater of (a) the
        amount you paid us in the 12 months preceding the claim or (b) ten US
        dollars (USD $10).
      </p>

      <h2>10. Indemnification</h2>
      <p>
        You agree to indemnify and hold harmless {LEGAL_OPERATOR_NAME} from
        any claim arising out of (a) your breach of these Terms, (b) your
        violation of any law or third-party right, or (c) content you posted
        through the Service.
      </p>

      <h2>11. Changes to the Service or Terms</h2>
      <p>
        We may modify the Service or these Terms at any time. We will update
        the &quot;Effective&quot; date and, for material changes, give you
        reasonable in-product notice. Continued use after a change
        constitutes acceptance of the updated Terms.
      </p>

      <h2>12. Governing law &amp; disputes</h2>
      <p>
        These Terms are governed by the laws of {LEGAL_JURISDICTION},
        without regard to its conflict-of-laws principles. Any dispute
        arising from these Terms will be brought exclusively in the courts
        of {LEGAL_JURISDICTION}, and you submit to the personal jurisdiction
        of those courts.
      </p>

      <h2>13. Severability &amp; entire agreement</h2>
      <p>
        If any provision of these Terms is held unenforceable, the remaining
        provisions stay in effect. These Terms, together with the Privacy
        Policy and Spotify Disclosure, are the entire agreement between you
        and {LEGAL_OPERATOR_NAME} concerning the Service.
      </p>

      <h2>14. Contact</h2>
      <p>
        Questions about these Terms:{" "}
        <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>.
      </p>

      <p className="text-white/45 text-sm mt-12">
        Service URL: <a href={LEGAL_APP_URL}>{LEGAL_APP_URL}</a>.
      </p>
    </article>
  );
}
