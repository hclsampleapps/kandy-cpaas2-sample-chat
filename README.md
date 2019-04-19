# kandy-cpaas2-sample-chat

### Chat app

This app is used to create communication channel between two users via Chat APIs.

 - Try the [demo](https://hclsampleapps.github.io/kandy-cpaas2-sample-chat/app/)
 - Get the [source code](https://github.com/hclsampleapps/kandy-cpaas2-sample-chat)

#### User manual 

1. Create an account on **AT&T** portal via [Register now for a free account](https://apimarket.att.com/signup).
2. Open 2 instances of `index.html` in the browser for *User1* and *User2*.
3. Enter the *server URL*, for e.g.,
	- For AT&T API Marketplace [apimarket.att.com](https://apimarket.att.com), enter `https://oauth-cpaas.att.com`
4. Choose to get accessToken by *Password Grant* flow or *Client Credentials* flow.
5. Login using two different users' credentials in both the browser windows.
6. For **Password Grant** flow, enter 
	- *clientId* 
	- *emailId* 
	- *password*  
7. For **Client Credentials Grant** flow, enter
	- *privateKey*
	- *privateSecret*   
8. Click ***Login***
7. After successful login you will get an *accessToken* for *User1* and *User2*, that you can use to send/receive chat message between both the users.
8. Click "Subscribe" button in both the browser windows to create the webrtc channel.
9. Enter the *User2*'s User ID into the *User1*'s browser window under ***Conversation*** section; e.g., janedoe@somedomain.com ([userId]@[domain]) 
10. Click on ***Create*** button to create the conversation between both the users.
11. Enter the text message into the *User1*'s ***Message*** input field and Click on Send button.
12. open the *User2*'s browser window and check the ***Message*** input field, if message received than type a message into the *User2*'s ***Message*** input field and click on send button.

##### Notes

 - Existing user can confirm their account via [Log in to AT&T API Marketplace](https://apimarket.att.com/login)
 - You can download *kandy.js* from [Developer documentation - SDKs](https://apimarket.att.com/developer/sdks/javascript)

### Development

To setup the project repository, run these commands

```
git clone https://github.com/hclsampleapps/kandy-cpaas2-sample-chat.git
cd kandy-cpaas2-sample-chat
```

Then, open ```index.html``` in the browser to view the app.

#### Branching strategy

To learn about the branching strategy, contribution & coding conventions followed in the project, please refer [GitFlow based branching strategy for your project repository](https://gist.github.com/ribbon-abku/10d3fc1cff5c35a2df401196678e258a)
