// Simple server-side translation utility for emails
// This avoids the i18n middleware requirement while still supporting translations

export function translate(key: string, language: string = "en"): string {
  const translations = {
    en: {
      reset_your_password_subject: "Reset your password",
      reset_your_password_message:
        "Click on this link to assign a new password:",
      password_reset_success: "Password reset successfully",
      password_reset_email_sent:
        "Password reset link has been sent to your email",
      welcome_subject: "Welcome",
      welcome_signup_message:
        "Hi {name},\n\nwelcome to {appName}! Your account has been created and is ready to use.\n\nYou can sign in any time here:\n{loginURL}",
      welcome_admin_message:
        "Hi {name},\n\n{adminName} has created a {appName} account for you.\n\nYou can sign in with the following credentials:\nEmail: {email}\nPassword: {password}\n\nSign in here:\n{loginURL}\n\nFor your security, please change your password after your first sign-in.",
      board_invite_subject: "You've been invited to a board",
      board_invite_message:
        'Hi {name},\n\n{inviterName} has invited you to the board "{boardName}" on {appName}.\n\nYour access: {permission}\n\nOpen the board here:\n{boardURL}',
      board_invite_permission_read: "read-only",
      board_invite_permission_edit: "read & write",
      account_deleted_subject: "Your account has been deleted",
      account_deleted_message:
        "Hi {name},\n\nyour account on {appName} has been deleted by an administrator.\n\nReason:\n{reason}\n\nIf you think this was a mistake, please contact the administrator.",
    },
    de: {
      reset_your_password_subject: "Passwort zurücksetzen",
      reset_your_password_message:
        "Klicke auf diesen Link, um ein neues Passwort zu vergeben:",
      password_reset_success: "Passwort erfolgreich zurückgesetzt",
      password_reset_email_sent:
        "Passwort-Reset-Link wurde an Ihre E-Mail gesendet",
      welcome_subject: "Willkommen",
      welcome_signup_message:
        "Hallo {name},\n\nwillkommen bei {appName}! Dein Konto wurde erstellt und ist einsatzbereit.\n\nDu kannst dich jederzeit hier anmelden:\n{loginURL}",
      welcome_admin_message:
        "Hallo {name},\n\n{adminName} hat ein {appName}-Konto für dich erstellt.\n\nDu kannst dich mit den folgenden Zugangsdaten anmelden:\nE-Mail: {email}\nPasswort: {password}\n\nHier anmelden:\n{loginURL}\n\nBitte ändere aus Sicherheitsgründen nach deiner ersten Anmeldung dein Passwort.",
      board_invite_subject: "Du wurdest zu einem Board eingeladen",
      board_invite_message:
        'Hallo {name},\n\n{inviterName} hat dich zum Board "{boardName}" auf {appName} eingeladen.\n\nDeine Berechtigung: {permission}\n\nÖffne das Board hier:\n{boardURL}',
      board_invite_permission_read: "nur lesen",
      board_invite_permission_edit: "Lesen & Schreiben",
      account_deleted_subject: "Dein Konto wurde gelöscht",
      account_deleted_message:
        "Hallo {name},\n\ndein Konto bei {appName} wurde von einem Administrator gelöscht.\n\nGrund:\n{reason}\n\nWenn du denkst, dass dies ein Fehler war, wende dich bitte an den Administrator.",
    },
    es: {
      reset_your_password_subject: "Restablecer contraseña",
      reset_your_password_message:
        "Haz clic en este enlace para asignar una nueva contraseña:",
      password_reset_success: "Contraseña restablecida con éxito",
      password_reset_email_sent:
        "Se ha enviado un enlace para restablecer la contraseña a tu correo electrónico",
      welcome_subject: "Bienvenido",
      welcome_signup_message:
        "Hola {name},\n\n¡bienvenido a {appName}! Tu cuenta ha sido creada y está lista para usar.\n\nPuedes iniciar sesión en cualquier momento aquí:\n{loginURL}",
      welcome_admin_message:
        "Hola {name},\n\n{adminName} ha creado una cuenta de {appName} para ti.\n\nPuedes iniciar sesión con las siguientes credenciales:\nCorreo electrónico: {email}\nContraseña: {password}\n\nInicia sesión aquí:\n{loginURL}\n\nPor tu seguridad, cambia tu contraseña después de iniciar sesión por primera vez.",
      board_invite_subject: "Te han invitado a un tablero",
      board_invite_message:
        'Hola {name},\n\n{inviterName} te ha invitado al tablero "{boardName}" en {appName}.\n\nTu acceso: {permission}\n\nAbre el tablero aquí:\n{boardURL}',
      board_invite_permission_read: "solo lectura",
      board_invite_permission_edit: "lectura y escritura",
      account_deleted_subject: "Tu cuenta ha sido eliminada",
      account_deleted_message:
        "Hola {name},\n\ntu cuenta en {appName} ha sido eliminada por un administrador.\n\nMotivo:\n{reason}\n\nSi crees que se trata de un error, ponte en contacto con el administrador.",
    },
    fr: {
      reset_your_password_subject: "Réinitialiser votre mot de passe",
      reset_your_password_message:
        "Cliquez sur ce lien pour attribuer un nouveau mot de passe :",
      password_reset_success: "Mot de passe réinitialisé avec succès",
      password_reset_email_sent:
        "Un lien de réinitialisation de mot de passe a été envoyé à votre e-mail",
      welcome_subject: "Bienvenue",
      welcome_signup_message:
        "Bonjour {name},\n\nbienvenue sur {appName} ! Votre compte a été créé et est prêt à l'emploi.\n\nVous pouvez vous connecter à tout moment ici :\n{loginURL}",
      welcome_admin_message:
        "Bonjour {name},\n\n{adminName} a créé un compte {appName} pour vous.\n\nVous pouvez vous connecter avec les identifiants suivants :\nE-mail : {email}\nMot de passe : {password}\n\nConnectez-vous ici :\n{loginURL}\n\nPour votre sécurité, veuillez changer votre mot de passe après votre première connexion.",
      board_invite_subject: "Vous avez été invité à un tableau",
      board_invite_message:
        'Bonjour {name},\n\n{inviterName} vous a invité au tableau « {boardName} » sur {appName}.\n\nVotre accès : {permission}\n\nOuvrez le tableau ici :\n{boardURL}',
      board_invite_permission_read: "lecture seule",
      board_invite_permission_edit: "lecture et écriture",
      account_deleted_subject: "Votre compte a été supprimé",
      account_deleted_message:
        "Bonjour {name},\n\nvotre compte sur {appName} a été supprimé par un administrateur.\n\nMotif :\n{reason}\n\nSi vous pensez qu'il s'agit d'une erreur, veuillez contacter l'administrateur.",
    },
    it: {
      reset_your_password_subject: "Reimposta la password",
      reset_your_password_message:
        "Fai clic su questo link per assegnare una nuova password:",
      password_reset_success: "Password reimpostata con successo",
      password_reset_email_sent:
        "Il link per reimpostare la password è stato inviato alla tua email",
      welcome_subject: "Benvenuto",
      welcome_signup_message:
        "Ciao {name},\n\nbenvenuto su {appName}! Il tuo account è stato creato ed è pronto all'uso.\n\nPuoi accedere in qualsiasi momento qui:\n{loginURL}",
      welcome_admin_message:
        "Ciao {name},\n\n{adminName} ha creato un account {appName} per te.\n\nPuoi accedere con le seguenti credenziali:\nEmail: {email}\nPassword: {password}\n\nAccedi qui:\n{loginURL}\n\nPer la tua sicurezza, cambia la password dopo il primo accesso.",
      board_invite_subject: "Sei stato invitato a una board",
      board_invite_message:
        'Ciao {name},\n\n{inviterName} ti ha invitato alla board "{boardName}" su {appName}.\n\nIl tuo accesso: {permission}\n\nApri la board qui:\n{boardURL}',
      board_invite_permission_read: "sola lettura",
      board_invite_permission_edit: "lettura e scrittura",
      account_deleted_subject: "Il tuo account è stato eliminato",
      account_deleted_message:
        "Ciao {name},\n\nil tuo account su {appName} è stato eliminato da un amministratore.\n\nMotivo:\n{reason}\n\nSe pensi che sia un errore, contatta l'amministratore.",
    },
    nl: {
      reset_your_password_subject: "Wachtwoord resetten",
      reset_your_password_message:
        "Klik op deze link om een nieuw wachtwoord in te stellen:",
      password_reset_success: "Wachtwoord succesvol gereset",
      password_reset_email_sent:
        "Er is een wachtwoordresetlink verzonden naar uw e-mail",
      welcome_subject: "Welkom",
      welcome_signup_message:
        "Hallo {name},\n\nwelkom bij {appName}! Je account is aangemaakt en klaar voor gebruik.\n\nJe kunt op elk moment hier inloggen:\n{loginURL}",
      welcome_admin_message:
        "Hallo {name},\n\n{adminName} heeft een {appName}-account voor je aangemaakt.\n\nJe kunt inloggen met de volgende gegevens:\nE-mail: {email}\nWachtwoord: {password}\n\nLog hier in:\n{loginURL}\n\nWijzig voor je veiligheid je wachtwoord na je eerste keer inloggen.",
      board_invite_subject: "Je bent uitgenodigd voor een board",
      board_invite_message:
        'Hallo {name},\n\n{inviterName} heeft je uitgenodigd voor het board "{boardName}" op {appName}.\n\nJouw toegang: {permission}\n\nOpen het board hier:\n{boardURL}',
      board_invite_permission_read: "alleen lezen",
      board_invite_permission_edit: "lezen & schrijven",
      account_deleted_subject: "Je account is verwijderd",
      account_deleted_message:
        "Hallo {name},\n\nje account op {appName} is verwijderd door een beheerder.\n\nReden:\n{reason}\n\nAls je denkt dat dit een vergissing is, neem dan contact op met de beheerder.",
    },
    pl: {
      reset_your_password_subject: "Zresetuj hasło",
      reset_your_password_message:
        "Kliknij ten link, aby przypisać nowe hasło:",
      password_reset_success: "Hasło zresetowane pomyślnie",
      password_reset_email_sent:
        "Link do resetowania hasła został wysłany na Twój adres e-mail",
      welcome_subject: "Witamy",
      welcome_signup_message:
        "Cześć {name},\n\nwitamy w {appName}! Twoje konto zostało utworzone i jest gotowe do użycia.\n\nMożesz zalogować się w dowolnym momencie tutaj:\n{loginURL}",
      welcome_admin_message:
        "Cześć {name},\n\n{adminName} utworzył dla Ciebie konto {appName}.\n\nMożesz zalogować się przy użyciu następujących danych:\nE-mail: {email}\nHasło: {password}\n\nZaloguj się tutaj:\n{loginURL}\n\nDla bezpieczeństwa zmień hasło po pierwszym logowaniu.",
      board_invite_subject: "Zostałeś zaproszony do tablicy",
      board_invite_message:
        'Cześć {name},\n\n{inviterName} zaprosił Cię do tablicy „{boardName}” w {appName}.\n\nTwój dostęp: {permission}\n\nOtwórz tablicę tutaj:\n{boardURL}',
      board_invite_permission_read: "tylko odczyt",
      board_invite_permission_edit: "odczyt i zapis",
      account_deleted_subject: "Twoje konto zostało usunięte",
      account_deleted_message:
        "Cześć {name},\n\nTwoje konto w {appName} zostało usunięte przez administratora.\n\nPowód:\n{reason}\n\nJeśli uważasz, że to pomyłka, skontaktuj się z administratorem.",
    },
  };

  // Fallback to English if language not found or key not found
  const langTranslations = translations[language] || translations.en;
  return langTranslations[key] || translations.en[key] || key;
}

export function getEmailSubject(
  key: string,
  appName: string,
  language: string = "en",
): string {
  return `${translate(key, language)} | ${appName}`;
}

export function getEmailMessage(
  key: string,
  resetLink: string,
  language: string = "en",
): string {
  return `<p>${translate(key, language)}</p><p><a href='${resetLink}'>${resetLink}</a></p>`;
}

// Escape values interpolated into email HTML (name/adminName are user-supplied).
function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Fill a plain-text template (with {placeholders} and blank-line-separated
// paragraphs) and turn it into email HTML. All values are HTML-escaped; any
// placeholder whose key ends in "URL" becomes a clickable link.
function buildEmailHtml(
  template: string,
  vars: Record<string, string>,
): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    const escaped = escapeHtml(value ?? "");
    const replacement = /URL$/.test(key)
      ? `<a href="${escaped}">${escaped}</a>`
      : escaped;
    out = out.split(`{${key}}`).join(replacement);
  }
  return `<p>${out.replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>")}</p>`;
}

// Welcome email for a public self-signup (no credentials — the user chose them).
export function getWelcomeSignupEmail({
  appName,
  name,
  loginURL,
  language = "en",
}: {
  appName: string;
  name: string;
  loginURL: string;
  language?: string;
}): { subject: string; html: string } {
  return {
    subject: getEmailSubject("welcome_subject", appName, language),
    html: buildEmailHtml(translate("welcome_signup_message", language), {
      appName,
      name,
      loginURL,
    }),
  };
}

// Welcome email for an admin-created account — states who created it and
// includes the login credentials so the user can sign in.
export function getWelcomeAdminEmail({
  appName,
  name,
  adminName,
  email,
  password,
  loginURL,
  language = "en",
}: {
  appName: string;
  name: string;
  adminName: string;
  email: string;
  password: string;
  loginURL: string;
  language?: string;
}): { subject: string; html: string } {
  return {
    subject: getEmailSubject("welcome_subject", appName, language),
    html: buildEmailHtml(translate("welcome_admin_message", language), {
      appName,
      name,
      adminName,
      email,
      password,
      loginURL,
    }),
  };
}

// Board-invitation email — sent directly when a user is invited, with a link to
// the board and their access level (read-only vs read & write).
export function getBoardInviteEmail({
  appName,
  name,
  inviterName,
  boardName,
  permission,
  boardURL,
  language = "en",
}: {
  appName: string;
  name: string;
  inviterName: string;
  boardName: string;
  permission: string;
  boardURL: string;
  language?: string;
}): { subject: string; html: string } {
  const permissionLabel = translate(
    permission === "edit"
      ? "board_invite_permission_edit"
      : "board_invite_permission_read",
    language,
  );
  return {
    subject: getEmailSubject("board_invite_subject", appName, language),
    html: buildEmailHtml(translate("board_invite_message", language), {
      appName,
      name,
      inviterName,
      boardName,
      permission: permissionLabel,
      boardURL,
    }),
  };
}

// Account-deletion email — tells the user their account was removed and why,
// so a silent deletion doesn't leave them wondering.
export function getAccountDeletedEmail({
  appName,
  name,
  reason,
  language = "en",
}: {
  appName: string;
  name: string;
  reason: string;
  language?: string;
}): { subject: string; html: string } {
  return {
    subject: getEmailSubject("account_deleted_subject", appName, language),
    html: buildEmailHtml(translate("account_deleted_message", language), {
      appName,
      name,
      reason,
    }),
  };
}
