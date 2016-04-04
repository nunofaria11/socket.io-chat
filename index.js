var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
const _port = 3000;

app.use(express.static('public'));

var usersLoggedIn = [],
    counter = 0;

function Client(id, alias) {
    this.id = id;
    this.alias = alias;
}
Client.prototype.id = null;
Client.prototype.alias = null;

function SocketContext(socket) {
    this.socket = socket;
}

SocketContext.prototype.socket = null;
SocketContext.prototype.client = null;

SocketContext.prototype.start = function () {

    var clientId = this.socket.id,
        clientAlias = "User " + (++counter),
        client = new Client(clientId, clientAlias);

    this.client = client;

    this.socket.on('disconnect', this.onDisconnect.bind(this));
    this.socket.on('chatmessage', this.onChatMessage.bind(this));
    this.socket.on('istyping', this.onIsTyping.bind(this));

    var clientResponse = {
        clientData: client,
        currentUsers: usersLoggedIn
    };
    this.socket.emit('clientid', clientResponse);

    // broadcast user connected
    var m = {
        timestamp: Date.now(),
        from: this.client
    };
    this.socket.broadcast.emit('userconnected', m);

    usersLoggedIn.push(client);
};
SocketContext.prototype.onDisconnect = function () {
    console.log('user disconnected:', this.client);
    var m = {
        timestamp: Date.now(),
        from: this.client
    };
    usersLoggedIn.splice(usersLoggedIn.indexOf(this.client), 1);
    counter--;
    this.socket.broadcast.emit('userdisconnected', m);
};
SocketContext.prototype.onChatMessage = function (m) {
    console.log('new message:', m);

    if (m.from.alias !== this.client.alias) {
        console.log('user %s changed alias to %s', this.client.alias, m.from.alias);
        this.socket.broadcast.emit('aliaschanged', {
            clientId: this.client.id,
            from: this.client,
            current: m.from.alias
        });
        this.client.alias = m.from.alias;
    }
    var now = Date.now();
    var m = {
        id: this.client.id + '-' + now,
        timestamp: now,
        from: this.client,
        message: m.message
    };
    this.socket.broadcast.emit('chatmessage', m);
};
SocketContext.prototype.onIsTyping = function (data) {
    console.log('is typing data:', data);

    if (data.from.alias !== this.client.alias) {
        console.log('user %s changed alias to %s', this.client.alias, data.from.alias);
        this.socket.broadcast.emit('aliaschanged', {
            clientId: this.client.id,
            from: this.client,
            current: data.from.alias
        });
        this.client.alias = data.from.alias;
    }

    var m = {
        from: this.client,
        isTyping: data.isTyping
    };

    this.socket.broadcast.emit('istyping', m);
};

io.on('connection', function (socket) {
    new SocketContext(socket).start();
});

http.listen(_port, function () {
    console.log('listening on port %d', _port);
});

app.get('/jquery', function (req, res) {
    res.sendFile(__dirname + '/public/index-jquery.html');
});


app.get('/react', function (req, res) {
    res.sendFile(__dirname + '/public/index-react.html');
});
