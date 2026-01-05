import type { NitroApp } from "nitropack";
import { Server as Engine } from "engine.io";
import { Server } from "socket.io";
import { defineEventHandler } from "h3";

export default defineNitroPlugin((nitroApp: NitroApp) => {
  const engine = new Engine();
  const io = new Server();

  io.bind(engine);

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    // Handle joining a board
    socket.on("joinBoard", ({ boardId }) => {
      socket.join(`board-${boardId}`);
      socket.join(`user-${socket.id}`);
      console.log(`User ${socket.id} joined board ${boardId}`);
    });

    // Handle joining a card
    socket.on("joinCard", ({ cardID }) => {
      socket.join(`card-${cardID}`);
      socket.join(`user-${socket.id}`);
      console.log(`User ${socket.id} joined card ${cardID}`);
    });

    // CommentCreated
    socket.on("commentCreated", async ({ cardID, comment }) => {
      console.log(
        `Kommentar ${comment.id} wurde auf Card ${cardID} erstellt (user-${socket.id})`,
      );
      io.except(`user-${socket.id}`).to(`card-${cardID}`).emit("addComment", {
        comment,
      });
    });

    // BoardUpdated
    socket.on(
      "boardUpdated",
      async ({ boardID, boardName, boardStatus, boardStyle }) => {
        console.log(`Board ${boardID} wurde aktualisiert (user-${socket.id})`);
        io.except(`user-${socket.id}`)
          .to(`board-${boardID}`)
          .emit("updateBoard", {
            boardID,
            boardName,
            boardStatus,
            boardStyle,
          });
      },
    );

    // BoardDeleted
    socket.on("boardDeleted", async ({ boardID }) => {
      console.log(`Board ${boardID} wurde gelöscht (user-${socket.id})`);
      io.except(`user-${socket.id}`)
        .to(`board-${boardID}`)
        .emit("deletedBoard", {
          boardID,
        });
    });

    // AreasUpdated
    socket.on("areasUpdated", async ({ boardId, areas }) => {
      console.log(
        `Area-Sortierung wurde auf Board ${boardId} angepasst (user-${socket.id})`,
      );
      io.except(`user-${socket.id}`)
        .to(`board-${boardId}`)
        .emit("updateAreas", {
          areas,
        });
    });

    // AreaCreated
    socket.on("areaCreated", async ({ boardId, area }) => {
      console.log(
        `Area ${area.id} wurde auf Board ${boardId} erstellt (user-${socket.id})`,
      );
      io.except(`user-${socket.id}`).to(`board-${boardId}`).emit("addArea", {
        area,
      });
    });

    // AreaUpdated
    socket.on("areaUpdated", async ({ boardId, area }) => {
      console.log(
        `Area ${area.id} wurde auf Board ${boardId} aktualisiert (user-${socket.id})`,
      );
      io.except(`user-${socket.id}`).to(`board-${boardId}`).emit("updateArea", {
        area,
      });
    });

    // AreaDeleted
    socket.on("areaDeleted", async ({ boardId, area }) => {
      console.log(
        `Area ${area} wurde auf Board ${boardId} gelöscht (user-${socket.id})`,
      );
      io.except(`user-${socket.id}`).to(`board-${boardId}`).emit("deleteArea", {
        area,
      });
    });

    // CardCreated
    socket.on("cardCreated", async ({ boardId, card }) => {
      console.log(
        `Karte ${card.id} wurde auf Board ${boardId} erstellt (user-${socket.id})`,
      );
      io.except(`user-${socket.id}`).to(`board-${boardId}`).emit("addCard", {
        card,
      });
    });

    // CardUpdated
    socket.on("cardUpdated", async ({ boardId, card }) => {
      console.log(
        `Karte ${card.id} wurde auf Board ${boardId} aktualisiert (user-${socket.id})`,
      );
      io.except(`user-${socket.id}`).to(`board-${boardId}`).emit("updateCard", {
        card,
      });
    });

    // CardMoved
    socket.on(
      "cardMoved",
      async ({ boardId, cardId, fromAreaId, toAreaId, newIndex }) => {
        console.log(
          `Karte ${cardId} wurde von Area #${fromAreaId} zu #${toAreaId} auf Board ${boardId} geschoben (user-${socket.id})`,
        );
        io.except(`user-${socket.id}`)
          .to(`board-${boardId}`)
          .emit("movedCard", {
            cardId,
            fromAreaId,
            toAreaId,
            newIndex,
          });
      },
    );

    // CardOrderd
    socket.on("cardOrderd", async ({ boardId, cardId, areaId, newIndex }) => {
      console.log(
        `Karte ${cardId} wurde innerhalb von Area #${areaId} auf Board ${boardId} sortiert (user-${socket.id})`,
      );
      io.except(`user-${socket.id}`).to(`board-${boardId}`).emit("orderdCard", {
        cardId,
        areaId,
        newIndex,
      });
    });
  });

  nitroApp.router.use(
    "/socket.io/",
    defineEventHandler({
      handler(event) {
        engine.handleRequest(event.node.req, event.node.res);
        event._handled = true;
      },
      websocket: {
        open(peer) {
          // @ts-expect-error private method and property
          engine.prepare(peer._internal.nodeReq);
          // @ts-expect-error private method and property
          engine.onWebSocket(
            peer._internal.nodeReq,
            peer._internal.nodeReq.socket,
            peer.websocket,
          );
        },
      },
    }),
  );
});
