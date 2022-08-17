const fs = require( 'fs')
require('dotenv').config()
const express = require('express')
const session = require( "express-session");
const cookieParser = require( "cookie-parser");
const MongoStore = require( "connect-mongo");
const { createServer } = require( "http");
const { Server } = require( "socket.io");
//NORMALIZR
const { normalize, schema, denormalize } = require( "normalizr");
const passport = require( 'passport');
const path = require( 'path') 
const mongoose = require( "mongoose")
const initPassport = require( './passport/init.js');
const dbConfig = require('./db');
const routes = require( "./routes/index.js")(passport);

// Connect to DB
mongoose.connect(dbConfig.url);
console.log('dbConfig.url',dbConfig.url)
const SECRET=process.env.SECRET

const app = express()
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const puerto =8080
const mongoOptions = { useNewUrlParser: true, useUnifiedTopology: true };


app.use(
  session({
    store: MongoStore.create({
      mongoUrl: dbConfig.url,
      mongoOptions,
      ttl:600, //time to live sec session CHANGE TO =>10MIN 10*60
      autoRemove: 'native' //session expires the doc in mongodb will be removed
    }),
    secret: SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true, // Re initialization of the time in every request
    cookie: {
      maxAge: 60000, //CHANGE TO 1 MIN=> 1*1000*60
    },
  })
);
//Inicializo PASSPORT
app.use(passport.initialize());
app.use(passport.session());
initPassport(passport);

app.use("/", routes);


// passport.use("register", signupStrategy);
// passport.use("login", loginStrategy);


///CON SESSION 
// function authMiddleware(req, res, next) {
//   console.log("authMiddleware",req.session.user)
// if (req.session.user) {
//   next();
// } else {
//   res.redirect("/login");
// }
// }

// function loginMiddleware(req, res, next) {
// if (req.session.user) {
//   res.redirect("/");
// } else {
//   next();
// }
// }

// app.get('/',authMiddleware,(req,res)=>{
//   res.sendFile(path.join(__dirname, "./public/index.html"));

// })
// app.get('/login',loginMiddleware,(req, res)=>{
//   res.sendFile(path.join(__dirname, "./public","login.html"));
  
// })
// app.post('/process-login',(req, res)=>{
//     console.log('req',req.body)
//     req.session.user=req.body.username
//     // res.status(200).send(req.session.user)
//     res.redirect('/')
// })
// app.get('/user-info',(req, res)=>{
//   res.json({username: req.session.user})
// })

// app.get('/logout',authMiddleware,(req, res)=>{
//   let user= req.session.user
//   req.session.destroy(err=>{
//     if(err){
//       console.log('error en el Logout:', err)
//     }else{
//       res.send(`<h1>Hasta luego ${user}</h1>
//       <script type="text/javascript">
//       setTimeout(function(){ location.href = '/login'},2000)
//       </script>`)
//     }
//   })
// })



//MoTOR HANDLEBARS BACKEND
// const handlebars = require('express-handlebars')


// app.engine('hbs', handlebars({
//   extname: '.hbs',
//   defaultLayout: path.join(__dirname, './views/layouts/main.hbs'),
//   layoutsDir: path.join(__dirname, './views/layouts'),
//   partialsDir: path.join(__dirname, './views/partials')
// }))

// app.set('view engine', 'hbs')
// app.set('views', path.join(__dirname, './views'))

// const { Server: IOServer } = require( ('socket.io')

const httpServer = createServer();

const expressServer = app.listen(puerto, (err) => {
    if(err) {
        console.log(`Se produjo un error al iniciar el servidor: ${err}`)
    } else {
        console.log(`Servidor escuchando puerto: ${puerto}`)
    }
})
const io = new Server(expressServer) 

// function print(objeto) {
//     console.log(util.inspect(objeto, false, 12, true));
// }

const messagesNormalizar= []
const productos= []


app.use(express.static(__dirname + '/public'))

async function escribir(){
    try{
        await fs.promises.writeFile(path.join(__dirname,'/chat'), JSON.stringify(messagesNormalizar))
        console.log('guardado',path.join(__dirname,'/chat'))
    }catch(err){
        console.log('no se pudo guardar el chat', err)
    }

}
// LADO SERVIDOR

io.on('connection', async socket=>{
    console.log('se conecto un usuario')

    io.emit('serverSend:Products', productos) //envio todos los productos

    socket.on('client:enterProduct', productInfo=>{
        productos.push(productInfo) //recibo productos
        io.emit('serverSend:Products', productos)//emito productos recibidos a los usuarios
    })
    // PARTE CHAT _ LADO SERVIDOR
    const authorSchema = new schema.Entity('authors',{},{idAttribute:'mail'})
    const commentSchema = new schema.Entity(
        'comments',
        {author: authorSchema},
        { idAttribute: "id" })
    
    const chatSchema = new schema.Entity(
        'chats', 
        { comments: [commentSchema]},
        { idAttribute: "id" }
    );
    let normalizedChat = normalize({id:"chat1",comments: messagesNormalizar}, chatSchema); 
    
    // print('capacidad normalizedChat',JSON.stringify(normalizedChat).length) 
    io.emit('serverSend:message', normalizedChat) //envio CHATS a todos los usuarios
    //archivo a Normalizar - recibido desde el Front
    socket.on('client:messageNormalizar', messageInfo=>{
        messageInfo.id=(messagesNormalizar.length)+1
        messagesNormalizar.push(messageInfo) //RECIBO mensaje y lo anido
        escribir()
        normalizedChat = normalize({id:"chat1",comments: messagesNormalizar}, chatSchema); 
      
        io.emit('serverSend:message', normalizedChat)
    })
    // socket.on('client:message', messageInfo=>{
    //     messages.push(messageInfo) //RECIBO mensaje y lo anido
    //     io.emit('serverSend:message', messages)//EMITO CHATS
    // })
})

