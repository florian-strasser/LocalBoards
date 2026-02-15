import { z } from "zod";
import { defineMcpTool } from "@nuxtjs/mcp-toolkit/server";
import { setupDatabase } from "../../../app/lib/databaseSetup";

const db = setupDatabase();

export default defineMcpTool({
  name: "updateCard",
  description: "Update an existing card",
  annotations: {
    readOnlyHint: false,
  },
  inputSchema: {
    cardID: z.number().describe("The id of the card"),
    name: z.string().describe("The name of the card"),
    content: z.string().optional().describe("The content of the card"),
    status: z
      .boolean()
      .optional()
      .describe(
        "The status of the card. 0 means uncompleted, 1 means completed.",
      ),
  },
  handler: async ({ cardID, name, content, status }) => {
    const event = useEvent();
    const userId = event.context.userId as string;

    if (!cardID || !name) {
      return textResult("cardID and name are required.");
    }

    if (!userId) {
      return textResult(
        "Authentication required. Please provide a valid API key.",
      );
    }

    try {
      // Fetch card details
      const [cardRows] = await db.execute("SELECT * FROM cards WHERE id = ?", [
        cardID,
      ]);
      const card = cardRows[0];

      if (!card) {
        return textResult("Card not found.");
      }

      // Get the board information
      const [boardRows] = await db.execute(
        "SELECT b.* FROM boards b JOIN areas a ON b.id = a.board WHERE a.id = ?",
        [card.area],
      );
      const board = boardRows[0];

      if (!board) {
        return textResult("Board not found.");
      }

      // Check if the user has write access to the board
      let writeAccess = false;
      if (board.status === "private" && board.user !== userId) {
        // Check if the user has an invitation
        const [invitationRows] = await db.execute(
          "SELECT permission FROM invitations WHERE board = ? AND user = ?",
          [board.id, userId],
        );

        if (invitationRows.length > 0) {
          writeAccess = invitationRows[0].permission === "edit";
        }
      } else if (board.user === userId) {
        // User is the creator of the board, so they have write access
        writeAccess = true;
      } else if (board.status === "public") {
        writeAccess = true;
      }

      if (!writeAccess) {
        return textResult("Unauthorized access.");
      }

      // Fetch the original card to check if status changed
      const [originalCardRows] = await db.execute(
        "SELECT * FROM cards WHERE id = ?",
        [cardID],
      );
      const originalCard = originalCardRows[0];
      const originalStatus = !!originalCard.status;
      const newStatus = !!status;

      // Update the card
      await db.execute(
        "UPDATE cards SET name = ?, content = ?, status = ? WHERE id = ?",
        [name, content || "", status ? 1 : 0, cardID],
      );

      // Fetch the updated card
      const [rows] = await db.execute("SELECT * FROM cards WHERE id = ?", [
        cardID,
      ]);
      const updatedCard = rows[0];

      if (!updatedCard) {
        return textResult("Card not found.");
      }

      // Convert status from number to boolean
      updatedCard.status = !!updatedCard.status;

      // Create notification if status changed
      if (originalStatus !== newStatus) {
        // Get board information for notifications
        const [boardInfoRows] = await db.execute(
          "SELECT user, id AS boardId FROM boards WHERE id = (SELECT board FROM areas WHERE id = ?)",
          [updatedCard.area],
        );
        const boardOwner = boardInfoRows[0]?.user;
        const boardId = boardInfoRows[0]?.boardId;

        // Fetch all users who have access to the board (owner and invited users)
        const [invitedUsers] = await db.execute(
          "SELECT user FROM invitations WHERE board = (SELECT board FROM areas WHERE id = ?)",
          [updatedCard.area],
        );

        // Create notifications for the board owner and invited users
        const usersToNotify = [
          boardOwner,
          ...invitedUsers.map((inv) => inv.user),
        ].filter(Boolean);

        const statusText = newStatus ? "completed" : "reopened";
        const notificationMessage = `Card "${updatedCard.name}" status changed to ${statusText}`;

        for (const notifyUserId of usersToNotify) {
          if (notifyUserId !== userId) {
            // Don't notify the user who changed the status
            await db.execute(
              "INSERT INTO notifications (userId, type, boardId, cardId, message) VALUES (?, ?, ?, ?, ?)",
              [
                notifyUserId,
                "card_status_changed",
                boardId,
                updatedCard.id,
                notificationMessage,
              ],
            );
          }
        }
      }

      return jsonResult({ card: updatedCard });
    } catch (error) {
      console.error("Database error:", error);
      return textResult("Internal server error.");
    }
  },
});
