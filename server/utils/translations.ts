import {
  emailButton,
  emailFallbackLink,
  emailLayout,
  emailLink,
  emailParagraph,
  escapeEmailHtml,
} from "./emailLayout";

// Simple server-side translation utility for emails
// This avoids the i18n middleware requirement while still supporting translations

export function translate(key: string, language: string = "en"): string {
  const translations = {
    en: {
      welcome_cta: "Sign in",
      board_invite_cta: "Open board",
      reset_password_cta: "Set a new password",
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
      board_invite_signup_cta: "Create your account",
      board_invite_signup_message:
        'Hi,\n\n{inviterName} has invited you to the board "{boardName}" on {appName}.\n\nYour access: {permission}\n\nCreate your account with this link to join. It works once and expires in 14 days:\n{signupURL}',
      account_deleted_subject: "Your account has been deleted",
      account_deleted_message:
        "Hi {name},\n\nyour account on {appName} has been deleted by an administrator.\n\nReason:\n{reason}\n\nIf you think this was a mistake, please contact the administrator.",
    },
    de: {
      welcome_cta: "Anmelden",
      board_invite_cta: "Board öffnen",
      reset_password_cta: "Neues Passwort vergeben",
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
      board_invite_signup_cta: "Konto erstellen",
      board_invite_signup_message:
        'Hallo,\n\n{inviterName} hat dich zum Board "{boardName}" auf {appName} eingeladen.\n\nDein Zugriff: {permission}\n\nErstelle dein Konto über diesen Link, um beizutreten. Er funktioniert einmal und läuft in 14 Tagen ab:\n{signupURL}',
      account_deleted_subject: "Dein Konto wurde gelöscht",
      account_deleted_message:
        "Hallo {name},\n\ndein Konto bei {appName} wurde von einem Administrator gelöscht.\n\nGrund:\n{reason}\n\nWenn du denkst, dass dies ein Fehler war, wende dich bitte an den Administrator.",
    },
    es: {
      welcome_cta: "Iniciar sesión",
      board_invite_cta: "Abrir tablero",
      reset_password_cta: "Establecer nueva contraseña",
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
      board_invite_signup_cta: "Crear tu cuenta",
      board_invite_signup_message:
        'Hola:\n\n{inviterName} te ha invitado al tablero "{boardName}" en {appName}.\n\nTu acceso: {permission}\n\nCrea tu cuenta con este enlace para unirte. Funciona una sola vez y caduca en 14 días:\n{signupURL}',
      account_deleted_subject: "Tu cuenta ha sido eliminada",
      account_deleted_message:
        "Hola {name},\n\ntu cuenta en {appName} ha sido eliminada por un administrador.\n\nMotivo:\n{reason}\n\nSi crees que se trata de un error, ponte en contacto con el administrador.",
    },
    fr: {
      welcome_cta: "Se connecter",
      board_invite_cta: "Ouvrir le tableau",
      reset_password_cta: "Définir un nouveau mot de passe",
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
      board_invite_signup_cta: "Créer votre compte",
      board_invite_signup_message:
        'Bonjour,\n\n{inviterName} vous a invité au tableau "{boardName}" sur {appName}.\n\nVotre accès : {permission}\n\nCréez votre compte avec ce lien pour rejoindre le tableau. Il fonctionne une seule fois et expire dans 14 jours :\n{signupURL}',
      account_deleted_subject: "Votre compte a été supprimé",
      account_deleted_message:
        "Bonjour {name},\n\nvotre compte sur {appName} a été supprimé par un administrateur.\n\nMotif :\n{reason}\n\nSi vous pensez qu'il s'agit d'une erreur, veuillez contacter l'administrateur.",
    },
    it: {
      welcome_cta: "Accedi",
      board_invite_cta: "Apri la bacheca",
      reset_password_cta: "Imposta una nuova password",
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
      board_invite_signup_cta: "Crea il tuo account",
      board_invite_signup_message:
        'Ciao,\n\n{inviterName} ti ha invitato alla bacheca "{boardName}" su {appName}.\n\nIl tuo accesso: {permission}\n\nCrea il tuo account con questo link per partecipare. Funziona una sola volta e scade tra 14 giorni:\n{signupURL}',
      account_deleted_subject: "Il tuo account è stato eliminato",
      account_deleted_message:
        "Ciao {name},\n\nil tuo account su {appName} è stato eliminato da un amministratore.\n\nMotivo:\n{reason}\n\nSe pensi che sia un errore, contatta l'amministratore.",
    },
    nl: {
      welcome_cta: "Inloggen",
      board_invite_cta: "Bord openen",
      reset_password_cta: "Nieuw wachtwoord instellen",
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
      board_invite_signup_cta: "Account aanmaken",
      board_invite_signup_message:
        'Hallo,\n\n{inviterName} heeft je uitgenodigd voor het bord "{boardName}" op {appName}.\n\nJouw toegang: {permission}\n\nMaak je account aan via deze link om deel te nemen. Hij werkt één keer en verloopt over 14 dagen:\n{signupURL}',
      account_deleted_subject: "Je account is verwijderd",
      account_deleted_message:
        "Hallo {name},\n\nje account op {appName} is verwijderd door een beheerder.\n\nReden:\n{reason}\n\nAls je denkt dat dit een vergissing is, neem dan contact op met de beheerder.",
    },
    pl: {
      welcome_cta: "Zaloguj się",
      board_invite_cta: "Otwórz tablicę",
      reset_password_cta: "Ustaw nowe hasło",
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
      board_invite_signup_cta: "Utwórz konto",
      board_invite_signup_message:
        'Cześć,\n\n{inviterName} zaprosił(a) Cię do tablicy "{boardName}" w {appName}.\n\nTwój dostęp: {permission}\n\nUtwórz konto za pomocą tego linku, aby dołączyć. Działa jednorazowo i wygasa za 14 dni:\n{signupURL}',
      account_deleted_subject: "Twoje konto zostało usunięte",
      account_deleted_message:
        "Cześć {name},\n\nTwoje konto w {appName} zostało usunięte przez administratora.\n\nPowód:\n{reason}\n\nJeśli uważasz, że to pomyłka, skontaktuj się z administratorem.",
    },
    uk: {
      welcome_cta: "Увійти",
      board_invite_cta: "Відкрити дошку",
      reset_password_cta: "Задати новий пароль",
      reset_your_password_subject: "Скидання пароля",
      reset_your_password_message:
        "Натисніть це посилання, щоб задати новий пароль:",
      password_reset_success: "Пароль успішно скинуто",
      password_reset_email_sent:
        "Посилання для скидання пароля надіслано на вашу пошту",
      welcome_subject: "Ласкаво просимо",
      welcome_signup_message:
        "Вітаємо, {name}!\n\nЛаскаво просимо до {appName}! Ваш обліковий запис створено та готовий до роботи.\n\nУвійти можна будь-коли тут:\n{loginURL}",
      welcome_admin_message:
        "Вітаємо, {name}!\n\n{adminName} створив(-ла) для вас обліковий запис у {appName}.\n\nДані для входу:\nПошта: {email}\nПароль: {password}\n\nУвійти тут:\n{loginURL}\n\nЗ міркувань безпеки змініть пароль після першого входу.",
      board_invite_subject: "Вас запросили на дошку",
      board_invite_message:
        'Вітаємо, {name}!\n\n{inviterName} запросив(-ла) вас на дошку "{boardName}" у {appName}.\n\nВаш доступ: {permission}\n\nВідкрити дошку:\n{boardURL}',
      board_invite_permission_read: "лише читання",
      board_invite_permission_edit: "читання та запис",
      board_invite_signup_cta: "Створити обліковий запис",
      board_invite_signup_message:
        'Привіт!\n\n{inviterName} запросив(ла) вас до дошки "{boardName}" у {appName}.\n\nВаш доступ: {permission}\n\nСтворіть обліковий запис за цим посиланням, щоб приєднатися. Воно спрацює один раз і діє 14 днів:\n{signupURL}',
      account_deleted_subject: "Ваш обліковий запис видалено",
      account_deleted_message:
        "Вітаємо, {name}!\n\nВаш обліковий запис у {appName} видалено адміністратором.\n\nПричина:\n{reason}\n\nЯкщо ви вважаєте це помилкою, зверніться до адміністратора.",
    },
    pt: {
      welcome_cta: "Entrar",
      board_invite_cta: "Abrir quadro",
      reset_password_cta: "Definir nova senha",
      reset_your_password_subject: "Redefinir sua senha",
      reset_your_password_message:
        "Clique neste link para definir uma nova senha:",
      password_reset_success: "Senha redefinida com sucesso",
      password_reset_email_sent:
        "O link para redefinir a senha foi enviado para seu e-mail",
      welcome_subject: "Bem-vindo",
      welcome_signup_message:
        "Olá {name},\n\nbem-vindo ao {appName}! Sua conta foi criada e está pronta para uso.\n\nVocê pode entrar a qualquer momento aqui:\n{loginURL}",
      welcome_admin_message:
        "Olá {name},\n\n{adminName} criou uma conta do {appName} para você.\n\nVocê pode entrar com os seguintes dados:\nE-mail: {email}\nSenha: {password}\n\nEntre aqui:\n{loginURL}\n\nPor segurança, altere sua senha após o primeiro acesso.",
      board_invite_subject: "Você foi convidado para um quadro",
      board_invite_message:
        'Olá {name},\n\n{inviterName} convidou você para o quadro "{boardName}" no {appName}.\n\nSeu acesso: {permission}\n\nAbra o quadro aqui:\n{boardURL}',
      board_invite_permission_read: "somente leitura",
      board_invite_permission_edit: "leitura e escrita",
      board_invite_signup_cta: "Criar a sua conta",
      board_invite_signup_message:
        'Olá,\n\n{inviterName} convidou-o para o quadro "{boardName}" em {appName}.\n\nO seu acesso: {permission}\n\nCrie a sua conta com esta ligação para participar. Funciona uma vez e expira dentro de 14 dias:\n{signupURL}',
      account_deleted_subject: "Sua conta foi excluída",
      account_deleted_message:
        "Olá {name},\n\nsua conta no {appName} foi excluída por um administrador.\n\nMotivo:\n{reason}\n\nSe você acha que isso foi um engano, entre em contato com o administrador.",
    },
    cs: {
      welcome_cta: "Přihlásit se",
      board_invite_cta: "Otevřít nástěnku",
      reset_password_cta: "Nastavit nové heslo",
      reset_your_password_subject: "Obnovení hesla",
      reset_your_password_message:
        "Kliknutím na tento odkaz nastavíte nové heslo:",
      password_reset_success: "Heslo bylo úspěšně obnoveno",
      password_reset_email_sent:
        "Odkaz pro obnovení hesla byl odeslán na váš e-mail",
      welcome_subject: "Vítejte",
      welcome_signup_message:
        "Dobrý den, {name},\n\nvítejte v {appName}! Váš účet byl vytvořen a je připraven k použití.\n\nPřihlásit se můžete kdykoli zde:\n{loginURL}",
      welcome_admin_message:
        "Dobrý den, {name},\n\n{adminName} pro vás vytvořil(a) účet v {appName}.\n\nPřihlásit se můžete těmito údaji:\nE-mail: {email}\nHeslo: {password}\n\nPřihlaste se zde:\n{loginURL}\n\nZ bezpečnostních důvodů si po prvním přihlášení změňte heslo.",
      board_invite_subject: "Byli jste pozváni na nástěnku",
      board_invite_message:
        'Dobrý den, {name},\n\n{inviterName} vás pozval(a) na nástěnku "{boardName}" v {appName}.\n\nVáš přístup: {permission}\n\nOtevřete nástěnku zde:\n{boardURL}',
      board_invite_permission_read: "pouze čtení",
      board_invite_permission_edit: "čtení a zápis",
      board_invite_signup_cta: "Vytvořit účet",
      board_invite_signup_message:
        'Dobrý den,\n\n{inviterName} vás pozval(a) na nástěnku "{boardName}" v {appName}.\n\nVáš přístup: {permission}\n\nVytvořte si účet pomocí tohoto odkazu a připojte se. Funguje jednou a vyprší za 14 dní:\n{signupURL}',
      account_deleted_subject: "Váš účet byl smazán",
      account_deleted_message:
        "Dobrý den, {name},\n\nváš účet v {appName} byl smazán administrátorem.\n\nDůvod:\n{reason}\n\nPokud si myslíte, že jde o omyl, kontaktujte prosím administrátora.",
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
  return emailLayout(
    emailParagraph(escapeEmailHtml(translate(key, language))) +
      emailButton(resetLink, translate("reset_password_cta", language)) +
      emailFallbackLink(resetLink),
  );
}

// Fill a plain-text template (with {placeholders} and blank-line-separated
// paragraphs) and turn it into email HTML in the shared style — the same shell
// the notification mail uses (see utils/emailLayout.ts).
//
// All values are HTML-escaped. A placeholder whose key ends in "URL" is the
// mail's action: on its own line it becomes a button, with the raw link kept
// underneath for clients that strip it; inline it stays a plain link.
function buildEmailHtml(
  template: string,
  vars: Record<string, string>,
  ctaLabel?: string,
): string {
  const paragraphs = template.split("\n\n").map((paragraph) => {
    // The action link always ends a paragraph, either alone or under a line of
    // lead-in text ("Sign in here:\n{loginURL}"). Split it off so the text
    // stays a paragraph and the link becomes the button.
    const lines = paragraph.split("\n");
    const urlKey = lines[lines.length - 1]
      ?.trim()
      .match(/^\{(\w*URL)\}$/)?.[1];
    let action = "";
    if (urlKey && vars[urlKey]) {
      const url = vars[urlKey];
      action = ctaLabel
        ? emailButton(url, ctaLabel) + emailFallbackLink(url)
        : emailParagraph(emailLink(url));
      lines.pop();
      paragraph = lines.join("\n");
      if (!paragraph.trim()) return action;
    }
    let html = escapeEmailHtml(paragraph);
    for (const [key, value] of Object.entries(vars)) {
      const replacement = /URL$/.test(key)
        ? emailLink(value ?? "")
        : escapeEmailHtml(value ?? "");
      html = html.split(escapeEmailHtml(`{${key}}`)).join(replacement);
    }
    return emailParagraph(html) + action;
  });
  return emailLayout(paragraphs.join(""));
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
    html: buildEmailHtml(
      translate("welcome_signup_message", language),
      { appName, name, loginURL },
      translate("welcome_cta", language),
    ),
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
    html: buildEmailHtml(
      translate("welcome_admin_message", language),
      { appName, name, adminName, email, password, loginURL },
      translate("welcome_cta", language),
    ),
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
    html: buildEmailHtml(
      translate("board_invite_message", language),
      {
        appName,
        name,
        inviterName,
        boardName,
        permission: permissionLabel,
        boardURL,
      },
      translate("board_invite_cta", language),
    ),
  };
}

// The invitation sent to somebody who has no account yet: the same facts as the
// board invite above, but the link creates the account rather than opening the
// board, because there is nothing yet to open.
export function getBoardInviteSignupEmail({
  appName,
  inviterName,
  boardName,
  permission,
  signupURL,
  language = "en",
}: {
  appName: string;
  inviterName: string;
  boardName: string;
  permission: string;
  signupURL: string;
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
    html: buildEmailHtml(
      translate("board_invite_signup_message", language),
      {
        appName,
        inviterName,
        boardName,
        permission: permissionLabel,
        signupURL,
      },
      translate("board_invite_signup_cta", language),
    ),
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
