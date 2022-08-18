const login =require( './login.js');
const signup =require( './signup.js');
const User = require ('../models/user.js');

module.exports = function(passport){

    
    signup(passport);
    login(passport);
	//Serializar y deserializar instancias de usuario
    passport.serializeUser((user, done)=> {
       // console.log('serializing user: ',user);
        done(null, user);
    });

    passport.deserializeUser((user, done)=> {
      done(null, user);
       
    });

    // Llamando Passport Strategies para Login y SignUp/Registration
    

}