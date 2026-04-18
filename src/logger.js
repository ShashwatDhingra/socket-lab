import chalk from "chalk";
import { appendFile } from "node:fs/promises";
import path from "node:path";
import { formatPayload, getTimestamp } from "./utils.js";

const SESSION_LOG_FILE = path.resolve(process.cwd(), ".socket-lab.log");

function write(prefix, message, color = (value) => value) {
  console.log(color(`${prefix} ${message}`));
}

export function logConnecting(url) {
  write("[CONNECTING]", url, chalk.cyan);
}

export function logConnected(url) {
  write("[CONNECTED]", url, chalk.green);
}

export function logInfo(message) {
  write("[INFO]", message, chalk.blue);
}

export function logError(message) {
  write("[ERROR]", message, chalk.red);
}

export function logEvent(eventName, payload) {
  write("[EVENT]", `${eventName}: ${formatPayload(payload)}`, chalk.yellow);
}

export async function persistEvent(eventName, payload) {
  const line = `${getTimestamp()} ${eventName} ${formatPayload(payload)}\n`;
  await appendFile(SESSION_LOG_FILE, line, "utf8");
}

export function getSessionLogFile() {
  return SESSION_LOG_FILE;
}
