const GATEWAY_URL = "wss://osh89asdcb.execute-api.eu-central-1.amazonaws.com/production";

function Remote(openHandler, messageHandler)
{
    this.sock = new WebSocket(GATEWAY_URL);

    this.sock.onopen = function(event) {
        console.log("[open] Connection established");

        if(openHandler) openHandler();
    };

    this.sock.onmessage = function(event) {
        console.log(`[message] ${event.data}`);

        messageHandler(JSON.parse(event.data))
    };

    this.sock.onclose = function(event) {
        if (event.wasClean) {
            console.log(`[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`);
        } else {
            // e.g. server process killed or network down
            // event.code is usually 1006 in this case
            console.log('[close] Connection died'); // TODO refresh page
        }
    };

    this.sock.onerror = function(error) {
        console.log(`[error] ${error.message}`);
    };

    this.call = function(action, body) {
        if(body === undefined) body = {}
        body["action"] = action

        body = JSON.stringify(body)
        console.log(`[send] ${body}`)
        this.sock.send(body);
    };
}