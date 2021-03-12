const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { addUser, removeUser, getUser, getUsersInRoom } = require("./users");
const userRoutes = require("./routes/users.route");
const router = require("./router");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(cors());
app.use(express.json());
app.use(router);
app.use("/api/users", userRoutes);
io.use((socket, next) => {
  if (socket.handshake.query && socket.handshake.query.token) {
    jwt.verify(
      socket.handshake.query.token,
      "some-jwt-secret",
      (err, decoded) => {
        if (err) return next(new Error("Authentication error"));
        console.log(decoded);
        socket.decoded = decoded;

        next();
      }
    );
  } else {
    next(new Error("Authentication error"));
  }
}).on("connect", (socket) => {
  socket.on("join", ({ name, room }, callback) => {
    console.log(name, room);
    const { error, user } = addUser({ id: socket.id, name, room });

    if (error) return callback(error);

    socket.join(user.room);

    socket.emit("message", {
      user: "admin",
      text: `${user.name}, welcome to room ${user.room}.`,
    });
    socket.broadcast
      .to(user.room)
      .emit("message", { user: "admin", text: `${user.name} has joined!` });

    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.room),
    });

    callback();
  });

  socket.on("sendMessage", (message, callback) => {
    const user = getUser(socket.id);
    console.log(user);
    if (user) {
      io.to(user.room).emit("message", { user: user.name, text: message });
    }

    callback();
  });

  socket.on("disconnect", () => {
    const user = removeUser(socket.id);

    if (user) {
      io.to(user.room).emit("message", {
        user: "Admin",
        text: `${user.name} has left.`,
      });
      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInRoom(user.room),
      });
    }
  });
});

mongoose
  .connect(
    "mongodb+srv://prof-quotes:1234@cluster0.7metr.mongodb.net/test?retryWrites=true&w=majority",
    { useNewUrlParser: true, useUnifiedTopology: true }
  )
  .then(() => {
    server.listen(process.env.PORT || 5000, () =>
      console.log(`Server has started.`)
    );
  })
  .catch((err) => console.log("Could not start server:", err));
