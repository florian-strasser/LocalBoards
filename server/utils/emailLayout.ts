// The shared look for every e-mail LokalBoards sends.
//
// Mail clients ignore <style> blocks and external CSS, so everything here is
// inline and table-based where a client needs it (Outlook won't honour padding
// on an <a>). Colours are deliberately sparse: no page background and no text
// colour, so the mail inherits the client's own light or dark theme instead of
// fighting it. Only the button and the avatar circle set colours, because they
// need contrast against whatever is behind them.

export const EMAIL_FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
export const EMAIL_PRIMARY = "#0066cc";

// Anything interpolated into e-mail HTML is user input somewhere upstream —
// names, card titles, board names, deletion reasons.
export const escapeEmailHtml = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// The primary action. A padded <a> collapses in Outlook, so it rides in a
// single-cell table.
export const emailButton = (url: string, label: string): string => {
  const href = escapeEmailHtml(url);
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:20px 0;"><tr><td style="border-radius:8px;background-color:${EMAIL_PRIMARY};"><a href="${href}" style="display:inline-block;padding:12px 22px;font-family:${EMAIL_FONT};font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">${escapeEmailHtml(label)}</a></td></tr></table>`;
};

// The same link as plain text underneath a button, for clients that strip it
// and for anyone who wants to copy it.
export const emailFallbackLink = (url: string): string => {
  const href = escapeEmailHtml(url);
  return `<p style="margin:0 0 20px 0;font-size:12px;opacity:0.6;word-break:break-all;">${href}</p>`;
};

// An inline link inside running text.
export const emailLink = (url: string, label?: string): string => {
  const href = escapeEmailHtml(url);
  return `<a href="${href}" style="color:${EMAIL_PRIMARY};">${escapeEmailHtml(label ?? url)}</a>`;
};

// Wraps the body of any mail in the shared shell.
export const emailLayout = (bodyHtml: string): string =>
  `<div style="font-family:${EMAIL_FONT};font-size:14px;line-height:20px;max-width:600px;">${bodyHtml}</div>`;

// A paragraph in the shared style. Single newlines stay as line breaks, which
// is how the credential blocks in the welcome mails are written.
export const emailParagraph = (html: string): string =>
  `<p style="margin:0 0 16px 0;">${html.replace(/\n/g, "<br>")}</p>`;
