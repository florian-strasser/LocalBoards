import { Server } from "socket.io";

let serverSocket: Server;

export function setServerSocket(socket: Server) {
  serverSocket = socket;
}

export function getServerSocket(): Server {
  if (!serverSocket) {
    throw new Error("Server socket not initialized");
  }
  return serverSocket;
}
