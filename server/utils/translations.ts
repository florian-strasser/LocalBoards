// Simple server-side translation utility for emails
// This avoids the i18n middleware requirement while still supporting translations

export function translate(key: string, language: string = 'en'): string {
  const translations = {
    en: {
      reset_your_password_subject: "Reset your password",
      reset_your_password_message: "Click on this link to assign a new password:",
      password_reset_success: "Password reset successfully",
      password_reset_email_sent: "Password reset link has been sent to your email"
    },
    de: {
      reset_your_password_subject: "Passwort zurücksetzen",
      reset_your_password_message: "Klicke auf diesen Link, um ein neues Passwort zu vergeben:",
      password_reset_success: "Passwort erfolgreich zurückgesetzt",
      password_reset_email_sent: "Passwort-Reset-Link wurde an Ihre E-Mail gesendet"
    },
    es: {
      reset_your_password_subject: "Restablecer contraseña",
      reset_your_password_message: "Haz clic en este enlace para asignar una nueva contraseña:",
      password_reset_success: "Contraseña restablecida con éxito",
      password_reset_email_sent: "Se ha enviado un enlace para restablecer la contraseña a tu correo electrónico"
    },
    fr: {
      reset_your_password_subject: "Réinitialiser votre mot de passe",
      reset_your_password_message: "Cliquez sur ce lien pour attribuer un nouveau mot de passe :",
      password_reset_success: "Mot de passe réinitialisé avec succès",
      password_reset_email_sent: "Un lien de réinitialisation de mot de passe a été envoyé à votre e-mail"
    },
    it: {
      reset_your_password_subject: "Reimposta la password",
      reset_your_password_message: "Fai clic su questo link per assegnare una nuova password:",
      password_reset_success: "Password reimpostata con successo",
      password_reset_email_sent: "Il link per reimpostare la password è stato inviato alla tua email"
    },
    nl: {
      reset_your_password_subject: "Wachtwoord resetten",
      reset_your_password_message: "Klik op deze link om een nieuw wachtwoord in te stellen:",
      password_reset_success: "Wachtwoord succesvol gereset",
      password_reset_email_sent: "Er is een wachtwoordresetlink verzonden naar uw e-mail"
    },
    pl: {
      reset_your_password_subject: "Zresetuj hasło",
      reset_your_password_message: "Kliknij ten link, aby przypisać nowe hasło:",
      password_reset_success: "Hasło zresetowane pomyślnie",
      password_reset_email_sent: "Link do resetowania hasła został wysłany na Twój adres e-mail"
    }
  };

  // Fallback to English if language not found or key not found
  const langTranslations = translations[language] || translations.en;
  return langTranslations[key] || translations.en[key] || key;
}

export function getEmailSubject(key: string, appName: string, language: string = 'en'): string {
  return `${translate(key, language)} | ${appName}`;
}

export function getEmailMessage(key: string, resetLink: string, language: string = 'en'): string {
  return `<p>${translate(key, language)}</p><p><a href='${resetLink}'>${resetLink}</a></p>`;
}
