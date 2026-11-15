import express from "express";
import http from "http";
import { Server } from "socket.io";

const USER_LIST = ["Alan", "Bob", "Carol", "Dean", "Elin"];
const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

const app = express();
app.get("/health", (_req, res) => res.json({ ok: true }));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: CLIENT_ORIGIN } });

// In-memory store: fine for an assignment, resets when the server restarts.
const messages = [];
let nextId = 1;

io.on("connection", (socket) => {
  // A new client gets the existing thread, so a refresh doesn't empty the chat.
  socket.emit("history", messages);

  socket.on("message", ({ user, text } = {}) => {
    if (typeof text !== "string" || !text.trim()) return;
    const message = {
      id: nextId++,
      // Never trust the client: fall back to a random valid user.
      user: USER_LIST.includes(user) ? user : USER_LIST[Math.floor(Math.random() * USER_LIST.length)],
      text: text.trim().slice(0, 500),
      likes: 0,
    };
    messages.push(message);
    if (messages.length > 200) messages.shift();
    io.emit("message", message); // broadcast to everyone, including the sender
  });

  socket.on("like", (id) => {
    const message = messages.find((m) => m.id === id);
    if (!message) return;
    message.likes += 1; // the server owns the count, so every client sees the same number
    io.emit("like", { id, likes: message.likes });
  });
});

server.listen(PORT, () => console.log(`Chat server listening on http://localhost:${PORT}`));
