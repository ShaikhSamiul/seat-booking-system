const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema({
    seatId: {
        type: String,
        required: true,
        unique: true
    },
    status: {
        type: String,
        enum: ['AVAILABLE', 'BOOKED'],
        default: 'AVAILABLE'
    },
    bookedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    bookedAt: {
        type: Date,
        default: null
    }
}, {timestamps:true});

module.exports = mongoose.model('Seat', seatSchema);