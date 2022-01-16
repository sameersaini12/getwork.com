const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
    role : { type: String , default: 'worker'},
    name : { type: String , required : true},
    email : { type: String , required : true , unique:true},
    password : { type: String , required : true},
    phone : {type:Number , required: true},
    country : {type:String , default: 'india'},
    state : {type:String , default: 'haryana'},
    zipcode : {type:Number},
    rating : {type:Number},
    remark : {type:Array}
},  {timestamps : true})

const User = mongoose.model("User" , userSchema);

module.exports = User;