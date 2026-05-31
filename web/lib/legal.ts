/**
 * Single source of truth for the legal-ish constants surfaced in the public
 * Privacy / Terms / Spotify Disclosure / Cookies pages.
 *
 * **You're going to want to edit these before publishing.** I picked sensible
 * defaults so the pages render without 404'ing, but the Spotify Extension
 * Request reviewer will read every page on this list and judge whether the
 * operator name + contact email + jurisdiction look real. If they look like
 * placeholder text the submission will be rejected ("contact email required",
 * "operator unclear").
 *
 * What to change:
 *   - LEGAL_OPERATOR_NAME  → your name, or an LLC if you've registered one
 *   - LEGAL_CONTACT_EMAIL  → an email you can actually read and respond from
 *   - LEGAL_JURISDICTION   → the country/state whose law governs the Terms
 *   - LEGAL_EFFECTIVE_DATE → bump when you materially change Privacy or Terms
 */

export const LEGAL_APP_NAME = "VibeTogether" as const;
export const LEGAL_APP_URL = "https://vibe-together.vercel.app" as const;

// The legal operator behind VibeTogether. Replace if you incorporate an
// entity later (e.g. "VibeTogether Labs LLC") — Spotify wants to know who
// they're contracting with.
export const LEGAL_OPERATOR_NAME = "Satwik Handa" as const;

// Reachable contact for data requests and Spotify reviewer questions.
// Gmail is fine — Spotify just wants an address a human actually reads.
// If you register a domain later, swap this to something@your-domain.
export const LEGAL_CONTACT_EMAIL = "satwikhanda10@gmail.com" as const;

// Governing law for the Terms of Service. Default: India (where the operator
// resides). Change if you live elsewhere or if you've incorporated.
export const LEGAL_JURISDICTION = "India" as const;

// Bumped any time we materially change Privacy or Terms. Displayed at the
// bottom of each page so users can tell whether they've seen the current
// version. Format: "YYYY-MM-DD".
export const LEGAL_EFFECTIVE_DATE = "2026-05-31" as const;
