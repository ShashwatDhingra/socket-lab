import { formatPayload, safeJsonParse } from "../utils.js";

export function createCommandHandlers({ socketManager, logEvent, logError, logInfo, persistEvent, close, clear }) {
  const trackedEvents = new Set();
  const listeners = new Map();
  let currentUser = "guest";
  let activeRoom = null;

  function emitHelper(eventName, payload, successMessage) {
    socketManager.emit(eventName, payload);
    trackedEvents.add(eventName);
    if (successMessage) {
      logInfo(successMessage);
    }
  }

  function requireActiveRoom() {
    if (activeRoom) {
      return true;
    }

    logError('No active room. Use "/join <room_name>" first.');
    return false;
  }

  return {
    emit(args) {
      const [eventName, payloadInput] = args;

      if (!eventName || !payloadInput) {
        logError("Usage: emit <event_name> <json_payload>");
        return;
      }

      const parsed = safeJsonParse(payloadInput);

      if (!parsed.ok) {
        logError(`Invalid JSON payload: ${parsed.error}`);
        return;
      }

      emitHelper(eventName, parsed.value, `Emitted ${eventName}`);
    },

    on(args) {
      const [eventName] = args;

      if (!eventName) {
        logError("Usage: on <event_name>");
        return;
      }

      if (listeners.has(eventName)) {
        logInfo(`Already listening to ${eventName}`);
        return;
      }

      const listener = () => {};
      socketManager.on(eventName, listener);
      listeners.set(eventName, listener);
      trackedEvents.add(eventName);
      logInfo(`Listening to ${eventName}`);
    },

    off(args) {
      const [eventName] = args;

      if (!eventName) {
        logError("Usage: off <event_name>");
        return;
      }

      const listener = listeners.get(eventName);

      if (!listener) {
        logInfo(`No explicit listener found for ${eventName}`);
        return;
      }

      socketManager.off(eventName, listener);
      listeners.delete(eventName);
      logInfo(`Removed listeners for ${eventName}`);
    },

    nick(args) {
      const [username] = args;

      if (!username) {
        logError("Usage: nick <username>");
        return;
      }

      currentUser = username;
      emitHelper("set_name", { user: username }, `Set username to ${username}`);
    },

    join(args) {
      const [roomName] = args;

      if (!roomName) {
        logError("Usage: join <room_name>");
        return;
      }
      activeRoom = roomName;
      emitHelper("join_room", { room: roomName, user: currentUser }, `Joined room ${roomName} and made it active`);
    },

    leave(args) {
      const [roomName = activeRoom] = args;

      if (!roomName) {
        logError("Usage: leave <room_name>");
        return;
      }

      emitHelper("leave_room", { room: roomName, user: currentUser }, `Left room ${roomName}`);

      if (activeRoom === roomName) {
        activeRoom = null;
      }
    },

    say(args) {
      const [message] = args;

      if (!requireActiveRoom()) {
        return;
      }

      if (!message) {
        logError("Usage: say <message>");
        return;
      }

      emitHelper(
        "room_message",
        { room: activeRoom, from: currentUser, text: message },
        `Sent message to ${activeRoom}`
      );
    },

    msg(args) {
      this.say(args);
    },

    chat(args) {
      this.say(args);
    },

    rooms() {
      emitHelper("list_rooms", {}, "Requested room list");
    },

    use(args) {
      const [roomName] = args;

      if (!roomName) {
        logError("Usage: use <room_name>");
        return;
      }

      activeRoom = roomName;
      logInfo(`Active room set to ${roomName}`);
    },

    status() {
      logInfo(`User: ${currentUser}`);
      logInfo(`Active room: ${activeRoom ?? "none"}`);
    },

    clear() {
      clear();
    },

    whoami() {
      this.status();
    },

    history() {
      const history = socketManager.getHistory();

      if (history.length === 0) {
        logInfo("No events received yet.");
        return;
      }

      history.forEach((entry, index) => {
        console.log(`${index + 1}. ${entry.eventName} -> ${formatPayload(entry.payload)}`);
      });
    },

    help() {
      console.log("Available commands:");
      console.log("  emit <event_name> <json_payload>  Emit an event with a JSON payload");
      console.log("  on <event_name>                   Listen to an event");
      console.log("  off <event_name>                  Remove listeners for an event");
      console.log("  /nick <username>                  Set your chat username");
      console.log("  /join <room_name>                 Join or create a room and make it active");
      console.log("  /use <room_name>                  Switch the active room");
      console.log("  /leave [room_name]                Leave a room, defaults to active room");
      console.log("  /say <message>                    Send a message to the active room");
      console.log("  /msg <message>                    Alias for /say");
      console.log("  /rooms                            Request active room list");
      console.log("  /status                           Show current username and active room");
      console.log("  /whoami                           Alias for /status");
      console.log("  /clear                            Clear the terminal");
      console.log("  Plain text                        Send directly to the active room");
      console.log("  /history                          Show received event history");
      console.log("  /help                             Show this help message");
      console.log("  /exit                             Disconnect and quit");
    },

    exit() {
      close();
    },

    _trackedEvents() {
      socketManager.getHistory().forEach((entry) => trackedEvents.add(entry.eventName));
      return [...trackedEvents].sort();
    },

    _meta() {
      return {
        currentUser,
        activeRoom
      };
    },

    async _persistEvent(eventName, payload) {
      try {
        await persistEvent(eventName, payload);
      } catch (error) {
        logError(`Could not write session log: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }
  };
}
