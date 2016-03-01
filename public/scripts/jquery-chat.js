/**
 * Created by NunoFaria on 01-03-2016.
 */
Object.prototype.values = function (o) {
    var i, k, keys = Object.keys(o),
        values = [];
    for (i = 0; i < keys.length; i++) {
        k = keys[i];
        if (o.hasOwnProperty(k))
            values.push(o[k]);
    }
    return values;
};
var __SERVER__ = 'http://localhost:3000';
var socket = io(__SERVER__);

var clientData;

var currentUsers = {};

function updateCurrentUsers(users) {
    if (users.length === 0) {
        $('#currentUsers').text('');
        return;
    }
    var text = 'Online: ';
    for (var i = 0; i < users.length; i++) {
        text += users[i].alias + ' ';
        if (i + 1 !== users.length) {
            text += ', ';
        } else if (users.length !== 1) {
            text += 'and';
        }
    }
    $('#currentUsers').text(text);
}

function addMessageToList(msg) {
    var text = msg.from.alias + ' said: ' + msg.message;
    var element = $('<li>').text(text);
    $('#messages').append(element);
}

function isFromMySelf(msg) {
    var isFromMySelf = msg.from.clientId === clientData.clientId;
    return isFromMySelf;
}

function updateUsersTyping(users) {
    if (users.length === 0) {
        $('#typing').text('');
        return;
    }
    var text = '';
    for (var i = 0; i < users.length; i++) {
        text = users[i] + ' ';
        if (i + 1 !== users.length) {
            text += ', ';
        } else if (users.length !== 1) {
            text += 'and';
        }
    }
    text += users.length === 1 ? 'is' : 'are';
    text += ' typing';
    $('#typing').text(text);
}

$('form').submit(function () {
    var alias = $('#alias').val();
    var clientId = clientData.clientId;
    var msg = {
        from: {
            clientId: clientId,
            alias: alias
        },
        message: $('#message').val()
    };
    addMessageToList(msg);
    socket.emit('chatmessage', msg);

    isTyping = false;
    socket.emit('istyping', {
        from: {
            clientId: clientId,
            alias: alias
        },
        isTyping: false
    });
    $('#message').val('');
    return false;
});

socket.on('chatmessage', function (msg) {
    console.log('message received', msg);
    if (msg.hasOwnProperty('message') && msg.hasOwnProperty('from')) {
        if (isFromMySelf(msg)) {
            console.log('message sent');
            return;
        }
        addMessageToList(msg);
        return;
    } else {
        console.error('bad format:', msg);
    }
});

var isTyping = false,
    isTypingTimeout;
$('#message').keypress(function (e) {

    if (e.which === 13 || isTyping)
        return;

    var alias = $('#alias').val();
    if (isTypingTimeout) clearTimeout(isTypingTimeout);
    isTyping = true;
    var clientId = clientData.clientId;
    // send is typing event (start typing)
    socket.emit('istyping', {
        from: {
            clientId: clientId,
            alias: alias
        },
        isTyping: isTyping
    });
    isTypingTimeout = setTimeout(function () {
        // within 5s, send is not typing event (stop typing)
        isTyping = false;
        socket.emit('istyping', {
            from: {
                clientId: clientId,
                alias: alias
            },
            isTyping: isTyping
        });
    }, 3000);
});

var usersTyping = [];
socket.on('istyping', function (data) {
    //console.log('is typing:', data);
    if (!isFromMySelf(data)) {
        var idx = usersTyping.indexOf(data.from.alias);
        if (idx === -1) {
            if (data.isTyping) {
                usersTyping.push(data.from.alias);
            }
        } else {
            if (!data.isTyping) {
                usersTyping.splice(idx, 1);
            }
        }
    }
    updateUsersTyping(usersTyping);
});

socket.on('clientid', function (data) {
    console.log('on init', data);
    clientData = {
        clientId: data.clientData.id,
        alias: data.clientData.alias
    };
    $('#alias').val(clientData.alias);

    currentUsers = {};
    var i, user;
    for (i = 0; i < data.currentUsers.length; i++) {
        user = data.currentUsers[i];
        currentUsers[user.clientId] = user;
    }
    updateCurrentUsers(Object.values(currentUsers));
});

socket.on('userconnected', function (data) {
    console.log('user connected:', data.from);
    //currentUsers.push(data.from);
    currentUsers[data.from.id] = data.from;
    updateCurrentUsers(Object.values(currentUsers));
});
socket.on('userdisconnected', function (data) {
    console.log('user disconnected:', data.from);
    //var idx = currentUsers.indexOf(data.from);
    //currentUsers.splice(idx, 1);
    delete currentUsers[data.from.id];
    updateCurrentUsers(Object.values(currentUsers));
});
socket.on('aliaschanged', function (data) {
    console.log('user changed alias:', data.from);
    var user = currentUsers[data.from.id];
    user.alias = data.current;
    updateCurrentUsers(Object.values(currentUsers));
});