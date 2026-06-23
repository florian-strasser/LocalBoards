export default defineEventHandler(async (event) => {
  const method = event.req.method;
  if (method !== "GET") {
    event.res.statusCode = 405;
    return { error: "Method not allowed" };
  }

  try {
    const result = await resolveSession(event);

    if (result.status === "banned") {
      // Don't leak ban details
      event.res.statusCode = 403;
      return { error: "Access denied" };
    }

    if (result.status !== "ok") {
      event.res.statusCode = 401;
      return { error: "Session validation failed" };
    }

    // Never return the session token to the client.
    return {
      data: {
        session: result.session,
        user: result.user,
      },
    };
  } catch (error) {
    logger.error("Get session error:", error);
    event.res.statusCode = 500;
    return { error: "Internal server error" };
  }
});
