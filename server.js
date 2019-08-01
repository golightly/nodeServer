const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(cors());
const fs = require('fs');
const Filter = require('bad-words');
var filter = new Filter();

//gates access to file to one user at a time to prevent data loss
var fileGate = false;

if(!fs.existsSync("data.txt")) {
    fs.writeFile("data.txt", "0", error => {
        console.log(error);
    });
}

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

var dataNameTemp = null;

function processGet(fileContent, response) {
    data.length = fileContent[0];
    dataNameTemp = null;
    //populate data with data from file
    for(let a = 1; a < (data.length * 2); a+=2) {
        dataNameTemp = fileContent[a];
        data.array.push(new Data(dataNameTemp, fileContent[a+1]));
    }
    response.json({data});
    fileGate = false;
}

function mainGet(response) {
    fileGate = true;
    data.length = null;
    data.array = [];
    fs.readFile('data.txt', (error, readData, response) => {
        if(error) {
            console.log(error);
            arguments[0].json("0: error reading file");
            fileGate = false;
        }
        else {
            let fileContent = readData.toString().split('\n');
            processGet(fileContent, arguments[0]); //fileContent into data, sends
        }
    });
}

function processPost(fileContent, request) {
    data.length = fileContent[0];
    dataNameTemp = null;
    //populate data with data from file
    for(let a = 1; a < (data.length * 2); a+=2) {
        dataNameTemp = fileContent[a];
        data.array.push(new Data(dataNameTemp, fileContent[a+1]));
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
    fileContent = data.length.toString();
    for(let a = 0; a < data.length; ++a) {
        fileContent += '\n';
        fileContent += data.array[a].name;
        fileContent += '\n';
        fileContent += data.array[a].number;
    }
    //element 0 of arguments is fileContent for some reason
    fs.writeFile("data.txt", fileContent, (error, response) => {
        if(error) {
            console.log(error);
            arguments[1].json("0: error writing to file");
            fileGate = false;
        }
        else {
            arguments[1].json("1: successful post");
            fileGate = false;
        }
    });
}

function mainPost(request, response) {
    if(Number.isNaN(request.body.data.number)) {
        response.json("0: not a valid number");
        return;
    }
    fileGate = true;
    data.length = null;
    data.array = [];
    fs.readFile('data.txt', (error, readData, request, response) => {
        if(error) {
            console.log(error);
            arguments[1].json("0: error reading file");
            fileGate = false;
        }
        else {
            let fileContent = readData.toString().split('\n');
            processPost(fileContent, arguments[0]); //fileContent into data, uses request
            writePost(fileContent, arguments[1]); //also sends response
        }
    });
}

function gate(executionType, request, response) {
    if(!fileGate) {
        if(executionType === "post")
            mainPost(request, response);
        else if(executionType === "get")
            mainGet(response);
    }
    else if(fileGate) {
        setTimeout(gate, 10, executionType, request, response);
    }
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
    gate("post", request, response);
});

app.get('/autoCrawlerHighScores', (request, response) => {
    gate("get", request, response);
});

app.listen(process.env.PORT);