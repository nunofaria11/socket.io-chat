/**
 * Created by NunoFaria on 27-02-2016.
 */
var __SERVER__ = 'http://localhost:3000';
var Hello = React.createClass({
    render: function () {
        return (
            <div>Hello world</div>
        );
    }
});

var Message = React.createClass({
    render: function () {
        return (
            <div className="chat-message">
                <span className="from">{this.props.from}:</span>
                <span className="message">{this.props.text}</span>
            </div>
        );
    }
});

var MessageList = React.createClass({
    _buildMessage: function (m) {
        return <Message from={m.from} text={m.message}></Message>;
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

var ChatBox = React.createClass({
    getInitialState: function () {
        return {
            alias: '',
            messages: [],
            message: '',
            socket: null
        };
    },
    componentDidMount: function () {
        // start socket io
        console.log('chat box rendered...');
        this.state.socket = io(__SERVER__);
        // register all event handlers
    },
    handleAliasChange: function (e) {
        this.setState({alias: e.target.value});
    },
    handleMessageChange: function (e) {
        this.setState({message: e.target.value});
    },
    sendMessage: function () {
        console.log('sending message...', this.state);
    },
    render: function () {
        return (
            <form onSubmit={this.sendMessage}>
                <!-- alias -->
                <input id="alias" type="text" placeholder="Alias..."
                       value={this.state.alias}
                       onChange={this.handleAliasChange}/>
                <!-- message list component -->
                <MessageList alias={this.state.alias}
                             messages={this.state.messages}/>
                <!-- message -->
                <input id="message" type="text " placeholder="Your message..."
                       value={this.state.message}
                       onChange={this.handleMessageChange}/>
                <!-- send button -->
                <button type="submit">Send</button>
            </form>
        );
    }
});

ReactDOM.render(
    <ChatBox />,
    document.getElementById('chat')
);