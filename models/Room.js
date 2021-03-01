const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({
    roomID: {
        type: String,
        required: true,
        min: 2,
        max: 16,
    },
    boss: {
        type: String,
        required: true,
        min: 3,
        max: 12,
    },
    open: {
        type: Boolean,
        required: true,
        default: true,
    },
});

module.exports = mongoose.model("Room", roomSchema);
