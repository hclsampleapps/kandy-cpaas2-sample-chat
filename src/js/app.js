/**
 * CPaaS Authentication Demo
 */
var serverBase;
var mHostUrl;
var client;
const tokenAPI = '/cpaas/auth/v1/token'

whenReady(function() {
    let changeView = new ChangeView();
    changeView.showPasswordGrant();
});

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

    /*
     * Listen for new messages sent or received.
     * This event occurs when a new message is added to a conversation.
     */
    client.on('messages:change', function(convo) {
        const destination = convo.destination[0]
        log('New message in conversation with ' + destination)

        if (!currentConvo && ['im', 'chat', 'sms'].includes(convo.type)) {
            currentConvo = client.conversation.get(destination, { type: convo.type })
        }

        // If the message is in the current conversation, render it.
        if (currentConvo.destination[0] === destination) {
            renderLatestMessage(client.conversation.get(currentConvo.destination, { type: convo.type }))
        }
    })

    /*
     * Listen for a change in the list of conversations.
     * In our case, it will occur when we receive a message from a user that
     * we do not have a conversation created with.
     */
    client.on('conversations:change', function(convos) {
        log('New conversation')

        // If we don't have a current conversation, assign the new one and render it.
        if (!currentConvo && convos.length !== 0) {
            currentConvo = client.conversation.get(convos[0].destination, { type: convos[0].type })
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
        idToken: data.id_token
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

        log('Successfully logged in as ' + userEmail)

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
        idToken: data.id_token
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
    currentConvo = client.conversation.create([participant], { type: 'chat' })

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