import fs from 'fs'
import 'dotenv/config'
import express from 'express'
import routes from "./routes/index.js";
import session from "express-session";
import cookieParser from "cookie-parser";
import MongoStore from "connect-mongo";

// console.log("pwd:", process.cwd())
// const envFile = path.join(process.cwd(), './src/.env')
// dotenv.config({ path: envFile });


const DB_USER=process.env.DB_USER
const DB_PASSWORD=process.env.DB_PASSWORD
const DB_NAME=process.env.DB_NAME
const DB_CLUSTER=process.env.DB_CLUSTER

const app = express()
const puerto =8080
const mongoOptions = { useNewUrlParser: true, useUnifiedTopology: true };

app.use("/", routes);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }))

function authMiddleware(req, res, next) {
    console.log("authMiddleware",req.session.user)
  if (req.session.user) {
    next();
  } else {
    res.redirect("/login");
  }
}

function loginMiddleware(req, res, next) {
  if (req.session.user) {
    res.redirect("/");
  } else {
    next();
  }
}

app.use(
  session({
    store: MongoStore.create({
      mongoUrl:
        
        `mongodb+srv://${DB_USER}:${DB_PASSWORD}@${DB_CLUSTER}.mongodb.net/${DB_NAME}?retryWrites=true&w=majority`,
        
        //No FUNCIONA CON .ENV
      mongoOptions,
      ttl:600, //time to live sec session CHANGE TO =>10MIN 10*60
      autoRemove: 'native' //session expires the doc in mongodb will be removed
    }),
    secret: "clase24-coderback",
    resave: false,
    saveUninitialized: false,
    rolling: true, // Re initialization of the time in every request
    cookie: {
      maxAge: 60000, //CHANGE TO 1 MIN=> 1*1000*60
    },
  })
);
app.get('/',authMiddleware,(req,res)=>{
  res.sendFile(path.join(__dirname, "./public/index.html"));

})
app.get('/login',loginMiddleware,(req, res)=>{
  res.sendFile(path.join(__dirname, "./public","login.html"));
  
})
app.post('/process-login',(req, res)=>{
    console.log('req',req.body)
    req.session.user=req.body.username
    // res.status(200).send(req.session.user)
    res.redirect('/')
})
app.get('/user-info',(req, res)=>{
  res.json({username: req.session.user})
})

app.get('/logout',authMiddleware,(req, res)=>{
  res.send(`<h1>Hasta luego ${req.session.user}</h1>
  <script type="text/javascript">
  setTimeout(function(){ location.href = '/login'},2000)
  </script>`)
  req.session.destroy(err=>{
    if(err){
      console.log('error en el Logout:', err)
    }
  })
})
// const handlebars = require('express-handlebars')


// app.engine('hbs', handlebars({
//   extname: '.hbs',
//   defaultLayout: path.join(__dirname, './views/layouts/main.hbs'),
//   layoutsDir: path.join(__dirname, './views/layouts'),
//   partialsDir: path.join(__dirname, './views/partials')
// }))

// app.set('view engine', 'hbs')
// app.set('views', path.join(__dirname, './views'))

import path from 'path'
import { fileURLToPath } from 'url';

const __filename= fileURLToPath(import.meta.url)
const __dirname= path.dirname(__filename)
// import { Server: IOServer } from ('socket.io')



import { createServer } from "http";
import { Server } from "socket.io";
//NORMALIZR
import { normalize, schema, denormalize } from "normalizr";
import util from "util";

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
        console.log('guardado')
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

