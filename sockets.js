// #################################################
//   IMPORTS
// #################################################

// Libraries
const socketio = require("socket.io");

// Get Room & User schemes
const Room = require("./models/Room");
const User = require("./models/User");

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

    // Emit to a specific client
    io.to(socketID).emit(eventName", payload);

    // Emit to all clients connected
    io.emit("eventName", payload);
*/

// #################################################
//   FUNCTIONS
// #################################################

// Create Room
async function createRoom(roomID, socketID, username) {
    try {
        // Return if room already exists
        const room = await Room.findOne({ roomID });
        if (room) return { error: "Room already exists" };

        // Get user
        const user = await User.findOne({ username });
        if (!user) return { error: "User does not exist" };

        // Kick from previous rooms and connections
        const kickedFromRoomError = await kickFromRoom(user);

        // Send error
        if ("error" in kickedFromRoomError) return kickedFromRoomError;

        // Create Room
        const newRoom = new Room({ roomID, open: true });

        // Update User
        await User.findOneAndUpdate({ username }, { $set: { socketID, roomID } });

        // Create Room
        await newRoom.save();

        // Send simplified user data
        const simplifiedUser = { username: user.username, image: user.image };

        // Return
        return { info: "Room created", simplifiedUser, room: newRoom };
    } catch (error) {
        return { error };
    }
}

// Join Room
async function joinRoom(roomID, socketID, username) {
    try {
        // Return if room does not exist or if it is closed
        const room = await Room.findOne({ roomID });
        if (!room) return { error: "Room does not exist" };
        if (!room.open) return { error: "Room is closed" };

        // Get user
        const user = await User.findOne({ username });
        if (!user) return { error: "User does not exist" };

        // Kick from previous rooms and connections
        const kickedFromRoomError = await kickFromRoom(user);

        // Send error
        if ("error" in kickedFromRoomError) return kickedFromRoomError;

        // Update User
        await User.findOneAndUpdate({ username }, { $set: { socketID, roomID } });

        // Send simplified user data
        const simplifiedUser = { username: user.username, image: user.image };

        // Return
        return { info: "Room joined", simplifiedUser, room };
    } catch (error) {
        return { error };
    }
}

// Leave Room and return the user that left
async function leaveRoom(socketID) {
    try {
        // Get user
        const user = await User.findOne({ socketID });
        if (!user) return { error: "User does not exist" };

        // Get users room
        const room = { roomID: user.roomID };

        // Remove user from the room
        await User.findOneAndUpdate({ username: user.username }, { $set: { socketID: "", roomID: "" } });

        // Get all users in the Room
        const usersInRoom = await getAllUsersInARoom(user.roomID);

        // If there are no more users in the Room -> Delete the Room
        if (!usersInRoom.length) await Room.deleteOne({ roomID: user.roomID });

        // Send simplified user data
        const simplifiedUser = { username: user.username, image: user.image };

        // Return the user that left
        return { info: `${user.username} left the room`, simplifiedUser, room };
    } catch (error) {
        return { error };
    }
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
        return { error };
    }
}

// Kick user from room
async function kickFromRoom(user) {
    try {
        if (user.socketID || user.roomID) {
            // Inform the user with that socket ID
            if (user.socketID) io.to(user.socketID).emit("kicked", { info: "Kicked from Room or Connection" });

            // Leave Room
            const leaveRoomInfo = await leaveRoom(user.socketID);

            // Send error
            if ("error" in leaveRoomInfo) return { error };
            return { info: "User kicked from previous room and socket connection" };
        }

        return { info: "User was not in a room and had no previous connection" };
    } catch (error) {
        return { error };
    }
}

// Delete all rooms and close all connections
async function clearRooms() {
    try {
        // Delete previous rooms from DB
        await Room.deleteMany({});

        // Get all users
        const users = await User.find({});

        // Send info to users that they have been kicked
        users.forEach(kickFromRoom);
    } catch (error) {
        return { error };
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
            // Create room if needed
            var createRoomResponse = await createRoom(roomID, socket.id, username);

            // Send error
            if ("error" in createRoomResponse) return socket.emit("error", createRoomResponse);

            // Join socket room
            socket.join(roomID);
        });

        // Join room
        socket.on("joinRoom", async ({ roomID, username }) => {
            // Join room
            var joinRoomResponse = await joinRoom(roomID, socket.id, username);

            // Send error
            if ("error" in joinRoomResponse) return socket.emit("error", joinRoomResponse);

            // Join socket room
            socket.join(roomID);

            //console.log(await getAllUsersInARoomData(roomID));

            // Broadcast to the room that you joined
            socket.broadcast.to(roomID).emit("userJoinedRoom", joinRoomResponse.simplifiedUser);
        });

        // Broadcast -> User disconnected
        socket.on("disconnect", async () => {
            // Leave Room
            const leaveRoomInfo = await leaveRoom(socket.id);

            // Send error
            if ("error" in leaveRoomInfo) return socket.emit("error", leaveRoomInfo);

            // Inform everyone in the room that this user has disconected
            io.to(leaveRoomInfo.room.roomID).emit("userLeftRoom", leaveRoomInfo.simplifiedUser);
        });
    });
}

module.exports = startSockets;
