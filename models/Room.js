const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({
    roomID: {
        type: String,
        required: true,
        min: 2,
        max: 16,
    },
    open: {
        type: Boolean,
        default: true,
    },
});

module.exports = mongoose.model("Room", roomSchema);
