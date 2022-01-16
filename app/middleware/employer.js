const employer = (req,res,next)=> {
    if(req.isAuthenticated() && req.user.role == 'Employer') {
        return next();
    }
    return res.redirect("/employer/home");
}

module.exports = employer;