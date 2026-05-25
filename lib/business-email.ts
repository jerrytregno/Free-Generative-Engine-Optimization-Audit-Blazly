/**
 * Blocks common consumer / disposable mail hosts so audits are gated to likely work emails.
 */

const BLOCKED_CONSUMER_EMAIL_DOMAINS = new Set(
  `
  gmail.com googlemail.com
  outlook.com hotmail.com live.com msn.com
  yahoo.com yahoo.co.uk yahoo.co.in ymail.com rocketmail.com
  icloud.com me.com mac.com
  aol.com protonmail.com proton.me pm.me hey.com mail.com gmx.net gmx.com gmx.de
  fastmail.com fastmail.fm tutanota.com tuta.io
  yandex.ru yandex.com mail.ru inbox.ru bk.ru list.ru internet.ru
  qq.com foxmail.com 163.com sina.com sina.cn naver.com daum.net
  tempmail.ws guerrillamail.com sharklasers.com 10minutemail.com trashmail.com
  `
    .trim()
    .split(/\s+/),
);

export function emailDomain(email: string): string {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at < 1 || at === trimmed.length - 1) return "";
  return trimmed.slice(at + 1).replace(/^www\./, "");
}

export function isBlockedConsumerEmailDomain(email: string): boolean {
  const domain = emailDomain(email);
  if (!domain || domain === "localhost") return true;
  if (BLOCKED_CONSUMER_EMAIL_DOMAINS.has(domain)) return true;
  /** Subdomains of blocked providers */
  const parts = domain.split(".");
  for (let i = 0; i < parts.length - 1; i++) {
    const suffix = parts.slice(i).join(".");
    if (BLOCKED_CONSUMER_EMAIL_DOMAINS.has(suffix)) return true;
  }
  return false;
}

export class BusinessEmailError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BusinessEmailError";
  }
}

export function assertBusinessDomainEmail(email: string): void {
  if (isBlockedConsumerEmailDomain(email)) {
    throw new BusinessEmailError(
      "Use your company email. Personal addresses (Gmail, Outlook, Yahoo, iCloud, and similar providers) are not accepted.",
    );
  }
}

/** UX + client-side guard (mirrors API validation). */
export function acceptsBusinessLeadEmail(email: string): boolean {
  const d = emailDomain(email);
  return d.length > 0 && !isBlockedConsumerEmailDomain(email);
}
