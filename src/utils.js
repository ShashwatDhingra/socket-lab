import { inspect } from "node:util";

export function formatPayload(payload) {
  if (payload === undefined) {
    return "undefined";
  }

  if (typeof payload === "string") {
    return payload;
  }

  return inspect(payload, {
    depth: 6,
    colors: false,
    compact: true,
    breakLength: 100
  });
}

export function safeJsonParse(input) {
  try {
    return {
      ok: true,
      value: JSON.parse(input)
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Invalid JSON payload."
    };
  }
}

export function tokenizeCommand(input) {
  const trimmed = input.trim();

  if (!trimmed) {
    return [];
  }

  const parts = trimmed.split(/\s+/);
  const command = parts.shift();

  if (!command) {
    return [];
  }

  if (parts.length === 0) {
    return [command];
  }

  if (command === "emit") {
    const eventName = parts.shift();
    const payload = parts.join(" ");
    return payload ? [command, eventName, payload] : [command, eventName];
  }

  if (command === "say" || command === "msg") {
    const message = parts.join(" ");
    return message ? [command, message] : [command];
  }

  return [command, ...parts];
}

export function getTimestamp() {
  return new Date().toISOString();
}
