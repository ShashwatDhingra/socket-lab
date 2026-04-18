import {
  getSessionLogFile,
  logConnected,
  logConnecting,
  logError,
  logEvent,
  logInfo,
  persistEvent
} from "./logger.js";
import { startRepl } from "./repl.js";
import { SocketManager } from "./socket.js";

function printUsage() {
  console.log("Usage:");
  console.log("  socket-lab connect <url>");
  console.log("");
  console.log("Example:");
  console.log("  socket-lab connect http://localhost:3000");
}

export function runCli(argv = process.argv.slice(2)) {
  const [command, url] = argv;
  let replStarted = false;

  if (command !== "connect" || !url) {
    printUsage();
    process.exit(command ? 1 : 0);
  }

  const socketManager = new SocketManager();

  logConnecting(url);

  const socket = socketManager.connect(url);

  socket.on("connect", () => {
    if (!replStarted) {
      replStarted = true;
      logConnected(url);
      logInfo(`Session log: ${getSessionLogFile()}`);
      startRepl({
        socketManager,
        logger: {
          logConnected,
          logConnecting,
          logError,
          logEvent,
          logInfo,
          persistEvent
        }
      });
      return;
    }

    logInfo("Connection restored");
  });

  socket.on("connect_error", (error) => {
    logError(`Connection failed: ${error.message}`);
  });

  socket.on("disconnect", (reason) => {
    logInfo(`Disconnected: ${reason}`);
  });

  socket.io.on("reconnect_attempt", (attempt) => {
    logInfo(`Reconnecting (attempt ${attempt})`);
  });

  socket.io.on("reconnect", () => {
    logInfo("Reconnected");
  });
}
