// #################################################
//   IMPORTS
// #################################################

// Libraries
const socketio = require("socket.io");

// Get Room & User schemes
const Room = require("./models/Room");
const User = require("./models/User");
const Restaurant = require("./models/Restaurant");

// IO object
var io = null;

/*
SOCKET MESSAGE TYPES:

    // Emits to the client who made the connection
    socket.emit("eventName", payload);

    // Emit to all clients connected except the client that made the connection
    socket.broadcast.emit("eventName", payload);

    // Emit to all clients connected in a room except the client that made the connection
    socket.broadcast.to(roomID).emit("eventName", payload);

    // Emit to all clients connected
    io.emit("eventName", payload);

    // Emit to all clients in a room
    io.to(roomID).emit("eventName", payload);

    // Emit to a specific client
    io.to(socketID).emit(eventName", payload);

*/

// #################################################
//   FUNCTIONS
// #################################################

// Create Room
async function createRoom(socket, roomID, socketID, username) {
    try {
        // Return if room already exists
        const room = await Room.findOne({ roomID });
        if (room) return socket.emit("error", { error: "Room already exists", errorCode: 611 });

        // Get user
        const user = await User.findOne({ username });
        if (!user) return socket.emit("error", { error: "User does not exist", errorCode: 620 });

        // Kick from previous rooms and connections
        const kickedResponse = await kickFromRoom(socket, user);
        if ("error" in kickedResponse) return socket.emit("error", kickedResponse);

        // Create Room
        const newRoom = new Room({ roomID, boss: username, open: true });

        // Update User
        await User.findOneAndUpdate({ username }, { $set: { socketID, roomID } });

        // Create Room
        await newRoom.save();

        // Join socket room
        socket.join(roomID);

        // Send a list of current users in the room to the one joining
        const usersInRoom = await getAllUsersInARoom(roomID);
        if ("error" in usersInRoom) return socket.emit("error", usersInRoom);
        else socket.emit("roomUsers", usersInRoom);
    } catch (error) {
        socket.emit("error", { error, errorCode: 600 });
    }
}

// Join Room
async function joinRoom(socket, roomID, socketID, username) {
    try {
        // Return if room does not exist or if it is closed
        const room = await Room.findOne({ roomID });
        if (!room) return socket.emit("error", { error: "Room does not exist", errorCode: 610 });
        if (!room.open) return socket.emit("error", { error: "Room is closed", errorCode: 612 });

        // Get user
        const user = await User.findOne({ username });
        if (!user) return socket.emit("error", { error: "User does not exist", errorCode: 620 });

        // Kick from previous rooms and connections
        const kickedResponse = await kickFromRoom(socket, user);
        if ("error" in kickedResponse) return socket.emit("error", kickedResponse);

        // Update User
        await User.findOneAndUpdate({ username }, { $set: { socketID, roomID } });

        // Send simplified user data
        const simplifiedUser = { username: user.username, image: user.image };

        // Join socket room
        socket.join(roomID);

        // Send a list of current users in the room to the one joining
        const usersInRoom = await getAllUsersInARoom(roomID);
        if ("error" in usersInRoom) return socket.emit("error", usersInRoom);
        else socket.emit("roomUsers", usersInRoom);

        // Broadcast to the room that you joined
        socket.broadcast.to(roomID).emit("userJoinedRoom", { info: "Room joined", simplifiedUser, room });
    } catch (error) {
        socket.emit("error", { error, errorCode: 600 });
    }
}

// Leave Room and return the user that left
async function leaveRoom(socket, socketID) {
    try {
        // Get user
        const user = await User.findOne({ socketID });
        if (!user) return socket.emit("error", { error: "No user with this socket", errorCode: 621 });

        // Get users room
        const room = await Room.findOne({ roomID: user.roomID });
        if (!room) return socket.emit("error", { error: "Room does not exist", errorCode: 610 });

        // Remove user from the room
        await User.findOneAndUpdate({ username: user.username }, { $set: { socketID: "", roomID: "", hasFinished: false } });

        // Get all users in the Room
        const usersInRoom = await getAllUsersInARoom(user.roomID);
        if ("error" in usersInRoom) return socket.emit("error", usersInRoom);

        // Send simplified user data
        const simplifiedUser = { username: user.username, image: user.image };

        // If there are no more users in the Room -> Delete the Room and its restaurants
        if (!usersInRoom.length) {
            // Delete restaurants of that Room from DB
            await Restaurant.deleteMany({ roomID: user.roomID });

            // Delete Room
            return await Room.deleteOne({ roomID: user.roomID });
        }

        // Delete room & Restaurants and kick everyone if the one who left was the boss and the room was not closed
        if (room.open && room.boss === user.username) {
            // Delete restaurants of that Room from DB
            await Restaurant.deleteMany({ roomID: user.roomID });

            // Delete room from DB
            await Room.deleteOne({ roomID: user.roomID });

            // Update users in the room
            await User.updateMany({ roomID: user.roomID }, { $set: { socketID: "", roomID: "", hasFinished: false } });

            // Inform everyone that the room was closed
            return io.to(room.roomID).emit("error", { error: "Room has been closed", errorCode: 630 });
        }

        // Inform everyone in the room that this user has disconected
        io.to(room.roomID).emit("userLeftRoom", { info: `${user.username} left the room`, simplifiedUser, room });
    } catch (error) {
        socket.emit("error", { error, errorCode: 600 });
    }
}

// Broadcast message to room
async function broadcastMessageToRoom(message, roomID) {
    // Inform all in the room that it has started
    io.to(roomID).emit(message);
}

// Get all users in a Room
async function getAllUsersInARoom(roomID) {
    try {
        // Get users
        const users = await User.find({ roomID });

        // Return simplified versions of the users
        return users.map(({ username, image }) => {
            return { username, image };
        });
    } catch (error) {
        return { error, errorCode: 600 };
    }
}

// Kick user from room
async function kickFromRoom(socket, user) {
    try {
        if (user.socketID || user.roomID) {
            // Inform the user with that socket ID
            if (user.socketID) io.to(user.socketID).emit("error", { error: "You have been kicked", errorCode: 631 });

            // Leave Room
            await leaveRoom(socket, user.socketID);

            // Send error
            return { info: "User kicked from previous room and socket connection" };
        }

        return { info: "User was not in a room and had no previous connection" };
    } catch (error) {
        return { error, errorCode: 600 };
    }
}

// Delete all rooms and close all connections
async function clearRooms() {
    try {
        // Delete previous rooms from DB
        await Room.deleteMany({});

        // Delete previous restaurants from DB
        await Restaurant.deleteMany({});

        // Get all users
        await User.updateMany({}, { $set: { socketID: "", roomID: "", hasFinished: false } });

        // Send info to users that they have been kicked
        io.emit("error", { error: "Server Start", errorCode: 601 });
    } catch (error) {
        return;
    }
}

// #################################################
//   MAIN SOCKET FUNCTION
// #################################################

async function startSockets(server) {
    // Sockets
    io = socketio(server, { cors: { origin: "*" } });

    // Clear rooms
    clearRooms();

    // Run when client connects
    io.on("connection", async (socket) => {
        // Create room
        socket.on("createRoom", async ({ roomID, username }) => {
            await createRoom(socket, roomID, socket.id, username);
        });

        // Join room
        socket.on("joinRoom", async ({ roomID, username }) => {
            await joinRoom(socket, roomID, socket.id, username);
        });

        // Leave room
        socket.on("leaveRoom", async () => {
            await leaveRoom(socket, socket.id);
        });

        // Start a Room
        socket.on("broadcastMessageToRoom", async ({ message, roomID }) => {
            await broadcastMessageToRoom(message, roomID);
        });

        // Broadcast -> User disconnected
        socket.on("disconnect", async () => {
            await leaveRoom(socket, socket.id);
        });
    });
}

module.exports = startSockets;
