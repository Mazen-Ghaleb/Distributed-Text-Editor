const GATEWAY_URL = "wss://osh89asdcb.execute-api.eu-central-1.amazonaws.com/production";

function Remote(openHandler, messageHandler, disconnectHandler, errorHandler)
{
    this.sock = new WebSocket(GATEWAY_URL);

    this.sock.onopen = function(event) {
        if(!document.IS_IFRAME){
            console.log("[open] Connection established");
        }
        if(openHandler) openHandler();
    };

    this.sock.onmessage = function(event) {
        if(!document.IS_IFRAME){
        console.log(`[message] ${event.data}`);
        }
        console.log(`[message] ${event.data}`);
        messageHandler(JSON.parse(event.data))
    };

    this.sock.onclose = function(event) {
        if (event.wasClean) {
            if(!document.IS_IFRAME){
                console.log(`[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`);
            }
        } else {
            // e.g. server process killed or network down
            // event.code is usually 1006 in this case
            if(!document.IS_IFRAME){
                console.log('[close] Connection died');

            }
            // Re-Open new socket after 5 seconds
            //setTimeout(function () {this = new Remote(openHandler, messageHandler)},5000);
        }

        disconnectHandler();
    };

    this.sock.onerror = function(error) {
        if(!document.IS_IFRAME){
        console.log(`[error] ${error.message}`);
        }

        errorHandler();
    };

    this.call = function(action, body) {
        if(body === undefined) body = {}
        body["action"] = action

        body = JSON.stringify(body)
        console.log(`[send] ${body}`)
        this.sock.send(body);
    };
}
