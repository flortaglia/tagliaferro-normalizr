var LocalStrategy   = require('passport-local').Strategy;
var User = require('../models/user');
var bCrypt = require('bcrypt');

//Estrategia de Login/acceso
module.exports= function (passport){

	passport.use('login', new LocalStrategy({
        passReqToCallback : true //nos permite acceder al objeto request
        },
        async (req, username, password, done) => {
        try { 
            const user = await User.findOne({ 'username' :  username });
            // console.log("login::LocalStrategy")
            // console.log("user", user)

            if (!user || !isValidPassword(user, password)) {
                return done("Invalid credentials", false);
            }
            return done(null, user);
            
        } catch (err) {
            // console.log('error login Strategy',err);
                done(err);
        }
        
        })
    );

   //Desencriptar Password (cifrado)
    function isValidPassword (user, password){
        return bCrypt.compareSync(password, user.password);
    }
    
}