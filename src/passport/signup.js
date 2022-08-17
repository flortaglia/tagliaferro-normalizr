const LocalStrategy   = require('passport-local').Strategy;
const User =require( '../models/user.js');
const bCrypt  =require( 'bcrypt');

// Estrategia de registro/suscripción....REGISTER
module.exports = function (passport){

	passport.use('signup', new LocalStrategy({
            passReqToCallback : true 
        },
        async (req, username, password, done)=> {
            try {
                // find a user in Mongo with provided username
                const existingUser = User.findOne({ 'username' :  username }, 
                    (err, user)=> {
                    // In case of any error, return using the done method
                        if (err){
                            // console.log('Error in SignUp: ', err);
                            return done(err);
                        }
                        // already exists
                        if (user) {
                            // console.log('User already exists with username: ', username);
                            // console.log('user', user)
                            // console.log('tuser',typeof user)
                            return done(null, false);
                        } else {
                            const newUser = {
                                username: req.body.username,
                                password: hashPassword(password),
                                
                            };
                            const createdUser = User.create(newUser);
                            return done(null, createdUser);
                        }
                }).clone()    
            } catch (err) {
                console.log(err);
                done(err);
            }
        
        })
            
     );
            
    // Encriptar Password (cifrado) usando bCrypt
    function hashPassword(password){
        return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
    }  

}