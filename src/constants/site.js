/**
 * Brand and contact details — the one place to edit them.
 * Anything left as a [placeholder] is still waiting on the client.
 */
export const site = {
  name: 'Nirog Pharma',
  legalName: 'Nirog Pharma Pvt. Ltd.',
  tagline: 'Field sales, stock and collections — in one place.',

  // Paste the Play Store link here once the app is published.
  // While it is empty, "Download" buttons scroll to the download section instead.
  playStoreUrl: '',

  contact: {
    email: '[Email address]',
    phone: '[Phone number]',
    address: '[Office address]',
    // Office WhatsApp number with country code, digits only (e.g. 919876543210).
    // Powers the "Help" button and the floating WhatsApp button in the dashboard.
    whatsapp: '',
  },
}

/** The billing company — its GST state decides CGST+SGST (same state) vs IGST. */
export const company = {
  legalName: 'Nirog Pharma Pvt. Ltd.',
  stateCode: '09', // Uttar Pradesh (Meerut)
  gstin: '[Company GSTIN]',
}

export const hasPlayStoreLink = Boolean(site.playStoreUrl)
export const downloadHref = site.playStoreUrl || '#download'

export const whatsappHref = site.contact.whatsapp ? `https://wa.me/${site.contact.whatsapp}` : undefined
