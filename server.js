const express = require('express');
const app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http, {path: '/socketTest'});
const bodyParser = require('body-parser');
const cors = require('cors');
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(cors());
const Filter = require('bad-words');
var filter = new Filter();
const knex = require('knex');

const database = knex({
    client: 'pg',
    connection: {
        connectionString: process.env.DATABASE_URL,
        ssl: true,
    },
});

//broadcast to all except sender WORKING
//assign to room WORKING
//broadcast to room WORKING
//get id of individual socket

io.on('connection', (socket) => {
    console.log("A USER CONNECTED!");
    socket.emit('serverResponse', {msg:"SHOULD BE RECEIVED BY CURRENT USER ONLY!"});
    socket.broadcast.emit('broadcast', {msg:'broadcasting message'});
});

io.on('connection', (socket) => {
    console.log("test message");
    socket.on('disconnectMessage', (message) => {
        console.log("message1: " + message.msg1);
        console.log("message2: " + message.msg2);
        //io.emit('serverResponse', {msg: "test message from server"});
    });
});

io.on('connection', (socket) => {
    socket.on('join', (message) => {
        socket.join(message.msg);
        console.log("user joined room id: " + message.msg);
    });
});

io.on('connection', (socket) => {
    socket.on('testMessage', (message) => {
        console.log("test message: " + message.msg);
        console.log("socket id: " + socket.id);
        socket.to('room1').emit('roomMessage', {msg:'room test message'});
    });
});

io.on('connection', (socket) => {
    socket.on('disconnect', () => {
        console.log('CLIENT DISCONNECTED!');
    });
});

class Data {
    constructor(name, number) {
        this.name = name;
        this.number = number;
    }
    getName() { return this.name; }
    setName(name) { this.name = name; }
    getNumber() { return this.number; }
    setNumber(number) { this.number = number; }
};

var data = {
    array: [],
    length: 0,
};

function processPost(fileContent, request) {
    data.length = fileContent.length;
    for(let a = 0; a < data.length; ++a) {
        data.array.push(new Data(fileContent[a].name, fileContent[a].number));
    }
    //adds new blank Data object to data.array if length is less than 10
    if(data.length < 10) {
        ++data.length;
        data.array.push(new Data(null, 0));
    }
    for(let a = 0; a < data.length; ++a) {
        if(Number(request.body.data.number) > Number(data.array[a].number)) {
            //moves Data towards the end in data.array starting from the end moving forward
            //last element is overwritten, either blank or unneeded now
            for(let b = (data.length - 1); b > a; --b) {
                data.array[b].name = data.array[b - 1].name;
                data.array[b].number = data.array[b - 1].number;
            }
            //place data in request into data.array, filter name for offensive language
            data.array[a].name = filter.clean(request.body.data.name);
            data.array[a].number = request.body.data.number;
            break;
        }
    }
}

function writePost(fileContent, response) {
    fileContent = [];
    for(let a = 0; a < data.length; ++a) {
        fileContent.push({
            index: a,
            name: data.array[a].name,
            number: data.array[a].number,
        });
    }
    database('autocrawlerhighscore').insert(fileContent).then(() => {
        response.json("1: successful post");
    });
}

function mainPost(request, response) {
    if(Number.isNaN(request.body.data.number)) {
        response.json("0: not a valid number");
        return;
    }
    if(request.body.data.name.length > 17) {
        response.json("o: name invalid length");
        return;
    }
    data.length = null;
    data.array = [];
    database.select('*').from('autocrawlerhighscore').then((fileContent) => {
        database('autocrawlerhighscore').del().then(() => {
            processPost(fileContent, request); //fileContent into data, uses request
            writePost(fileContent, response); //also sends response
        });
    });
}

app.post('/autoCrawlerHighScores', (request, response) => {
    if(typeof request.body.data === 'undefined') {
        response.json("0: improper request type");
        return;
    }
    else if(typeof request.body.data.name === 'undefined') {
        response.json("0: improper request type");
    }
    else if(typeof request.body.data.number === 'undefined') {
        response.json("0: improper request type");
        return;
    }
    mainPost(request, response);
});

app.get('/autoCrawlerHighScores', (request, response) => {
    data.length = null;
    data.array = [];
    database.select("*").from("autocrawlerhighscore").then(databaseOutput => {
        data.length = databaseOutput.length;
        for(let a = 0; a < data.length; ++a) {
            data.array.push(new Data(databaseOutput[a].name, databaseOutput[a].number));
        }
        response.json({data});
    });
});

http.listen(process.env.PORT);