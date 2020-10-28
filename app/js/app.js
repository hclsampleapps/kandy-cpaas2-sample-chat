/**
 * CPaaS Authentication Demo
 */
var serverBase;
var mHostUrl;
var client;
const tokenAPI = '/cpaas/auth/v1/token'
var isChatHistory = false;

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
    client.on('messages:change', function (convo) {
        if (isChatHistory) {
            // If there are any errors, display them in status area
            if (convo.error && convo.error.message) {
                log('Error: ' + convo.error.message)
            }

            // Refresh the messages list using our internal array
            refreshMessagesList()

        } else {
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
        }

    })

    /**
     * Listen for a change in the list of conversations.
     * In our case, it will occur when we receive a message from a user that
     * we do not have a conversation created with.
     */
    client.on('conversations:change', function (convos) {

        if (isChatHistory) {
            // If there are any errors, display them in status area
            if (convos.error && convos.error.message) {
                log('Error: ' + convos.error.message)
            }

            // Refresh list of conversations based our internal array.
            refreshConversationsList()

            // // Clear list of messages, since we now have a new list of conversations.
            clearMessagesList()

        }
        else {
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
        }
    })

    // Handling any message related errors: we simply issue a log, for simplicity.
    client.on('messages:error', function (error) {
        log('Error: Got an error (as part of messages:error event). Error content is: ' + JSON.stringify(error))
    })

    // Listen for the event that tells us messages (for a selected conversation) have changed.
    client.on('messages:change', function (params) {
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
    if (isChatHistory) {
        const textNode = document.createTextNode(message)
        const divContainer = document.createElement('div')
        divContainer.appendChild(textNode)
        document.getElementById('terminal').appendChild(divContainer)
    } else {
        console.log(message);
        document.getElementById('terminal').innerHTML += '<p>' + message + '</p>';
    }

}


/*
 *  Basic Chat functionality.
 */

// We will only track one conversation in this demo.
var currentConvo

// Create a new conversation with another user.
function createConvo() {
    isChatHistory = false

    const participant = document.getElementById('convo-participant').value.toString().toLowerCase();

    // Pass in the SIP address of a user to create a conversation with them.
    currentConvo = client.conversation.create([participant], { type: 'chat-oneToOne' })
    log('One-to-One conversation created with remote user: ' + participant)


    log('Conversation created with: ' + participant)
}

// Create and send a message to the current conversation.
function sendMessage() {
    isChatHistory = false

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

function fetchConversations() {
    isChatHistory = true

    log('Fetching conversations...')
    client.conversation.fetch()
}

// This is how we get user selecting aconversation

function refreshConversationsList() {
    const conversations = client.conversation.getAll()

    // Remove whatever list items were displayed before
    const listOfConversationsElement = document.getElementById('list_of_conversations_container')
    listOfConversationsElement.innerHTML = ''

    // Now populate the list with new content
    if (conversations.length > 0) {
        log('Got an update. There are now ' + conversations.length + ' conversations available.')
        const selectElement = document.createElement('select')
        selectElement.id = 'list_of_conversations'
        selectElement.size = 4

        log('Loading ...')
        for (const conversation of conversations) {
            const labelValue = 'Conversation (' + conversation.type + ') with ' + conversation.destination[0]

            const optionElement = document.createElement('option')
            // Use 'HTML entities' encoder/decoder to escape whatever value we supply to the <option> element
            // This way we're not vulnerable to XSS injection attacks.
            optionElement.value = escape(conversation.destination[0])
            optionElement.label = labelValue

            selectElement.appendChild(optionElement)
        }

        listOfConversationsElement.appendChild(selectElement)
        listOfConversationsElement.appendChild(document.createElement('br'))
    } else {
        log('Got an update. No conversations available.')
    }
}

function clearMessagesList() {
    // Regardless of whether we now have any conversations left, we need to update the messages section in this tutorial.
    const listOfMessagesElement = document.getElementById('list_of_messages')
    if (listOfMessagesElement) {
        // wipe any previous content displayed under div: list_of_messages
        listOfMessagesElement.innerHTML = ''
    }
}

function getSelectedConversation() {
    const selectedConversationOption = document.getElementById('list_of_conversations').value
    return client.conversation.get(selectedConversationOption, { type: client.conversation.chatTypes.ONETOONE })
}

function fetchMessages() {
    isChatHistory = true

    const conversation = getSelectedConversation()
    if (!conversation) {
        log('Error: Cannot fetch messages. First select a conversation.')
        return
    }
    log('Fetching all messages for conversation with: ' + conversation.destination[0])
    conversation.fetchMessages()
}

function refreshMessagesList() {
    // wipe any previous content displayed under div: list_of_messages
    const lisOfMessagesElement = document.getElementById('list_of_messages')
    lisOfMessagesElement.innerHTML = ''

    const convValue = document.getElementById('list_of_conversations').value
    let messages
    if (convValue) {
        const conversation = client.conversation.get(convValue, { type: client.conversation.chatTypes.ONETOONE })
        messages = conversation.getMessages()
    }

    // Now populate the list with new content
    if (messages && messages.length > 0) {
        log('Got an update. There are now ' + messages.length + ' messages available.')
        let index = 1
        for (const message of messages) {
            lisOfMessagesElement.appendChild(document.createTextNode(index + ': Msg ID: '))
            const boldText = document.createElement('b')
            boldText.innerHTML = message.messageId
            lisOfMessagesElement.appendChild(boldText)
            lisOfMessagesElement.appendChild(document.createTextNode(' whose content is: ' + message.parts[0].text))
            lisOfMessagesElement.appendChild(document.createElement('br'))
            index++
        }
    } else {
        log('Got an update. No messages available (for currently selected conversation).')
    }
}

