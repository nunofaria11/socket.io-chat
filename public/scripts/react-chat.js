/**
 * Created by NunoFaria on 27-02-2016.
 */
var __SERVER__ = 'http://localhost:3000';
var socket = null;

/**
 * Message component
 */
var Message = React.createClass({
    render: function () {
        return (
            <div className="chat-message">
                <span className="from">{this.props.from}:&nbsp;</span>
                <span className="message">{this.props.text}</span>
            </div>
        );
    }
});

/**
 * List of sent messages
 */
var MessageList = React.createClass({
    _buildMessage: function (m) {
        return (
            <Message from={m.from.alias} text={m.message} key={m.id}/>
        );
    },
    render: function () {
        // if has messages
        if (this.props.messages.length > 0) {
            var chatMessages = this.props.messages.map(this._buildMessage);
            return <div className="messages-list">{chatMessages}</div>;
        } else {
            // if no messages
            return <div className="messages-list-empty">No messages yet</div>;
        }
    }
});

/**
 * List of users
 */
var UsersList = React.createClass({
    _buildUser: function (user, isLast) {
        var text = user.alias;
        if (!isLast) {
            text += ', ';
        }
        return <span key={user.id} className="active-user">{text}</span>;
    },
    render: function () {
        console.log('users:', this.props.users);
        var activeUsers = this.props.users;
        if (activeUsers.length === 0) {
            return <div>No users {this.props.suffix}</div>;
        } else {
            var activeUsersElements = [], isLast, i;
            for (i = 0; i < activeUsers.length; i++) {
                isLast = (i + 1) >= activeUsers.length;
                activeUsersElements.push(
                    this._buildUser(activeUsers[i], isLast)
                );
            }
            return (
                <div>
                    {activeUsersElements}
                    {this.props.suffix}
                </div>
            );
        }

    }
});

function isFromMySelf(msg, clientId) {
    return msg.from.clientId === clientId;
}

/**
 * Main component
 */
var ChatBox = React.createClass({
    getInitialState: function () {
        return {
            alias: '',
            messages: [],
            activeUsers: [],
            usersTyping: [],
            message: '',
            clientId: null,
            isTyping: false,
            isTypingTimeout: null
        };
    },
    _onClientIdEv: function (data) {
        console.log('on init', data);
        var partialState = {};

        partialState.clientId = data.clientData.id;
        partialState.alias = data.clientData.alias;
        partialState.activeUsers = data.currentUsers;

        this.setState(partialState);
    },
    _onIsTypingEv: function (data) {
        console.log('is typing:', data);
        var usersTyping = this.state.usersTyping;
        console.log('--- usersTyping:', usersTyping);
        if (data.from.id !== this.state.clientId) {
            var idx = -1;
            for (var i = 0; i < usersTyping.length && idx === -1; i++) {
                if (usersTyping[i].id === data.from.id) {
                    idx = i;
                }
            }
            if (idx === -1) {
                if (data.isTyping) {
                    usersTyping.push(data.from);
                }
            } else {
                if (!data.isTyping) {
                    usersTyping.splice(idx, 1);
                }
            }
        }
        this.setState({usersTyping: usersTyping});
    },
    _onMessageEv: function (msg) {
        console.log('message received', msg);
        if (msg.hasOwnProperty('message') && msg.hasOwnProperty('from')) {
            if (isFromMySelf(msg, this.state.clientId)) {
                console.log('message sent');
                return;
            }
            var messages = this.state.messages;
            messages.push(msg);
            console.log('added message:', messages);
            this.setState({messages: messages});
        } else {
            console.error('bad format:', msg);
        }
    },
    _onUserConnectedEv: function (data) {
        console.log('user connected:', data.from);
        this.state.activeUsers.push(data.from);
        this.setState({activeUsers: this.state.activeUsers});
    },
    _onUserDisconnectedEv: function (data) {
        console.log('user disconnected:', data.from);
        var idx = -1, i, users = this.state.activeUsers;
        for (i = 0; i < users.length && idx !== -1; i++) {
            if (users[i].id === data.from.id) {
                idx = i;
            }
        }
        if (idx !== -1) {
            users.splice(idx, 1);
            this.setState({activeUsers: users});
        }

    },
    _onAliasChangedEv: function (data) {
        console.log('user changed alias:', data.from);
        var user;
        for (var i = 0; i < this.state.activeUsers.length && !user; i++) {
            if (this.state.activeUsers[i].id === data.from.id) {
                user = this.state.activeUsers[i];
            }
        }
        if (user) {
            user.alias = data.current;
            this.setState({activeUsers: this.state.activeUsers});
        }
    },
    componentDidMount: function () {
        // start socket io
        socket = io(__SERVER__);

        // client-registered event
        socket.on('clientid', this._onClientIdEv);

        // on is-typing
        socket.on('istyping', this._onIsTypingEv);

        // on chat message received
        socket.on('chatmessage', this._onMessageEv);

        // on other user connecter
        socket.on('userconnected', this._onUserConnectedEv);

        // on other user disconnected
        socket.on('userdisconnected', this._onUserDisconnectedEv);

        // on some user alias changed
        socket.on('aliaschanged', this._onAliasChangedEv);

    },
    handleAliasChange: function (e) {
        this.setState({alias: e.target.value});
    },
    handleMessageChange: function (e) {
        this.setState({message: e.target.value});
    },
    handleKeyPress: function (e) {
        if (e.which === 13) {
            return;
        }
        console.log('user is typing...');
        if (this.state.isTypingTimeout) {
            clearTimeout(this.state.isTypingTimeout);
        }
        var isTypingFromData = {
            clientId: this.state.clientId,
            alias: this.state.alias
        };
        // send is-typing event
        this.state.isTyping = true;
        socket.emit('istyping', {
            from: isTypingFromData,
            isTyping: true
        });
        this.state.isTypingTimeout = setTimeout(function () {
            // within 5s, send is not typing event (stop typing)
            this.state.isTyping = false;
            socket.emit('istyping', {
                from: isTypingFromData,
                isTyping: false
            });
        }.bind(this), 3000);

    },
    sendMessage: function (e) {
        e.preventDefault();
        console.log('sending message...', this.state);
        var alias = this.state.alias;
        var fromData = {
            clientId: this.state.clientId,
            alias: alias
        };
        var now = Date.now();
        var msg = {
            id: this.state.clientId + '-' + now,
            timestamp: now,
            from: fromData,
            message: this.state.message
        };

        // preemptive add message to list
        var messages = this.state.messages;
        messages.push(msg);
        socket.emit('chatmessage', msg);

        this.state.isTyping = false;
        socket.emit('istyping', {
            from: fromData,
            isTyping: false
        });
        this.setState({message: '', messages: messages});

    },
    render: function () {
        return (
            <form onSubmit={this.sendMessage}>

                <input id="alias" type="text" placeholder="Alias..."
                       value={this.state.alias}
                       onChange={this.handleAliasChange}/>

                <UsersList users={this.state.activeUsers} suffix=" online"/>

                <MessageList alias={this.state.alias}
                             messages={this.state.messages}/>

                <UsersList users={this.state.usersTyping} suffix=" typing"/>

                <input id="message" type="text " placeholder="Your message..."
                       value={this.state.message}
                       onKeyPress={this.handleKeyPress}
                       onChange={this.handleMessageChange}/>

                <button>Send</button>
            </form>
        );
    }
});

ReactDOM.render(
    <ChatBox />,
    document.getElementById('chat')
);