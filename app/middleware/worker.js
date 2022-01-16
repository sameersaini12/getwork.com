const worker = (req,res,next)=> {
    if(!req.isAuthenticated() || (req.user.role == 'Worker')) {
        return next();
    }
    return res.redirect("/");
}

module.exports = worker;