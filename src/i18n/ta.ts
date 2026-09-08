import type { TranslationKey } from '@/i18n/en';

// Tamil (தமிழ்). Core strings translated; everything else falls back to English.
// Community draft — please have a native speaker review before production.
export const ta: Partial<Record<TranslationKey, string>> = {
  'lang.en': 'English (ஆங்கிலம்)',
  'lang.hi': 'हिन्दी (இந்தி)',
  'lang.mr': 'मराठी (மராத்தி)',
  'lang.bn': 'বাংলা (பெங்காலி)',
  'lang.ta': 'தமிழ்',

  'nav.overview': 'கண்ணோட்டம்',
  'nav.payments': 'கட்டணங்கள்',
  'nav.crops': 'என் பயிர்கள்',
  'nav.contracts': 'ஒப்பந்தங்கள்',
  'nav.settlement': 'தீர்வு',
  'nav.network': 'வலைப்பின்னல்',
  'nav.insights': 'தகவல்கள்',

  'header.online': 'ஆன்லைன்',
  'header.offline': 'ஆஃப்லைன்',
  'header.runDemo': 'டெமோவை இயக்கு',
  'header.logout': 'வெளியேறு',
  'header.openPayments': 'கட்டணங்களைத் திற',

  'settings.title': 'அமைப்புகள்',
  'settings.language': 'மொழி',
  'settings.theme': 'தோற்றம்',
  'settings.largeText': 'பெரிய எழுத்து',
  'settings.simpleMode': 'எளிய முறை',

  'common.cancel': 'ரத்து செய்',
  'common.back': 'பின்',
  'common.done': 'முடிந்தது',
  'common.review': 'சரிபார்',
  'common.retry': 'மீண்டும் முயற்சி செய்',
  'common.close': 'மூடு',

  'wallet.title': 'கட்டணங்கள்',
  'wallet.availableBalance': 'கிடைக்கும் இருப்பு',
  'wallet.sendMoney': 'பணம் அனுப்பு',
  'wallet.requestMoney': 'பணம் கேள்',
  'wallet.addMoney': 'பணம் சேர்',
  'wallet.payObligation': 'கடமையை செலுத்து',
  'wallet.moneyIn': 'வந்த பணம்',
  'wallet.moneyOut': 'சென்ற பணம்',
  'wallet.transactionHistory': 'பரிவர்த்தனை வரலாறு',
  'wallet.pay': 'செலுத்து',

  'payment.field.amount': 'தொகை (₹)',
  'payment.field.note': 'குறிப்பு',
  'payment.balanceAfter': 'பிறகு இருப்பு',
  'payment.send.cta': 'உறுதிசெய்து அனுப்பு',
  'payment.obligation.cta': 'உறுதிசெய்து செலுத்து',

  'assistant.title': 'உதவியாளர்',
  'assistant.subtitle': 'உங்கள் உதவி உதவியாளர்',
  'assistant.placeholder': 'எப்படி செய்வது என்று கேளுங்கள்…',
  'assistant.send': 'அனுப்பு',
};
