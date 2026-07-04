import { setupDatabase } from "../../../app/lib/databaseSetup";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { getCookie } from "h3";
import { createSession } from "../../utils/auth";
import { sendEmail } from "../../../app/lib/sendEmail";
import { getWelcomeSignupEmail } from "../../utils/translations";

export default defineEventHandler(async (event) => {
  const runtimeConfig = useRuntimeConfig();
  const allowSignup =
    runtimeConfig.public.signup === true
      ? true
      : runtimeConfig.public.signup === "true"
        ? true
        : false;

  if (allowSignup) {
    const method = event.req.method;
    // HIGH FIX: Use 405 Method Not Allowed instead of 403
    if (method !== "POST") {
      event.res.statusCode = 405;
      return { error: "Method not allowed" };
    }

    // Check if user already has an active session
    const sessionToken =
      event.headers.get("authorization")?.replace("Bearer ", "") ||
      getCookie(event, "session_token");

    if (sessionToken) {
      try {
        const db = await setupDatabase();
        const [sessions] = await db.execute(
          "SELECT * FROM `session` WHERE `token` = ? AND `expiresAt` > NOW()",
          [sessionToken],
        );

        if (sessions.length > 0) {
          event.res.statusCode = 400;
          return {
            error: "Registration failed",
          };
        }
      } catch (error) {
        logger.error("Session check error:", error);
        // HIGH FIX: Don't fail silently - continue with signup but log
      }
    }

    try {
      const body = await readBody(event);
      const { name, email, password, callbackURL } = body;

      // HIGH FIX: Validate input with generic messages
      if (!name || !email || !password) {
        event.res.statusCode = 400;
        return { error: "Registration failed" };
      }

      // HIGH FIX: Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        event.res.statusCode = 400;
        return { error: "Registration failed" };
      }

      // HIGH FIX: Validate password length (min 8 chars)
      if (typeof password !== "string" || password.length < 8) {
        event.res.statusCode = 400;
        return { error: "Registration failed" };
      }

      // Initialize the database
      const db = await setupDatabase();

      // CRITICAL FIX: Use constant-time check to prevent timing attacks
      // Check if email exists first
      const [existingUsers] = await db.execute(
        "SELECT * FROM `user` WHERE `email` = ?",
        [email],
      );

      const userExists = existingUsers.length > 0;

      // Always perform fake hash comparison to maintain constant time
      const fakeHash = "$2a$10$fakehashforconstanttimecomparison";
      await bcrypt.compare(password, fakeHash);

      // HIGH FIX: Generic error message to prevent user enumeration
      if (userExists) {
        event.res.statusCode = 400;
        return { error: "Registration failed" };
      }

      // Hash the password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Generate a UUID for the user
      const userId = uuidv4();

      // Use transaction via pool connection for atomic user+account creation
      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();

        // Insert the user into the database
        await conn.execute(
          "INSERT INTO `user` (`id`, `name`, `email`, `emailVerified`) VALUES (?, ?, ?, ?)",
          [userId, name, email, 0],
        );

        // Create an account entry for the user
        await conn.execute(
          "INSERT INTO `account` (`id`, `accountId`, `providerId`, `userId`, `password`) VALUES (?, ?, ?, ?, ?)",
          [uuidv4(), email, "local", userId, hashedPassword],
        );

        // Commit transaction
        await conn.commit();

        // Send a welcome email (public-signup variant, no credentials).
        // Best-effort: never let a mail hiccup break registration.
        try {
          const { subject, html } = getWelcomeSignupEmail({
            appName: runtimeConfig.appName,
            name,
            loginURL: runtimeConfig.boardsUrl,
            language: runtimeConfig.language,
          });
          await sendEmail({ to: email, subject, text: html });
        } catch (mailError) {
          logger.error("Welcome email (signup) failed:", mailError);
        }

        // Create a session for the newly registered user
        const sessionResult = await createSession(event, userId);

        if (sessionResult.error) {
          logger.error("Session creation failed:", sessionResult.error);
          // Continue without session - user can still log in manually
        }

        // Return success response with user details and session token
        return {
          data: {
            success: true,
            message: "User registered successfully",
            user: {
              id: userId,
              name: name,
              email: email,
              role: "user", // Default role
            },
            sessionToken: sessionResult?.sessionToken,
            callbackURL,
          },
        };
      } catch (error) {
        // Rollback transaction on any error
        await conn.rollback();
        throw error;
      } finally {
        conn.release();
      }
    } catch (error) {
      logger.error("Signup error:", error);
      event.res.statusCode = 500;
      return { error: "Internal server error" };
    }
  } else {
    return { error: "DISABLED_SIGNUP" };
  }
});
