const path = require('path');
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const { Users } = require('./utils/users');
const { createMessage, createLocation } = require('./utils/message');
const { isValidName } = require('./utils/validation');

const public = path.join(__dirname, '../public');
const port = process.env.PORT || 3000;
const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const users = new Users();

app.use(express.static(public));

io.on('connection', (socket) => {
  socket.on('join', (params, callback) => {
    const name = params.name.trim();
    const room = params.room.trim();
    const avatar = params.avatar.trim();
    if (typeof callback === 'function') {
      if (!isValidName(name))
        callback("Your name should have at least one valid character!");
      else if (!isValidName(room)) {
        callback("A room name should have at least one valid character!");
      } else {
        console.log(name, " has joined the room ", room);
        socket.join(room);
        users.removeUser(socket.id);
        users.addUser(socket.id, name, room, avatar);
        io.to(room)
          .emit('updateUserList', users.getUsernamesList(room));
        socket.emit('newMessage', createMessage("Admin", `Hi, ${name}! Welcome to our room! :D`));
        socket.broadcast.to(room)
          .emit('newMessage', createMessage("Admin", `${name} just joined our room! :D`));
        callback();
      }
    }
  });

  socket.on('createMessage', (message, callback) => {
    const user = users.getUser(socket.id);
    if (user) {
      const { from, text } = message;
      io.to(user.room).emit('newMessage', createMessage(user.name, text, user.avatar));
    }
    if (typeof callback === 'function') {
      callback('Server got the message');
    }
  });

  socket.on('createLocation', (message, callback) => {
    const user = users.getUser(socket.id);
    if (user) {
      const { lat, lon } = message;
      io.to(user.room).emit('newLocation', createLocation(user.name, lat, lon, user.avatar));
    }
    if (typeof callback === 'function') {
      callback('Server got the location');
    }
  });

  socket.on('disconnect', () => {
    const user = users.removeUser(socket.id);
    if (user) {
      console.log(user.name, " has left the room ", user.room);
      io.to(user.room)
        .emit('updateUserList', users.getUsernamesList(user.room));
      io.to(user.room)
        .emit('newMessage', createMessage("Admin", `${user.name} just left our room! :(`));
    }
  });
});

server.listen(port, () => {
  console.log(`Server is running on the port ${port}`);
});
