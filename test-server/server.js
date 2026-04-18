import express from "express";
import http from "node:http";
import { Server } from "socket.io";

const PORT = Number(process.env.PORT) || 3000;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

app.use(express.json());

app.get("/", (_request, response) => {
  response.json({
    name: "socket-lab test server",
    status: "ok",
    socketPath: "/socket.io"
  });
});

app.get("/health", (_request, response) => {
  response.json({ ok: true });
});

io.on("connection", (socket) => {
  socket.data.username = String(socket.handshake.query.user || `guest-${socket.id.slice(0, 5)}`);

  console.log(`[server] connected ${socket.id}`);

  socket.emit("notification", {
    message: `welcome ${socket.data.username}`,
    socketId: socket.id,
    user: socket.data.username
  });

  socket.emit("rooms", []);

  socket.on("login", (payload = {}) => {
    const user = typeof payload?.user === "string" ? payload.user : "guest";

    socket.emit("message", `hello ${user}`);
    socket.emit("notification", {
      type: "login",
      message: `${user} logged in`
    });
    socket.broadcast.emit("presence", {
      user,
      status: "online"
    });
  });

  socket.on("set_name", (payload = {}) => {
    const user = typeof payload?.user === "string" && payload.user.trim() ? payload.user.trim() : socket.data.username;
    const previousUser = socket.data.username;

    socket.data.username = user;
    socket.emit("notification", {
      type: "set_name",
      message: `username updated from ${previousUser} to ${user}`,
      user
    });
  });

  socket.on("join_room", (payload = {}) => {
    const room = typeof payload?.room === "string" ? payload.room.trim() : "";

    if (!room) {
      socket.emit("error_notice", { message: "room name is required" });
      return;
    }

    socket.join(room);
    socket.emit("room_joined", {
      room,
      user: socket.data.username
    });
    io.to(room).emit("room_system", {
      room,
      message: `${socket.data.username} joined ${room}`,
      user: socket.data.username
    });
  });

  socket.on("leave_room", (payload = {}) => {
    const room = typeof payload?.room === "string" ? payload.room.trim() : "";

    if (!room) {
      socket.emit("error_notice", { message: "room name is required" });
      return;
    }

    socket.leave(room);
    socket.emit("room_left", {
      room,
      user: socket.data.username
    });
    io.to(room).emit("room_system", {
      room,
      message: `${socket.data.username} left ${room}`,
      user: socket.data.username
    });
  });

  socket.on("room_message", (payload = {}) => {
    const room = typeof payload?.room === "string" ? payload.room.trim() : "";
    const text = typeof payload?.text === "string" ? payload.text.trim() : "";

    if (!room || !text) {
      socket.emit("error_notice", { message: "room and text are required" });
      return;
    }

    if (!socket.rooms.has(room)) {
      socket.emit("error_notice", { message: `join ${room} before sending messages` });
      return;
    }

    io.to(room).emit("room_message", {
      room,
      from: socket.data.username,
      text,
      timestamp: new Date().toISOString()
    });
  });

  socket.on("list_rooms", () => {
    const rooms = [...io.sockets.adapter.rooms.entries()]
      .filter(([roomName]) => !io.sockets.sockets.has(roomName))
      .map(([roomName, socketIds]) => ({
        room: roomName,
        members: socketIds.size
      }))
      .sort((left, right) => left.room.localeCompare(right.room));

    socket.emit("rooms", rooms);
  });

  socket.on("ping", (payload = {}) => {
    socket.emit("pong", {
      received: payload,
      timestamp: new Date().toISOString()
    });
  });

  socket.on("echo", (payload) => {
    socket.emit("echo", payload);
  });

  socket.on("chat", (payload = {}) => {
    io.emit("chat", {
      from: payload?.from || "anonymous",
      text: payload?.text || "",
      timestamp: new Date().toISOString()
    });
  });

  socket.on("disconnect", (reason) => {
    console.log(`[server] disconnected ${socket.id} (${reason})`);
  });
});

server.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
