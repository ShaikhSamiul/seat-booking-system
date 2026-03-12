require('dotenv').config();
const mongoose = require('mongoose');
const Seat = require('./models/Seat.js');

const seedSeats = async() => {
    try{
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected successfully");

        await Seat.deleteMany({});
        console.log('Deleted existing seats');

        const rows = ['A', 'B', 'C', 'D', 'E'];
        const cols = 10;
        const seatsToInsert = []

        for(let i=0; i<rows.length; i++){
            for(let j=1; j<=cols; j++){
                seatsToInsert.push({
                    seatId: `${rows[i]}${j}`,
                    status: 'AVAILABLE'
                });
            }
        }

        await Seat.insertMany(seatsToInsert);
        console.log(`Successfully seeded ${seatsToInsert.length} seats into the database!`);

        mongoose.connection.close();
        process.exit(0);
    }
    catch(error){
        console.error('Error:', error);
        mongoose.connection.close();
        process.exit(1);
    }
}

seedSeats();