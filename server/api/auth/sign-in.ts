import { setupDatabase } from "../../../app/lib/databaseSetup";
// import { createSession } from "../../utils/auth";
import bcrypt from "bcryptjs";

export default defineEventHandler(async (event) => {
  const method = event.req.method;
  if (method !== "POST") {
    event.res.statusCode = 403;
    return { error: "Unauthorized access" };
  }

  try {
    const body = await readBody(event);
    const { email, password, callbackURL } = body;

    // Validate input
    if (!email || !password) {
      event.res.statusCode = 400;
      return { error: "Email and password are required" };
    }

    // Initialize the database
    const db = await setupDatabase();

    // Fetch the user from the database
    const [users] = await db.execute("SELECT * FROM `user` WHERE `email` = ?", [
      email,
    ]);

    if (users.length === 0) {
      event.res.statusCode = 401;
      return { error: "INVALID_EMAIL_OR_PASSWORD" };
    }

    const user = users[0];

    // Fetch the account details to get the hashed password
    const [accounts] = await db.execute(
      "SELECT * FROM `account` WHERE `userId` = ? AND `providerId` = ?",
      [user.id, "local"],
    );

    if (accounts.length === 0) {
      event.res.statusCode = 401;
      return { error: "INVALID_EMAIL_OR_PASSWORD" };
    }

    const account = accounts[0];

    // Compare the provided password with the hashed password
    const isPasswordValid = await bcrypt.compare(password, account.password);

    if (!isPasswordValid) {
      event.res.statusCode = 401;
      return { error: "INVALID_EMAIL_OR_PASSWORD" };
    }

    // Create a session for the user
    const sessionResult = await createSession(event, user.id);

    if (sessionResult.error) {
      console.error("Session creation failed:", sessionResult.error);
      event.res.statusCode = 500;
      return { error: "Failed to create session" };
    }

    // Return success response with user details and session token
    return {
      data: {
        success: true,
        message: "User signed in successfully",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        sessionToken: sessionResult.sessionToken,
        callbackURL,
      },
    };
  } catch (error) {
    console.error("Sign-in error:", error);
    event.res.statusCode = 500;
    return { error: "Internal server error" };
  }
});
