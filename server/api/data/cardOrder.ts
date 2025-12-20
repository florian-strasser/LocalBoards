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
        // Update the card's sort order
        await db.execute("UPDATE cards SET sort = ? WHERE id = ?", [
          newIndex,
          cardId,
        ]);

        // Update sort order of other cards in the same area
        const [cardsInArea] = await db.execute(
          "SELECT id FROM cards WHERE area = ? AND id != ?",
          [areaId, cardId],
        );

        let currentIndex = 0;
        for (const card of cardsInArea) {
          if (currentIndex === newIndex) {
            currentIndex++;
          }
          await db.execute("UPDATE cards SET sort = ? WHERE id = ?", [
            currentIndex,
            card.id,
          ]);
          currentIndex++;
        }

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
