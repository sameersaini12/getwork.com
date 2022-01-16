const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;
const path = require("path");
const ejs = require("ejs");
const expressLayout = require("express-ejs-layouts");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("./app/models/user");
const flash = require("flash");
const session = require("express-session");
const MongoDbStore = require("connect-mongo");
const passport = require("passport");
const Job = require("./app/models/job");
const { ObjectId } = require('mongodb');
const moment = require("moment");
const employer = require("./app/middleware/employer");
const worker = require("./app/middleware/worker");
const auth = require("./app/middleware/auth")
const http = require('http').createServer(app);
const multer = require('multer');


mongoose.connect("mongodb://localhost/getwork" , {
    useNewUrlParser:true,
    useUnifiedTopology:true,
}).then(()=> {
    console.log("Successful connection");
}).catch((e)=> {
    console.log(e)
    console.log("Connection failed");
})

app.use(session({
    secret: "mynameissameiu",
    resave :false,
    store : MongoDbStore.create({
        mongoUrl : "mongodb://localhost/getwork"
    }),
    saveUninitialized:false,
    cookie :  { maxAge: 1000*24*60*60 } //24 hrs
}))

require("./app/config/passport")(passport);
app.use(passport.initialize());
app.use(passport.session());

app.use(flash())
app.use(express.static("public"))
app.use(express.static("pdf"))
app.use(expressLayout);
app.set("views" , path.join(__dirname , "/resources/views"));
app.set("view engine" , "ejs");
app.use(express.json()); 
app.use(express.urlencoded({extended : false})) 

app.use((req,res,next)=> {
    res.locals.session = req.session;
    res.locals.user = req.user;
    next();
})

const fileStorageEngine = multer.diskStorage({
    destination: (req,file,cb) => {
        cb(null , './pdf')
    },
    filename : (req,file,cb) => {
        cb(null , file.originalname)
    }
})

const upload = multer({storage : fileStorageEngine});

app.get('/' ,worker, async(req,res)=> {
    const jobs = await Job.find({status : { $ne : 'Done'}} , null , {sort : {'createdAt' : -1}});
    res.render("home" , {jobs : jobs , moment : moment});
})

app.get("/register" , (req,res)=> {
    res.render("auth/register");
})


app.post("/register", async(req,res)=> {
    const {role , name , email ,password , phone , country , state , zipcode} = req.body;
    
     User.exists({email : email }, (err,result)=>{
        if(result) {
            req.flash('error' , 'Email already taken');
            return res.redirect('/register')
        }
    })

    const hashPassword = await bcrypt.hash(password , 10);

    const newUser = new User({
        role : role,
        name : name,
        email: email,
        password : hashPassword,
        phone : phone,
        country : country,
        state : state,
        zipcode : zipcode
    })
    await newUser.save().then((user)=> {
        return res.redirect("/");
    }).catch((e)=> {
        console.log(e);
        req.flash("error" , "Something went wrong");
        return res.redirect("/register")
    });
})

app.get("/login" , (req,res)=> {
    res.render("auth/login")
})

const generateRedirectUrl = (req)=> {
    return req.user.role === 'Employer' ? '/employer/home' : '/'
}

app.post("/login" , (req,res,next)=> {
    const {email , password} = req.body;
    if(!email || !password) {
        req.flash("error" , 'All fiels are required');
        return res.redirect("/login");
    }
    passport.authenticate('local' , (err , user , info)=> {
        if(err) {
            req.flash('error' , info.message);
            next(err)
        } 
        if(!user) {
            req.flash('error' , info.message);
            return res.redirect("/login");
        }
        req.logIn(user ,(err)=> {
            if(err) {
                req.flash('error' , info.message);
                next(err);
            }
            
            return res.redirect(generateRedirectUrl(req))
        })
    })(req,res,next)
})

app.post("/logout" , (req,res)=> {
    req.logout();
    res.redirect("/"); 
})

app.get("/employer/home" , employer , (req,res)=> {
    res.render("employer/home")
})

app.post("/addjob" , async(req,res)=> {
    const {workName , workLocation , expectedDuration , totalWage , contactPerson , contactNumber } = req.body;

    const newJob = new Job({
        jobOwner : req.user._id,
        workName : workName,
        workLocation : workLocation,
        expectedDuration : expectedDuration,
        totalWage : totalWage,
        contactPerson : contactPerson,
        contactNumber : contactNumber
    });
    await newJob.save().then((job)=> {
        return res.redirect("/employer/home");
    }).catch((e)=> {
        console.log(e);
        req.flash("error" , "Something went wrong");
        return res.redirect("/employer/home")
    });
})

app.get("/employer/jobs/:id" ,employer , async(req,res)=> {
    const jobs = await Job.find({jobOwner : req.user._id} , null , {sort : {'createdAt' : -1}});
        res.render("employer/jobs" , {jobs : jobs});
})

app.post("/applyjob" , upload.single('resumeupload') , (req,res)=> {
    Job.updateMany({_id : req.body.jobId} ,{$set: {status: "Done", jobDone: req.user._id , jobDonePdf : req.file.originalname}}, (err , data)=> {
        res.redirect("/");
    })
})

app.post("/giveremarks" , (req,res)=> {
    res.render("employer/remark" , {jobDone : req.body.jobDone , jobId : req.body.jobId});
})

app.post("/remark" , async(req,res)=> {
    let ratingx =1;
    let avgRating = 0;
    User.updateOne({_id : req.body.jobDone} , { $push : { remark : [ { jobId : ObjectId(req.body.jobDone) , jobRate: req.body.workRating , feedback : req.body.workRemark }]}} , (err , data)=> {})
    const userx = await User.findById(req.body.jobDone);
    ratingx = userx.remark.length;
    for(i=0;i<ratingx;i++) {
        avgRating += parseInt(userx.remark[i].jobRate);
    }
    Job.updateOne({_id : req.body.jobId} , {$set : {remarksDone : true}} , (err,data)=> {})
    User.updateOne({_id : req.body.jobDone} , {$set : {rating : Math.round(((avgRating)/ratingx)*100)/100} } , (err , data)=> {
        res.redirect("/employer/jobs/"+req.user._id);
    }) 
})

app.post('/sendmessage' , (req,res)=> {
    res.redirect("/sendmessage/"+ ObjectId(req.body.jobOwner) )
})

app.get('/sendmessage/:id' , (req,res)=> {
    res.render("message" , {jobOwner : req.params.id})
})


http.listen(PORT , ()=> {
    console.log(`Listening on port ${PORT}`);
})


//socket 

const io = require("socket.io")(http)

io.on('connection', (socket) => {
    // console.log('Connected...')
    socket.on('message', (msg) => {
        socket.broadcast.emit('message', msg)
    })
})