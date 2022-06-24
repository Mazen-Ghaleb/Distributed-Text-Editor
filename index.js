const AWS = new Remote(openHandler, messageHandler);
window.textChangeHandler = textChangeHandler;
// window.onbeforeunload = AWS.sock.close()  // Close Socket on closing site