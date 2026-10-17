const brandImages: Record<string, string> = {
  whatsapp: 'whatsapp.svg', whatsappbusiness: 'whatsapp.svg', whatsappbusinessaccount: 'whatsapp.svg', metawhatsapp: 'whatsapp.svg',
  facebook: 'facebook.png', facebookpage: 'facebook.png', facebookpages: 'facebook.png', facebookmessenger: 'facebook.png', facebookmessengerandcomments: 'facebook.png', metafacebook: 'facebook.png',
  instagram: 'instagram.webp', instagramdm: 'instagram.webp', instagramdms: 'instagram.webp', instagramprofessional: 'instagram.webp', instagrammessagesandcomments: 'instagram.webp', metainstagram: 'instagram.webp',
  gmail: 'gmail.svg', googlemail: 'gmail.svg',
  googlebusiness: 'google-business.svg', googlebusinessprofile: 'google-business.svg', googlemybusiness: 'google-business.svg',
  googlecalendar: 'calendar.svg', googlesheets: 'sheets.svg',
  tiktok: 'tiktok.png', tiktokbusiness: 'tiktok.png',
  zendesk: 'zendesk.svg', zendesksupport: 'zendesk.svg',
  hubspot: 'hubspot.png', hubspotcrm: 'hubspot.png',
  salesforce: 'salesforce.ico', salesforcecrm: 'salesforce.ico',
  zoho: 'zoho.ico', zohocrm: 'zoho.ico',
}

export function channelIdentity(provider = '', channel = '') {
  const keys = [channel, provider].map(value => value.toLowerCase().replace(/[^a-z0-9]/g, ''))
  const image = keys.map(key => brandImages[key]).find(Boolean)
  if (image) return { image: `/channel-icons/${image}`, category: 'provider' }
  if (keys.some(key => ['phone', 'voice', 'voicecalls', 'phonecalls', 'pstn', 'twilio', 'telnyx'].includes(key))) return { category: 'phone', color: '#b96816' }
  if (keys.some(key => ['email', 'emailthroughresend', 'resend', 'smtp', 'imap'].includes(key))) return { category: 'email', color: '#b34c36' }
  if (keys.some(key => ['web', 'webchat', 'browser', 'widget', 'website', 'webenquiries', 'websiterequests', 'websitechatandvoicewidget'].includes(key))) return { category: 'web', color: '#087f8c' }
  if (keys.some(key => ['booking', 'bookings', 'calendar'].includes(key))) return { category: 'calendar', color: '#2867ee' }
  if (keys.some(key => ['sheets', 'spreadsheet', 'spreadsheets'].includes(key))) return { category: 'spreadsheet', color: '#198754' }
  if (keys.some(key => ['crm', 'crmsystems', 'helpdesk'].includes(key))) return { category: 'crm', color: '#7544cb' }
  return { category: 'other', color: '#626778' }
}
