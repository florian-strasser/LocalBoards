import { defineEventHandler, readBody } from "h3";
import { setupDatabase } from "../../../app/lib/databaseSetup";

export default defineEventHandler(async (event) => {
  const method = event.req.method;

  try {
    const db = setupDatabase();

    if (method === "POST") {
      const { cardId, areaId, newIndex } = await readBody(event);

      if (!cardId || !areaId || newIndex === undefined) {
        event.res.statusCode = 400;
        return { error: "Card ID, areaId, and newIndex are required" };
      }

      try {
        // Update sort order of other cards in the destination area
        await db.execute(
          "UPDATE cards SET sort = sort + 1 WHERE sort >= ? AND area = ?",
          [newIndex, areaId],
        );

        // Update the card's sort order
        await db.execute("UPDATE cards SET sort = ? WHERE id = ?", [
          newIndex,
          cardId,
        ]);

        return { success: true };
      } catch (error) {
        return { error: error };
      }
    } else {
      event.res.statusCode = 405;
      return { error: "Method not allowed" };
    }
  } catch (error) {
    console.error("Database error:", error);
    event.res.statusCode = 500;
    return { error: "Internal Server error" };
  }
});
