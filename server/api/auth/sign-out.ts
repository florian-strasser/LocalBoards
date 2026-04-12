import { setupDatabase } from "../../../app/lib/databaseSetup";
import { deleteCookie, getCookie } from "h3";

export default defineEventHandler(async (event) => {
  const method = event.req.method;
  if (method !== "POST") {
    event.res.statusCode = 405;
    return { error: "Method not allowed" };
  }

  try {
    // Extract session token from headers or cookies
    const sessionToken =
      event.headers.get("authorization")?.replace("Bearer ", "") ||
      getCookie(event, "session_token");

    if (!sessionToken) {
      event.res.statusCode = 400;
      return { error: "No active session to logout" };
    }

    const db = await setupDatabase();

    // Delete the session from database
    await db.execute("DELETE FROM `session` WHERE `token` = ?", [sessionToken]);

    // Delete the session cookie
    deleteCookie(event, "session_token", {
      path: "/",
    });

    return {
      success: true,
      message: "Successfully logged out",
    };
  } catch (error) {
    console.error("Logout error:", error);
    event.res.statusCode = 500;
    return { error: "Internal server error" };
  }
});
