const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    contact: {
        type: Number,
        min : 1000000000,
        max : 9999999999,
        unique : true
    },
    img:
    {
        data: Buffer,
        contentType: String
    },
    address : String,
    studentid : { type: String, uppercase: true ,unique: true, required :true}
})

const studentdata = mongoose.model('studentdata', studentSchema);

module.exports = studentdata;