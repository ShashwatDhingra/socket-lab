# socket-lab

A terminal-first CLI for testing Socket.IO servers locally.

## Install

```bash
npm install -g socket-lab
```

Or run it without a global install:

```bash
npx socket-lab connect http://localhost:3000
```

## Usage

```bash
socket-lab connect http://localhost:3000
```

The REPL is chat-native:

- Slash commands drive control flow, for example `/join backend-room`
- Plain text is sent directly to the active room
- The prompt shows your active identity and room context

## Local Test Server

Run the included Express + Socket.IO server:

```bash
npm run test-server
```

Then connect the CLI in another terminal:

```bash
socket-lab connect http://localhost:3000
```

Try this sequence:

```bash
/nick john
/join backend-room
hello from terminal one
/status
/rooms
/history
```

Open another terminal and connect a second client:

```bash
socket-lab connect http://localhost:3000
/nick alice
/join backend-room
hello from terminal two
```

Both terminals will receive the shared `room_message` and `room_system` events.

## Slash Commands

- `/nick <username>`
- `/join <room_name>`
- `/use <room_name>`
- `/leave [room_name]`
- `/say <message>`
- `/msg <message>`
- `/rooms`
- `/status`
- `/whoami`
- `/clear`
- `/history`
- `/help`
- `/exit`

Advanced transport/debug commands still exist for power users:

- `/emit <event_name> <json_payload>`
- `/on <event_name>`
- `/off <event_name>`

## Notes

- All incoming events are logged with a global `onAny()` listener.
- Session logs are persisted to `.socket-lab.log` in the current working directory.
- Command and event-name autocomplete is available in the REPL.
