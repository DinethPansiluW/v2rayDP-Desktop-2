/**
 * v2rayDP Desktop - Social Links
 * Ported faithfully from SocialLinks.kt
 */

export interface SocialLinkItem {
  id: string;
  label: string;
  handle: string;
  url: string | null;
  visible: boolean;
}

export const SocialLinks = {
  GITHUB_LABEL: 'GitHub',
  GITHUB_HANDLE: 'DinethPansiluW',
  GITHUB_URL: 'https://github.com/DinethPansiluW',

  FACEBOOK_LABEL: 'Facebook',
  FACEBOOK_HANDLE: 'DinethPansiluW',
  FACEBOOK_URL: 'https://www.facebook.com/DinethPansiluW',

  WHATSAPP_LABEL: 'WhatsApp',
  WHATSAPP_HANDLE: 'DinethPansiluW',
  WHATSAPP_NUMBER: '', // Empty in original app; hide if blank as requested
  get WHATSAPP_URL(): string | null {
    const digits = this.WHATSAPP_NUMBER.replace(/\D/g, '');
    return digits ? `https://wa.me/${digits}` : null;
  },

  TELEGRAM_LABEL: 'Telegram',
  TELEGRAM_HANDLE: 'DinethPansilu',
  TELEGRAM_URL: 'https://t.me/DinethPansilu',

  INSTAGRAM_LABEL: 'Instagram',
  INSTAGRAM_HANDLE: 'DinethPansiluW',
  INSTAGRAM_URL: 'https://www.instagram.com/DinethPansiluW',

  getLinkItems(): SocialLinkItem[] {
    return [
      {
        id: 'github',
        label: this.GITHUB_LABEL,
        handle: this.GITHUB_HANDLE,
        url: this.GITHUB_URL,
        visible: true
      },
      {
        id: 'facebook',
        label: this.FACEBOOK_LABEL,
        handle: this.FACEBOOK_HANDLE,
        url: this.FACEBOOK_URL,
        visible: true
      },
      {
        id: 'telegram',
        label: this.TELEGRAM_LABEL,
        handle: this.TELEGRAM_HANDLE,
        url: this.TELEGRAM_URL,
        visible: true
      },
      {
        id: 'instagram',
        label: this.INSTAGRAM_LABEL,
        handle: this.INSTAGRAM_HANDLE,
        url: this.INSTAGRAM_URL,
        visible: true
      },
      {
        id: 'whatsapp',
        label: this.WHATSAPP_LABEL,
        handle: this.WHATSAPP_HANDLE,
        url: this.WHATSAPP_URL,
        visible: Boolean(this.WHATSAPP_URL) // Hidden if blank as requested
      }
    ].filter(item => item.visible);
  }
};
