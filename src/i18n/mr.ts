import type { TranslationKey } from '@/i18n/en';

// Marathi (मराठी). Core strings translated; everything else falls back to English.
// Community draft — please have a native speaker review before production.
export const mr: Partial<Record<TranslationKey, string>> = {
  'lang.en': 'English (इंग्रजी)',
  'lang.hi': 'हिन्दी',
  'lang.mr': 'मराठी',
  'lang.bn': 'বাংলা (बंगाली)',
  'lang.ta': 'தமிழ் (तमिळ)',

  'nav.overview': 'आढावा',
  'nav.payments': 'पेमेंट',
  'nav.crops': 'माझी पिके',
  'nav.contracts': 'करार',
  'nav.settlement': 'सेटलमेंट',
  'nav.network': 'नेटवर्क',
  'nav.insights': 'माहिती',

  'header.online': 'ऑनलाइन',
  'header.offline': 'ऑफलाइन',
  'header.runDemo': 'डेमो चालवा',
  'header.logout': 'लॉग आउट',
  'header.openPayments': 'पेमेंट उघडा',

  'settings.title': 'सेटिंग्ज',
  'settings.language': 'भाषा',
  'settings.theme': 'रूप',
  'settings.largeText': 'मोठा मजकूर',
  'settings.simpleMode': 'साधा मोड',

  'common.cancel': 'रद्द करा',
  'common.back': 'मागे',
  'common.done': 'झाले',
  'common.review': 'तपासा',
  'common.retry': 'पुन्हा प्रयत्न करा',
  'common.close': 'बंद करा',

  'wallet.title': 'पेमेंट',
  'wallet.availableBalance': 'उपलब्ध रक्कम',
  'wallet.sendMoney': 'पैसे पाठवा',
  'wallet.requestMoney': 'पैसे मागा',
  'wallet.addMoney': 'पैसे जोडा',
  'wallet.payObligation': 'देणे भरा',
  'wallet.moneyIn': 'आलेले पैसे',
  'wallet.moneyOut': 'गेलेले पैसे',
  'wallet.transactionHistory': 'व्यवहार इतिहास',
  'wallet.pay': 'भरा',

  'payment.field.amount': 'रक्कम (₹)',
  'payment.field.note': 'टीप',
  'payment.balanceAfter': 'नंतरची रक्कम',
  'payment.send.cta': 'पुष्टी करा आणि पाठवा',
  'payment.obligation.cta': 'पुष्टी करा आणि भरा',

  'assistant.title': 'सहाय्यक',
  'assistant.subtitle': 'तुमचा मदत सहाय्यक',
  'assistant.placeholder': 'काहीतरी कसे करायचे ते विचारा…',
  'assistant.send': 'पाठवा',
};
