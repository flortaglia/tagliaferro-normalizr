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
const flash = require('connect-flash');

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
app.use(flash());
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


const httpServer = createServer();

const expressServer = app.listen(puerto, (err) => {
    if(err) {
        console.log(`Se produjo un error al iniciar el servidor: ${err}`)
    } else {
        console.log(`Servidor escuchando puerto: ${puerto}`)
    }
})
const io = new Server(expressServer) 

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

