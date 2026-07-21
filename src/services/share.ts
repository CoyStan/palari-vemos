import { Linking, Platform, Share } from 'react-native';

import type { ShareMethod } from '../domain/types';

function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Prefer the friend's usual channel; fall back to the system share sheet.
 * Friends never need the app — we just open WhatsApp / SMS / Telegram.
 */
export async function shareInviteMessage(input: {
  message: string;
  method: ShareMethod;
  phone?: string;
}): Promise<boolean> {
  const message = input.message.trim();
  if (!message) {
    return false;
  }

  const encoded = encodeURIComponent(message);
  const digits = digitsOnly(input.phone ?? '');

  try {
    if (input.method === 'whatsapp') {
      const url = digits
        ? `https://wa.me/${digits}?text=${encoded}`
        : `https://wa.me/?text=${encoded}`;
      await Linking.openURL(url);
      return true;
    }

    if (input.method === 'sms' || input.method === 'message') {
      const separator = Platform.OS === 'ios' ? '&' : '?';
      const url = digits
        ? `sms:${digits}${separator}body=${encoded}`
        : `sms:${separator}body=${encoded}`;
      await Linking.openURL(url);
      return true;
    }

    if (input.method === 'telegram') {
      await Linking.openURL(`https://t.me/share/url?url=&text=${encoded}`);
      return true;
    }

    await Share.share({ message });
    return true;
  } catch {
    try {
      await Share.share({ message });
      return true;
    } catch {
      return false;
    }
  }
}
