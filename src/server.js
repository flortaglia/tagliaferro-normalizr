import fs from 'fs'
import express from 'express'
const app = express()
const puerto =8080
import routes from "./routes/index.js";
app.use("/", routes);

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

function print(objeto) {
    console.log(util.inspect(objeto, false, 12, true));
}

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
    print(normalizedChat)
    // print('capacidad normalizedChat',JSON.stringify(normalizedChat).length) 
    io.emit('serverSend:message', normalizedChat) //envio CHATS a todos los usuarios
    //archivo a Normalizar - recibido desde el Front
    socket.on('client:messageNormalizar', messageInfo=>{
        messageInfo.id=(messagesNormalizar.length)+1
        messagesNormalizar.push(messageInfo) //RECIBO mensaje y lo anido
        escribir()
        normalizedChat = normalize({id:"chat1",comments: messagesNormalizar}, chatSchema); 
        print(normalizedChat)
        io.emit('serverSend:message', normalizedChat)
    })
    // socket.on('client:message', messageInfo=>{
    //     messages.push(messageInfo) //RECIBO mensaje y lo anido
    //     io.emit('serverSend:message', messages)//EMITO CHATS
    // })
})

