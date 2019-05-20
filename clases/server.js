"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = __importDefault(require("socket.io"));
const clientes_1 = require("./clientes");
const cliente_1 = require("./cliente");
class Server {
    constructor() {
        this.clientes = new clientes_1.Clientes();
        // Inicializo la variable express
        this.app = express_1.default();
        this.configurarCORS();
        // A la variable httpServer le paso la configuracion de express
        this.httpServer = new http_1.default.Server(this.app);
        // Por ultimo a socketIo le paso la configuracion de httpServer que le asigne anteriormente la configuracion
        // de express
        this.io = socket_io_1.default(this.httpServer);
        this.puerto = process.env.PORT || 3700;
        this.configurarBodyParser();
        this.asignarRutas();
        this.escucharSockets();
    }
    configurarBodyParser() {
        var bodyParser = require('body-parser');
        //Configuracion del bodyParsedr
        this.app.use(bodyParser.urlencoded({ extended: false }));
        this.app.use(bodyParser.json());
    }
    configurarCORS() {
        //CONFIGURANDO EL CORS
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', 'http://127.0.0.1:4200'); // Cualquier dominio puede acceder al api
            res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // Tipo de cabeceras que acepta
            res.header('Access-Control-Allow-Methods', 'GET, POST'); // Metodo por cual va a ser invocado
            res.header('Allow', 'GET, POST'); // Asociado con el anterior
            next();
        });
    }
    escucharSockets() {
        console.log('Escuchando los sockets');
        this.io.on('connect', (cliente) => {
            let objCliente = new cliente_1.Cliente(cliente.id);
            this.clientes.add(objCliente);
            console.log('Nueva lista de conectados =>');
            console.log(this.clientes.getCliente());
            cliente.on('disconnect', () => {
                console.log(`El cliente ${cliente.id} se desconecto`);
                this.clientes.remove(cliente.id);
                this.io.emit('retorno-usuarios', this.clientes.getCliente());
            });
            cliente.on('configurar-usuario', (data) => {
                let objCliente = new cliente_1.Cliente(cliente.id);
                objCliente.nombre = data;
                this.clientes.update(objCliente);
                console.log('Nueva lista de conectados =>');
                console.log(this.clientes.getCliente());
                this.io.emit('retorno-usuarios', this.clientes.getCliente());
            });
            cliente.on('lista-usuarios', () => {
                this.io.emit('retorno-usuarios', this.clientes.getCliente());
            });
            cliente.on('enviar-mensaje', (mensaje) => {
                let objCliente = this.clientes.getClienteById(cliente.id);
                let content = {
                    mensaje,
                    nombre: objCliente.nombre
                };
                this.io.emit('nuevo-mensaje', content);
                // Cuando el cliente quiere emitir un evento
                // a todos los clientes conectados, excepto a si mismo 
                // cliente.broadcast.emit('evento',contenido);
            });
        });
    }
    asignarRutas() {
        this.app.get('/', (req, res) => { res.send('Buenas'); });
        this.app.post('/enviar-mensaje', (req, res) => {
            let { para, mensaje, de } = req.body;
            let content = {
                mensaje,
                nombre: de
            };
            this.io.to(para).emit('nuevo-mensaje', content); // El socket dispara un evento al usuario que tenga el id PARA y emitir un evento nuevo-mensaje
            res.status(200).send('');
        });
    }
    start() {
        this.httpServer.listen(this.puerto, () => {
            console.log('Servidor corriendo exitosamente en el puerto ' + this.puerto);
        });
    }
}
exports.Server = Server;
