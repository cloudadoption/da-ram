// Re-embeds the HubSpot form that is the whole content of 21 live pages: baggage
// claims, refund requests, irregularity reports, settlement acceptance and
// promotion signups. Customer service and marketing flows rather than editorial
// pages, which is why none of them survived a transform that reads article content.
//
// The three values are authored as block rows and were read off the live markup
// rather than composed. One portal and one region cover all 21.
//
// Live carries two loaders and the difference is not cosmetic. 11 pages call
// hbspt.forms.create from v2.js and 10 declare the form on a div for the newer
// forms/embed/<portal>.js script to find. Using the newer script for all 21 left
// the 11 legacy forms as an iframe at visibility:hidden and height 0, measured on
// the branch preview. v2.js renders both kinds and delegates the newer ones to the
// same embed app internally, so this loads v2.js for all 21.
//
// The embed is third-party JavaScript that collects passenger data, so it belongs
// behind a consent gate. There is no CMP yet and consent is granted by default for
// the POC, so it loads here. Wiring the real CMP is pre-cutover work and this is on
// the list of tags that go behind it.

// A region is part of the host, so a wrong one is a dead script tag.
const REGION = /^[a-z]{2}[0-9]$/;

let sequence = 0;

const rows = (block) => {
  const config = {};
  block.querySelectorAll(':scope > div').forEach((line) => {
    const cells = [...(line.children || [])];
    if (cells.length < 2) return;
    config[(cells[0].textContent || '').trim().toLowerCase()] = (cells[1].textContent || '').trim();
  });
  return config;
};

export function formConfig(block) {
  const config = rows(block);
  const embed = { region: config.region, portalId: config.portal, formId: config.form };
  if (!embed.region || !embed.portalId || !embed.formId) return null;
  return embed;
}

export function embedScriptUrl(region) {
  if (!REGION.test(String(region || ''))) return null;
  return `https://js-${region}.hsforms.net/forms/embed/v2.js`;
}

export function createOptions(embed, targetId) {
  return {
    region: embed.region,
    portalId: embed.portalId,
    formId: embed.formId,
    target: `#${targetId}`,
  };
}

export function renderForm(block, embed, doc = document, scope = window) {
  if (!embed) {
    block.replaceChildren();
    return null;
  }
  const source = embedScriptUrl(embed.region);
  if (!source) {
    block.replaceChildren();
    return null;
  }

  sequence += 1;
  const target = doc.createElement('div');
  const id = `hubspot-form-${sequence}`;
  target.setAttribute('id', id);
  block.replaceChildren(target);

  const create = () => scope.hbspt.forms.create(createOptions(embed, id));
  // hbspt arrives with the loader, and decorate runs before it.
  if (scope.hbspt) create();

  const existing = doc.querySelector(`script[src="${source}"]`);
  if (existing) {
    if (!scope.hbspt) {
      const previous = existing.onload;
      existing.onload = () => {
        if (previous) previous();
        create();
      };
    }
    return target;
  }
  const script = doc.createElement('script');
  script.setAttribute('src', source);
  script.setAttribute('charset', 'utf-8');
  if (!scope.hbspt) script.onload = create;
  doc.head.append(script);
  return target;
}

export default function decorate(block) {
  renderForm(block, formConfig(block));
}
