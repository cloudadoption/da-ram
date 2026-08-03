/**
 * The two JSON-LD blocks www.royalairmaroc.com emits on each of its ten market home pages.
 *
 * WebSite and Airline, measured on all ten on 2026-08-03 and identical in shape. What differs per
 * market is the local office: de-DE carries 5 Rossmarkt in Frankfurt and +49 698 679 81 61, fr-FR
 * 38, Avenue de l'Opéra in Paris. Everything else is the same everywhere, so the constants are here
 * and the per-market values come from the page's own metadata.
 *
 * en-GB and ar-SA carry the same keys with every value empty. That is live's own defect and it is
 * reproduced rather than filled in: naming an office for a market the client has not named would be
 * inventing one, and decision 0023 reproduces a poor live value and records it.
 */

const ORIGIN = 'https://www.royalairmaroc.com';

const NAME = 'Royal Air Maroc';
const LEGAL_NAME = 'Compagnie Nationale Royal Air Maroc';
const IATA_CODE = 'AT';

// The logo still comes from the live origin, which is where the brand fonts come from for the same
// reason: it is a licensed asset and this repository is public.
const LOGO = {
  '@type': 'ImageObject',
  url: `${ORIGIN}/o/ram-airways-theme/2025/assets/images/logo_ram.svg`,
  width: '80',
  height: '59',
};

export const SAME_AS = [
  'https://fr.wikipedia.org/wiki/Royal_Air_Maroc',
  'https://www.facebook.com/RoyalAirMaroc/',
  'https://www.instagram.com/royalairmaroc/',
  'https://x.com/RAM_Maroc',
];

/**
 * The blocks for one market home page.
 *
 * @param {object} values the per-market values, from the page metadata
 * @param {string} values.market the market prefix, such as de-de
 * @param {string} [values.alternateName] the WebSite alternateName, "Royal Air Maroc - GERMANY"
 * @param {string} [values.street] the local office street address
 * @param {string} [values.locality] the city
 * @param {string} [values.postalCode] the postal code
 * @param {string} [values.country] the ISO country code, used for areaServed too
 * @param {string} [values.telephone] the local customer-service number
 * @param {string} [values.currency] the offer currency
 * @returns {object[]} the WebSite block then the Airline block, or an empty array with no market
 */
export function structuredDataFor(values) {
  const market = String(values?.market || '').trim();
  if (!market) return [];
  const url = `${ORIGIN}/${market}`;
  const text = (value) => String(value ?? '');
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: NAME,
      alternateName: text(values.alternateName),
      url,
      publisher: {
        '@type': 'Organization',
        name: NAME,
        legalName: LEGAL_NAME,
        url,
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Airline',
      name: NAME,
      alternateName: 'RAM',
      url,
      logo: LOGO,
      sameAs: SAME_AS,
      iataCode: IATA_CODE,
      address: {
        '@type': 'PostalAddress',
        streetAddress: text(values.street),
        addressLocality: text(values.locality),
        postalCode: text(values.postalCode),
        addressCountry: text(values.country),
      },
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: text(values.telephone),
        contactType: 'customer service',
        areaServed: text(values.country),
      },
      offers: {
        '@type': 'Offer',
        priceCurrency: text(values.currency),
        eligibleRegion: {
          '@type': 'Country',
          name: text(values.country),
        },
      },
    },
  ];
}
