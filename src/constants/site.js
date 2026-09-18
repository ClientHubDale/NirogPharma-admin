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
  },
}

export const hasPlayStoreLink = Boolean(site.playStoreUrl)
export const downloadHref = site.playStoreUrl || '#download'
