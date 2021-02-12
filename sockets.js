// #################################################
//   IMPORTS
// #################################################

// Libraries
const socketio = require("socket.io");

// Get Room & User schemes
const Room = require("./models/Room");
const User = require("./models/User");

/*
SOCKET MESSAGE TYPES:

    // Emits to the client who made the connection
    socket.emit("eventName", payload);

    // Emit to all client connected except the client that made the connection
    socket.broadcast.emit("eventName", payload);

    // Emit to all clients connected
    io.emit("eventName", payload);
*/

// #################################################
//   FUNCTIONS
// #################################################

// Create Room
async function createRoom(roomID, socketID, username) {
    // Return if room already exists
    const roomExists = await Room.findOne({ rooms: { $elemMatch: { roomID } } });
    if (roomExists) return { error: "Room already exists" };

    // Create user
    const user = { roomID, socketID, username };

    try {
        // Update room in the db to add the new room
        await Room.updateOne({ id: "matcheat_room" }, { $addToSet: { users: [user] } });

        // Update room in the db to add the new user
        await Room.updateOne({ id: "matcheat_room" }, { $addToSet: { rooms: [{ roomID }] } });

        // Return
        return { info: "Room created" };
    } catch (error) {
        return { error };
    }
}

// Delete Room
async function deleteRoom() {}

// Join Room
async function joinRoom(roomID, socketID, username) {
    // Return if room does not exist exists
    const roomExists = await Room.findOne({ rooms: { $elemMatch: { roomID } } });
    if (!roomExists) return { error: "Room does not exist" };

    // ROJAS if user in a room already, kick him from tat room end join the new one

    // Create user
    const user = { roomID, socketID, username };

    try {
        // Update room in the db
        await Room.updateOne({ id: "matcheat_room" }, { $addToSet: { users: [user] } });

        // Return
        return { info: "Room joined" };
    } catch (error) {
        return { error };
    }
}

// Leave Room
async function leaveRoom() {}

// Get a user from the room
async function getUser(socketID) {
    // Return if room does not exist exists
    const user = await Room.findOne({ id: "matcheat_room" }, { users: { $elemMatch: { socketID } } });

    if (!("users" in user) || !user.users.length) return { error: "User does not exist" };

    return user.users[0];
}

// Get all users in a Room
async function getAllUsersRoom() {}

// #################################################
//   MAIN SOCKET FUNCTION
// #################################################

async function startSockets(server) {
    // Sockets
    const io = socketio(server, { cors: { origin: "*" } });

    // Run when client connects
    io.on("connection", async (socket) => {
        // Welcome message for client
        socket.emit("welcome", "Welcome to sockets");

        // Create room
        socket.on("createRoom", async ({ roomID, username }) => {
            // Create room if needed
            var createRoomResponse = await createRoom(roomID, socket.id, username);

            // Send error
            if ("error" in createRoomResponse) socket.emit("error", createRoomResponse);

            // Join socket room
            socket.join(roomID);
        });

        // Join room
        socket.on("joinRoom", async ({ roomID, username }) => {
            // Join room
            var joinRoomResponse = await joinRoom(roomID, socket.id, username);

            // Send error
            if ("error" in joinRoomResponse) socket.emit("error", joinRoomResponse);

            // Join socket room
            socket.join(roomID);

            // Get the current user
            const user = await User.findOne({ name: username });

            // Send error
            if (!user) socket.emit("error", { error: "No user has that username" });

            // Broadcast to the room that you joined
            socket.broadcast.to(roomID).emit("userJoinedRoom", { username: user.name, image: user.image });
        });

        // Broadcast -> User disconnected
        socket.on("disconnect", async () => {
            const user = await getUser(socket.id);

            // Remove user from the users array in the room
            await Room.updateOne({ id: "matcheat_room" }, { $pull: { users: { socketID: user.socketID } } });

            // Get all users in the Room
            const userInRoom = await Room.findOne({ id: "matcheat_room" }, { users: { $elemMatch: { roomID: user.roomID } } });

            // If there are no more users in the Room -> Delete the Room
            if (!("users" in userInRoom) || !userInRoom.users.length) {
                await Room.updateOne({ id: "matcheat_room" }, { $pull: { rooms: { roomID: user.roomID } } });
            }

            // Inform everyone in the room that this user has disconected
            io.to(user.roomID).emit("userDisconnected", { roomID: user.roomID, username: user.username });
        });
    });
}

module.exports = startSockets;
