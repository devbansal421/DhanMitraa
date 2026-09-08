import type { TranslationKey } from '@/i18n/en';

// Bengali (বাংলা). Core strings translated; everything else falls back to English.
// Community draft — please have a native speaker review before production.
export const bn: Partial<Record<TranslationKey, string>> = {
  'lang.en': 'English (ইংরেজি)',
  'lang.hi': 'हिन्दी (হিন্দি)',
  'lang.mr': 'मराठी (মারাঠি)',
  'lang.bn': 'বাংলা',
  'lang.ta': 'தமிழ் (তামিল)',

  'nav.overview': 'সারসংক্ষেপ',
  'nav.payments': 'পেমেন্ট',
  'nav.crops': 'আমার ফসল',
  'nav.contracts': 'চুক্তি',
  'nav.settlement': 'নিষ্পত্তি',
  'nav.network': 'নেটওয়ার্ক',
  'nav.insights': 'তথ্য',

  'header.online': 'অনলাইন',
  'header.offline': 'অফলাইন',
  'header.runDemo': 'ডেমো চালান',
  'header.logout': 'লগ আউট',
  'header.openPayments': 'পেমেন্ট খুলুন',

  'settings.title': 'সেটিংস',
  'settings.language': 'ভাষা',
  'settings.theme': 'চেহারা',
  'settings.largeText': 'বড় লেখা',
  'settings.simpleMode': 'সরল মোড',

  'common.cancel': 'বাতিল',
  'common.back': 'পিছনে',
  'common.done': 'সম্পন্ন',
  'common.review': 'যাচাই করুন',
  'common.retry': 'আবার চেষ্টা করুন',
  'common.close': 'বন্ধ করুন',

  'wallet.title': 'পেমেন্ট',
  'wallet.availableBalance': 'উপলব্ধ ব্যালেন্স',
  'wallet.sendMoney': 'টাকা পাঠান',
  'wallet.requestMoney': 'টাকা চান',
  'wallet.addMoney': 'টাকা যোগ করুন',
  'wallet.payObligation': 'দায় পরিশোধ করুন',
  'wallet.moneyIn': 'আসা টাকা',
  'wallet.moneyOut': 'যাওয়া টাকা',
  'wallet.transactionHistory': 'লেনদেনের ইতিহাস',
  'wallet.pay': 'পরিশোধ',

  'payment.field.amount': 'পরিমাণ (₹)',
  'payment.field.note': 'নোট',
  'payment.balanceAfter': 'পরে ব্যালেন্স',
  'payment.send.cta': 'নিশ্চিত করে পাঠান',
  'payment.obligation.cta': 'নিশ্চিত করে পরিশোধ করুন',

  'assistant.title': 'সহায়ক',
  'assistant.subtitle': 'আপনার সাহায্য সহায়ক',
  'assistant.placeholder': 'কীভাবে কিছু করবেন জিজ্ঞাসা করুন…',
  'assistant.send': 'পাঠান',
};
