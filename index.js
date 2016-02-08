var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
const _port = 3000;

var usersLoggedIn = 0;

function SocketContext(socket) {
    this.socket = socket;
    this.id = usersLoggedIn++;
}

SocketContext.prototype.socket = null;

SocketContext.prototype.start = function() {
    this.socket.on('disconnect', this.onDisconnect.bind(this));
    this.socket.on('chatmessage', this.onChatMessage.bind(this));
    this.socket.on('istyping', this.onIsTyping.bind(this));
    this.socket.broadcast.emit('chatmessage', {
        from: 'server',
        message: 'welcome to this chat!'
    });
};
SocketContext.prototype.onDisconnect = function() {
    console.log('user disconnected');    
};
SocketContext.prototype.onChatMessage = function(m) {
    console.log('new message:', m);
    this.socket.broadcast.emit('chatmessage',m);
};
SocketContext.prototype.onIsTyping = function(data) {
    console.log('is typing data:', data);
    console.log('has socket', !!this.socket);
    this.socket.broadcast.emit('istyping', data);
};

io.on('connection', function(socket) {
    console.log('user connected');
    new SocketContext(socket).start();    
});

http.listen(_port, function() {
    console.log('listening on port %d', _port);
});

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});
