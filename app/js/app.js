/**
 * CPaaS Authentication Demo
 */
var serverBase;
var mHostUrl;
var client;
const tokenAPI = '/cpaas/auth/v1/token'

whenReady(function() {
    Notification.initialize();
    let changeView = new ChangeView();
    changeView.showPasswordGrant();
});

class Notification {
    static initialize(el) {
        this.container = document.querySelector('.notification');
        this.close = document.querySelector('.notification .close');
        this.close.addEventListener('click', e => this.container.classList.add('hide'));
    }
}

class ChangeView {
    constructor() {
        this.accountPasswordGrantView = document.getElementById('passwordID');
        this.accountClientCredentialsView = document.getElementById('clientCredID');

        this.accountPasswordGrantradio = document.getElementById('passwordGrant');
        this.accountPasswordGrantradio.addEventListener('click', (evt) => this.showPasswordGrant(evt));

        this.accountClientCredentialsradio = document.getElementById('clientCred');
        this.accountClientCredentialsradio.addEventListener('click', (evt) => this.showClientCredentials(evt));
    }

    showPasswordGrant() {
        Effect.hide(this.accountClientCredentialsView);
        Effect.show(this.accountPasswordGrantView);
    }

    showClientCredentials() {
        Effect.show(this.accountClientCredentialsView);
        Effect.hide(this.accountPasswordGrantView);
    }
}

function initClient() {
    let mServerUrl = document.getElementById("serverUrl").value;
    mHostUrl = new URL(mServerUrl).host;
    console.log(mHostUrl);
    client = Kandy.create({
        subscription: {
            expires: 3600
        },
        // Required: Server connection configs.
        authentication: {
            server: {
                base: mHostUrl
            },
            clientCorrelator: 'sampleCorrelator'
        }
    })

    /**
     * Listen for new messages sent or received.
     * This event occurs when a new message is added to a conversation.
     */
    client.on('messages:change', function(convo) {
        const destination = convo.destination[0]
        log('New message in conversation with ' + destination)
        /**
         * We'll update the currently used conversation object (for this logged-in user) if any of the two scenarios apply:
         * 1. There was no previous conversation and now we get a notification of a new message coming in (for this logged-in user).
         * 2. We had a previous conversation but its destination is not the same as the destination associated with this new incoming message.
         *    This is the case when sender of this message switched between a group conversation to a one-to-one conversation (and vice-versa) and then sent a new message.
         *    When this switching occurs, the destination is either the GroupId or UserID. No matter what is the current destination we want to show in this example that we can receive it.
         */
        if ((!currentConvo || currentConvo.destination[0] != destination) && ['chat-oneToOne', 'chat-group', 'sms'].includes(convo.type)) {
            currentConvo = client.conversation.get(destination, { type: convo.type })
        }

        // If the message is in the current conversation, render it.
        if (currentConvo.destination[0] === destination) {
            var val = client.conversation.get(currentConvo.destination, { type: convo.type });
            renderLatestMessage(client.conversation.get(currentConvo.destination, { type: convo.type }))
        }
    })

    /**
     * Listen for a change in the list of conversations.
     * In our case, it will occur when we receive a message from a user that
     * we do not have a conversation created with.
     */
    client.on('conversations:change', function(convos) {
        log('New conversation')

        if (Array.isArray(convos)) {
            // If we don't have a current conversation, assign the new one and render it.
            if (!currentConvo && convos.length !== 0) {
                currentConvo = client.conversation.get(convos[0].destination, { type: convos[0].type })
                renderLatestMessage(currentConvo)
            }
        } else {
            // Temporary fix: the first time a message is sent (as part of a new conversation), the 'convos' param is NOT an array
            currentConvo = client.conversation.get(convos.destination[0], { type: convos.type })
            renderLatestMessage(currentConvo)
        }
    })

}

/**
 * Creates a form body from an dictionary
 */
function createFormBody(paramsObject) {
    const keyValuePairs = Object.entries(paramsObject).map(
        ([key, value]) => encodeURIComponent(key) + '=' + encodeURIComponent(value)
    )
    return keyValuePairs.join('&')
}

/**
 * Gets the tokens necessary for authentication to CPaaS
 */
async function getTokensByPasswordGrant({
    clientId,
    username,
    password
}) {
    const cpaasAuthUrl = constructServerUrl();
    const formBody = createFormBody({
        client_id: clientId,
        username,
        password,
        grant_type: 'password',
        scope: 'openid'
    })
    // POST a request to create a new authentication access token.
    const fetchResult = await fetch(cpaasAuthUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formBody
    })
    // Parse the result of the fetch as a JSON format.
    const data = await fetchResult.json()
    return {
        accessToken: data.access_token,
        idToken: data.id_token,
        expiresIn: data.expires_in
    }
}

async function loginByPasswordGrant() {
    initClient();
    const clientId = document.getElementById('clientId').value
    const userEmail = document.getElementById('userEmail').value
    const password = document.getElementById('password').value
    try {
        const tokens = await getTokensByPasswordGrant({
            clientId,
            username: userEmail,
            password
        })

        log('Successfully logged in as ' + userEmail + '. Your access token will expire in ' + tokens.expiresIn/60 + ' minutes')

        client.setTokens(tokens)

    } catch (error) {
        log('Error: Failed to get authentication tokens. Error: ' + error)
    }
}

async function getTokensByClientCredGrant({
    client_id,
    client_secret
}) {
    const cpaasAuthUrl = constructServerUrl();
    const formBody = createFormBody({
        client_id,
        client_secret,
        grant_type: 'client_credentials',
        scope: 'openid regular_call'
    })

    // POST a request to create a new authentication access token.
    const fetchResult = await fetch(cpaasAuthUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formBody
    })
    // Parse the result of the fetch as a JSON format.
    const data = await fetchResult.json();

    return {
        accessToken: data.access_token,
        idToken: data.id_token,
        expiresIn: data.expires_in
    }
}

async function loginByClientCred() {
    initClient();
    const privateKey = document.getElementById('privateKey').value
    const privateSecret = document.getElementById('privateSecret').value

    try {
        const tokens = await getTokensByClientCredGrant({
            client_id: privateKey,
            client_secret: privateSecret
        })
        client.setTokens(tokens)
        log('Successfully logged in with project User ' + privateKey)
    } catch (error) {
        log('Error: Failed to get authentication tokens. Error: ' + error)
    }
}

function constructServerUrl() {
    let cpaasUrl;
    let enteredBaseUrl = document.getElementById("serverUrl").value
    if (enteredBaseUrl.trim() !== "") {
        serverBase = enteredBaseUrl.trim()
    }
    cpaasUrl = serverBase + tokenAPI
    return cpaasUrl;
}

function subscribe() {
    const services = ['chat']
    const subscriptionType = 'websocket'
    client.services.subscribe(services, subscriptionType)
    log('Subscribed to chat service (websocket channel)')
}

// Utility function for appending messages to the message div.
function log(message) {
    console.log(message);
    document.getElementById('terminal').innerHTML += '<p>' + message + '</p>';
}

/*
 *  Basic Chat functionality.
 */

// We will only track one conversation in this demo.
var currentConvo

// Create a new conversation with another user.
function createConvo() {
    const participant = document.getElementById('convo-participant').value.toString().toLowerCase();

    // Pass in the SIP address of a user to create a conversation with them.
    currentConvo = client.conversation.create([participant], { type: 'chat-oneToOne' })
    log('One-to-One conversation created with remote user: ' + participant)


    log('Conversation created with: ' + participant)
}

// Create and send a message to the current conversation.
function sendMessage() {
    if (currentConvo) {
        var text = document.getElementById('message-text').value

        // Create the message object, passing in the text for the message.
        var message = currentConvo.createMessage(text)

        // Send the message!
        message.send()
    } else {
        log('No current conversation to send message to.')
    }
}

// Display the latest message in the provided conversation.
function renderLatestMessage(convo) {
    // Retrieve the latest message from the conversation.
    var messages = convo.getMessages()
    var message = messages[messages.length - 1]

    // Construct the text of the message.
    var text = message.sender + ': ' + message.parts[0].text

    // Display the message.
    var convoDiv = document.getElementById('convo-messages')
    convoDiv.innerHTML += '<div>' + text + '</div>'
}
