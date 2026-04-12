import { setupDatabase } from "../../../app/lib/databaseSetup";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { getCookie } from "h3";

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
    if (method !== "POST") {
      event.res.statusCode = 403;
      return { error: "Unauthorized access" };
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
            error:
              "Active session detected. Please log out first before creating a new account.",
          };
        }
      } catch (error) {
        console.error("Session check error:", error);
      }
    }

    try {
      const body = await readBody(event);
      const { name, email, password, callbackURL } = body;

      // Validate input
      if (!name || !email || !password) {
        event.res.statusCode = 400;
        return { error: "Name, email, and password are required" };
      }

      // Initialize the database
      const db = await setupDatabase();

      // Check if the user already exists
      const [existingUsers] = await db.execute(
        "SELECT * FROM `user` WHERE `email` = ?",
        [email],
      );

      if (existingUsers.length > 0) {
        event.res.statusCode = 400;
        return { error: "User with this email already exists" };
      }

      // Hash the password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Generate a UUID for the user
      const userId = uuidv4();

      // Insert the user into the database
      await db.execute(
        "INSERT INTO `user` (`id`, `name`, `email`, `emailVerified`) VALUES (?, ?, ?, ?)",
        [userId, name, email, 0],
      );

      // Optionally, create an account entry for the user
      await db.execute(
        "INSERT INTO `account` (`id`, `accountId`, `providerId`, `userId`, `password`) VALUES (?, ?, ?, ?, ?)",
        [uuidv4(), email, "local", userId, hashedPassword],
      );

      // Create a session for the newly registered user
      const sessionResult = await createSession(event, userId);

      if (sessionResult.error) {
        console.error("Session creation failed:", sessionResult.error);
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
      console.error("Signup error:", error);
      event.res.statusCode = 500;
      return { error: "Internal server error" };
    }
  } else {
    return { error: "DISABLED_SIGNUP" };
  }
});
