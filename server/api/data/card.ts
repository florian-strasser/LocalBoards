import { defineEventHandler, readBody, getQuery } from "h3";
import { setupDatabase } from "../../../app/lib/databaseSetup";

export default defineEventHandler(async (event) => {
  // Check the HTTP method
  const method = event.req.method;

  try {
    // Initialize database
    const db = setupDatabase();

    if (method === "GET") {
      // Handle GET request to fetch card details
      const { cardID } = getQuery(event);

      if (!cardID) {
        event.res.statusCode = 400;
        return { error: "Card ID is required" };
      }

      // Fetch card details
      const cardId = Array.isArray(cardID) ? cardID[0] : cardID;
      const [rows] = await db.execute("SELECT * FROM cards WHERE id = ?", [
        cardId,
      ]);
      const card = rows[0];

      if (!card) {
        event.res.statusCode = 404;
        return { error: "Card not found" };
      }

      // Convert status from number to boolean
      card.status = !!card.status;

      return { card };
    } else if (method === "POST") {
      // Handle POST request to create a new card
      const { areaId, name, content, status } = await readBody(event);

      if (!areaId || !name) {
        event.res.statusCode = 400;
        return { error: "Area ID and name are required" };
      }

      // Create new card
      const [result] = await db.execute(
        "INSERT INTO cards (area, name, content, status) VALUES (?, ?, ?, ?)",
        [areaId, name, content || "", status ? 1 : 0],
      );

      const [rows] = await db.execute("SELECT * FROM cards WHERE id = ?", [
        result.insertId,
      ]);
      const card = rows[0];

      return { card };
    } else if (method === "PUT") {
      // Handle PUT request to update an existing card
      const { cardID, name, content, status } = await readBody(event);

      if (!cardID || !name) {
        event.res.statusCode = 400;
        return { error: "Card ID and name are required" };
      }

      // Update the card
      await db.execute(
        "UPDATE cards SET name = ?, content = ?, status = ? WHERE id = ?",
        [name, content || "", status ? 1 : 0, cardID],
      );

      // Fetch the updated card
      const [rows] = await db.execute("SELECT * FROM cards WHERE id = ?", [
        cardID,
      ]);
      const card = rows[0];

      if (!card) {
        event.res.statusCode = 404;
        return { error: "Card not found" };
      }

      // Convert status from number to boolean
      card.status = !!card.status;

      return { card };
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
