let consentedLoaded = false;

/**
 * Placeholder consent implementation. Decision 0030 grants consent by default for
 * the POC, where a declining default would be the safer choice on a live site.
 *
 * Nothing is behind the gate today: consented.js holds a comment and nothing
 * listens for consent.update, so this default changes no behavior. It removes a
 * trap instead, because the next thing added to consented.js would silently never
 * run while the default declined.
 *
 * Two things are pre-cutover work and neither is done here. Wire a real CMP, which
 * is OneTrust on the live site. Then put the marketing and analytics tags the
 * client wants carried behind its gate: live loads Contentsquare, Google Analytics
 * and Tag Manager, Bing UET, TikTok, Meta, DoubleClick, Microsoft Clarity and
 * HubSpot, and none of it is carried yet. Granting consent by default is not
 * lawful in the EU once any of that loads.
 *
 * The default can be overridden with a query parameter for testing:
 *   ?consent=accept   grant consent (loads consented.js)
 *   ?consent=decline  decline consent, which exercises the gate
 *
 * @returns {boolean} true if the user has consented
 */
function hasConsent() {
  const consent = new URLSearchParams(window.location.search).get('consent');
  if (consent !== null) {
    return ['accept', 'true', '1', 'yes'].includes(consent.toLowerCase());
  }
  // POC default, per decision 0030
  return true;
}

/**
 * Loads consented scripts once consent is available.
 */
function loadConsented() {
  if (consentedLoaded) return;
  consentedLoaded = true;
  import('./consented.js');
}

/**
 * Notifies listeners of the current consent state and loads consented
 * scripts if consent has been granted.
 */
function onConsentUpdate() {
  const consented = hasConsent();
  window.dispatchEvent(new CustomEvent('consent.update', { detail: { consented } }));
  if (consented) {
    loadConsented();
  }
}

onConsentUpdate();
