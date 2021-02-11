// #################################################
//   IMPORTS
// #################################################

// Get Room & User schemes
const Room = require("./models/Room");

async function createFirstRoom() {
    try {
        // Delete previous room object from DB
        await Room.deleteMany({});

        // Create Room
        const room = new Room({
            id: "matcheat_room",
            rooms: [],
            users: [],
        });

        // Save the room to DB
        await room.save();
    } catch (error) {
        console.log(error);
    }
}

module.exports = createFirstRoom;
