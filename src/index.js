const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const Filter = require("bad-words");
const {
  generateMessage,
  generateLocationMessage,
} = require("./utils/messages");

const {
  addUser,
  removeUser,
  getUser,
  getUsersInRoom,
} = require("./utils/users");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const port = process.env.PORT || 3000;

// Root path for express
const publicDirPath = path.join(__dirname, "../public");

// setup the path for the public directory. Will load up static index.html
app.use(express.static(publicDirPath));

// Listen for the connection event
io.on("connection", (socket) => {
  console.log("New Websocket Connection");

  // Join a room
  socket.on("join", (options, callback) => {
    const { error, user } = addUser({ id: socket.id, ...options });

    if (error) {
      return callback(error);
    }

    socket.join(user.room);

    // display message to current client
    socket.emit("message", generateMessage("Admin", "Welcome"));

    // Display message to all in the same room except current client/connection
    socket.broadcast
      .to(user.room)
      .emit(
        "message",
        generateMessage("Admin", `${user.username} has joined!`)
      );

    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.room),
    });
    // Let the client know that we were able to join
    callback();
  });

  // listen for sendMessage event and display message to all clients
  socket.on("sendMessage", (message, callback) => {
    // Check language
    const filter = new Filter();
    if (filter.isProfane(message)) return callback("Profanity is not allowed");

    const user = getUser(socket.id);

    io.to(user.room).emit("message", generateMessage(user.username, message));
    callback();
  });

  // listen for the location {lat, long}
  socket.on("sendLocation", (coords, callback) => {
    const user = getUser(socket.id);

    io.to(user.room).emit(
      "locationMessage",
      generateLocationMessage(
        user.username,
        `https://google.com/maps?q=${coords.latitude},${coords.longitude}`
      )
    );
    callback();
  });

  // disconnect from chat. "disconnect" is inherent
  socket.on("disconnect", () => {
    const user = removeUser(socket.id);

    // only notify other users if the user successfully connected to a room
    if (user) {
      io.to(user.room).emit(
        "message",
        generateMessage("Admin", `${user.username} has left!`)
      );
      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInRoom(user.room),
      });
    }
  });
});

server.listen(port, () => {
  console.log(`Chat Server listening at http://localhost:${port}`);
});
