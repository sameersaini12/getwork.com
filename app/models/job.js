const mongoose = require("mongoose");

const jobSchema = mongoose.Schema({
    jobOwner : {
        type: mongoose.Schema.Types.ObjectId,
        ref : 'User',
        required: true
    },
    jobDone : {
        type: mongoose.Schema.Types.ObjectId,
        ref : 'User'
    },
    workName : { type: String , required : true},
    workLocation : { type: String , required : true},
    expectedDuration : { type: Number , required : true},
    totalWage : {type:String , required: true},
    contactPerson : {type:String , default: 'india'},
    contactNumber : {type:Number , default: 'haryana'},
    status : {type:String , default: 'Not Done'},
    remarksDone : {type:Boolean , default:false},
    jobDonePdf : {type:String}
},  {timestamps : true})

const Job = mongoose.model("Job" , jobSchema);

module.exports = Job;