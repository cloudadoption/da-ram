// Re-embeds the HubSpot form that is the whole content of 21 live pages: baggage
// claims, refund requests, irregularity reports, settlement acceptance and
// promotion signups. Customer service and marketing flows rather than editorial
// pages, which is why none of them survived a transform that reads article content.
//
// The three values are authored as block rows and were read off the live markup
// rather than composed. One portal and one region cover all 21.
//
// Live carries two loaders. 10 pages declare the form on a div and let HubSpot's own
// script find it, 11 call hbspt.forms.create. This uses the declarative one for all
// 21: the form it renders is the same and one loader is less to keep working.
//
// The embed is third-party JavaScript that collects passenger data, so it belongs
// behind a consent gate. There is no CMP yet and consent is granted by default for
// the POC, so it loads here. Wiring the real CMP is pre-cutover work and this is on
// the list of tags that go behind it.

// A region is part of the host, so a wrong one is a dead script tag.
const REGION = /^[a-z]{2}[0-9]$/;
const PORTAL = /^[0-9]+$/;

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

export function embedScriptUrl(region, portalId) {
  if (!REGION.test(String(region || '')) || !PORTAL.test(String(portalId || ''))) return null;
  return `https://js-${region}.hsforms.net/forms/embed/${portalId}.js`;
}

export function renderForm(block, embed, doc = document) {
  if (!embed) {
    block.replaceChildren();
    return null;
  }
  const source = embedScriptUrl(embed.region, embed.portalId);
  if (!source) {
    block.replaceChildren();
    return null;
  }

  const frame = doc.createElement('div');
  frame.className = 'hs-form-frame';
  frame.setAttribute('data-region', embed.region);
  frame.setAttribute('data-portal-id', embed.portalId);
  frame.setAttribute('data-form-id', embed.formId);
  block.replaceChildren(frame);

  // One script serves every form on the page, and it scans for the frames itself.
  if (!doc.querySelector(`script[src="${source}"]`)) {
    const script = doc.createElement('script');
    script.setAttribute('src', source);
    script.setAttribute('defer', '');
    doc.head.append(script);
  }
  return frame;
}

export default function decorate(block) {
  renderForm(block, formConfig(block));
}
