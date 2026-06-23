import { z } from "zod";
import { defineMcpTool } from "@nuxtjs/mcp-toolkit/server";
import { setupDatabase } from "../../../app/lib/databaseSetup";
import { getServerSocket } from "../../utils/socket";

const db = setupDatabase();

export default defineMcpTool({
  name: "createCard",
  description: "Create a new card in a specific area",
  annotations: {
    readOnlyHint: false,
  },
  inputSchema: {
    areaId: z.number().describe("The id of the area"),
    name: z.string().describe("The name of the card"),
    content: z.string().optional().describe("The content of the card"),
  },
  handler: async ({ areaId, name, content, status }) => {
    const event = useEvent();
    const userId = event.context.userId as string;

    if (!areaId || !name) {
      return textResult("areaId and name are required.");
    }

    if (!userId) {
      return textResult(
        "Authentication required. Please provide a valid API key.",
      );
    }

    try {
      // Get the board information
      const [boardRows] = await db.execute(
        "SELECT b.* FROM boards b JOIN areas a ON b.id = a.board WHERE a.id = ?",
        [areaId],
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

      // Get the current card count in the area to determine the sort order
      const [crows] = await db.execute("SELECT * FROM cards WHERE area = ?", [
        areaId,
      ]);

      const cardCount = crows ? crows.length + 1 : 0;

      // Create new card
      const [result] = await db.execute(
        "INSERT INTO cards (area, name, content, status, sort) VALUES (?, ?, ?, 0, ?)",
        [areaId, name, content || "", cardCount],
      );

      // Fetch the created card
      const [rows] = await db.execute("SELECT * FROM cards WHERE id = ?", [
        result.insertId,
      ]);
      const card = rows[0];

      // Get board information for notifications
      const [boardInfoRows] = await db.execute(
        "SELECT user, id AS boardId FROM boards WHERE id = (SELECT board FROM areas WHERE id = ?)",
        [areaId],
      );
      const boardOwner = boardInfoRows[0]?.user;
      const boardId = boardInfoRows[0]?.boardId;

      // Fetch all users who have access to the board (owner and invited users)
      const [invitedUsers] = await db.execute(
        "SELECT user FROM invitations WHERE board = (SELECT board FROM areas WHERE id = ?)",
        [areaId],
      );

      // Create notifications for the board owner and invited users
      const usersToNotify = [
        boardOwner,
        ...invitedUsers.map((inv) => inv.user),
      ].filter(Boolean);

      for (const notifyUserId of usersToNotify) {
        if (notifyUserId !== userId) {
          // Don't notify the user who created the card
          await db.execute(
            "INSERT INTO notifications (userId, type, boardId, cardId, message) VALUES (?, ?, ?, ?, ?)",
            [
              notifyUserId,
              "card_created",
              boardId,
              card.id,
              `New card created: ${card.name}`,
            ],
          );
        }
      }

      // Emit socket event for card creation
      const serverSocket = getServerSocket();
      if (serverSocket) {
        serverSocket.to(`board-${boardId}`).emit("addCard", {
          boardId: boardId,
          card: card,
        });
      }

      return jsonResult({ card });
    } catch (error) {
      logger.error("Database error:", error);
      return textResult("Internal server error.");
    }
  },
});
