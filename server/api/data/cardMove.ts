import { defineEventHandler, readBody } from "h3";
import { setupDatabase } from "../../../app/lib/databaseSetup";

export default defineEventHandler(async (event) => {
  const method = event.req.method;

  try {
    const db = setupDatabase();

    if (method === "POST") {
      const { cardId, fromAreaId, toAreaId, newIndex } = await readBody(event);

      if (!cardId || !fromAreaId || !toAreaId || newIndex === undefined) {
        event.res.statusCode = 400;
        return {
          error: "Card ID, fromAreaId, toAreaId, and newIndex are required",
        };
      }

      try {
        // Update the card's area and sort order
        await db.execute("UPDATE cards SET area = ?, sort = ? WHERE id = ?", [
          toAreaId,
          newIndex,
          cardId,
        ]);

        // Update sort order of other cards in the destination area
        const [cardsInArea] = await db.execute(
          "SELECT id FROM cards WHERE area = ? AND id != ?",
          [toAreaId, cardId],
        );

        let currentIndex = 0;
        for (const card of cardsInArea) {
          if (currentIndex < newIndex) {
            currentIndex++;
            continue;
          }
          await db.execute("UPDATE cards SET sort = ? WHERE id = ?", [
            currentIndex,
            card.id,
          ]);
          currentIndex++;
        }

        return { success: true };
      } catch (error) {
        throw error;
      }
    } else {
      event.res.statusCode = 405;
      return { error: "Method not allowed" };
    }
  } catch (error) {
    console.error("Database error:", error);
    event.res.statusCode = 500;
    return { error: "Internal server error" };
  }
});
