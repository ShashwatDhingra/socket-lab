import readline from "node:readline";
import { createCommandHandlers } from "./commands/index.js";
import { tokenizeCommand } from "./utils.js";

const COMMANDS = [
  "/emit",
  "/on",
  "/off",
  "/nick",
  "/join",
  "/use",
  "/leave",
  "/say",
  "/msg",
  "/chat",
  "/rooms",
  "/status",
  "/whoami",
  "/clear",
  "/history",
  "/help",
  "/exit"
];

export function startRepl({ socketManager, logger }) {
  let closing = false;

  const handlers = createCommandHandlers({
    socketManager,
    logEvent: logger.logEvent,
    logError: logger.logError,
    logInfo: logger.logInfo,
    persistEvent: logger.persistEvent,
    close: shutdown,
    clear: clearScreen
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: buildPrompt(),
    completer(line) {
      const trimmed = line.trimStart();
      const options = [...new Set([...COMMANDS, ...handlers._trackedEvents()])];
      const hits = options.filter((option) => option.startsWith(trimmed));
      return [hits.length > 0 ? hits : options, trimmed];
    }
  });

  socketManager.attachGlobalListener(async (eventName, payload) => {
    logger.logEvent(eventName, payload);
    await handlers._persistEvent(eventName, payload);
    refreshPrompt();
  });

  rl.on("line", async (line) => {
    const normalizedInput = normalizeInput(line);
    const [commandName, ...args] = tokenizeCommand(normalizedInput);

    if (!commandName) {
      refreshPrompt();
      return;
    }

    const command = handlers[commandName];

    if (!command) {
      logger.logError(`Unknown command: ${commandName}. Type "/help" for usage.`);
      refreshPrompt();
      return;
    }

    await command(args);

    if (!closing) {
      refreshPrompt();
    }
  });

  rl.on("SIGINT", () => {
    shutdown();
  });

  rl.on("close", () => {
    if (!closing) {
      shutdown();
    }
  });

  refreshPrompt();

  function shutdown() {
    if (closing) {
      return;
    }

    closing = true;
    socketManager.disconnect();
    rl.close();
    process.exit(0);
  }

  function clearScreen() {
    console.clear();
  }

  function normalizeInput(input) {
    const trimmed = input.trim();

    if (!trimmed) {
      return "";
    }

    if (trimmed.startsWith("/")) {
      return trimmed.slice(1);
    }

    return `say ${trimmed}`;
  }

  function buildPrompt() {
    const { currentUser, activeRoom } = handlers._meta();
    const roomLabel = activeRoom ?? "lobby";
    return `[${currentUser}@${roomLabel}] > `;
  }

  function refreshPrompt() {
    rl.setPrompt(buildPrompt());
    rl.prompt();
  }
}
