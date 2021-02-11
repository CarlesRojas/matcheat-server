const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        min: 8,
        max: 16,
    },
    rooms: {
        type: Array,
        default: [],
    },

    users: {
        type: Array,
        default: [],
    },
});

module.exports = mongoose.model("Room", roomSchema);
