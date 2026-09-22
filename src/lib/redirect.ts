/**
 * Where to send someone after sign-in or onboarding.
 *
 * The brief says "whatever page the redirect query parameter names". Taken
 * literally that is an open redirect: `?redirect=https://evil.example` would
 * bounce a freshly signed-in person off-site. Only same-origin paths are
 * honoured; anything else falls back to the home page.
 */
export function safeRedirect(value: string | undefined): string {
  if (!value) {
    return '/'
  }
  // Must be an absolute path on this origin. `//host` and `/\host` are
  // protocol-relative URLs in browsers, so they are rejected too.
  if (
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.startsWith('/\\')
  ) {
    return '/'
  }
  return value
}
