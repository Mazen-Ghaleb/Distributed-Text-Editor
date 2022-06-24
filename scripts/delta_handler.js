let Delta = Quill.import('delta');

let syncedVersion = 0;
let allDeltas = [];

//Should have the document up to allDeltas[syncedVersion]
let syncedDocument = new Delta();

let pendingDelta = undefined;
let blockedDelta = undefined;

let errorAlert = document.getElementById("errorAlert");
let alertTimeout = undefined;

let editUI = document.getElementById("container");
let documentsUI = document.getElementById("documents");

let latestDelta = 0;

let documentSelect = document.getElementById("documentSelect");
let documentName = document.getElementById("documentName");

let cursorInterval = undefined;

function Cursor(type, index, length) {
    this.type = type;
    this.index = index;
    this.length = length;
    this.documentVersion = syncedVersion;
}

function getMyCursor() {
    let range = quill.getSelection();
    let cursor;
    if (range) {
        if (range.length == 0) {
            // User cursor is on index
            cursor = new Cursor("atIndex", range.index, range.length);
            //AWS.call("sendBroadcast", { "message": JSON.stringify(cursor)})
        } else {
            // User has highlighted
            cursor = new Cursor("highlight", range.index, range.length);
            // AWS.call("sendBroadcast", { "message": JSON.stringify(cursor)})
        }
    }
    else {
        // Cursor not in the editor
        cursor = new Cursor("notInDocument");
        //AWS.call("sendBroadcast", { "message": JSON.stringify(cursor)})
    }
    return cursor;
}

function sendCursorChanges() {
    if (!document.IS_IFRAME) {
        console.log("sendCursorChanges")
    }
    // quill.on('selection-change',  function(eventName, ...args)  {
    //     if (range && range.length !== 0) {
    //         getMyCursor
    //     }

    AWS.call("sendBroadcast", { "message": JSON.stringify(getMyCursor()) })
    //});
}

function generateRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function newBroadcastHandler(statusCode, body, newCursor = null) {
    let ver;
    if (newCursor === null) {
        newCursor = JSON.parse(body["message"]);
        ver = newCursor.documentVersion;
    }
    else {
        ver = body["version"];
        if (!document.IS_IFRAME) {
            console.log(newCursor)
        }
    }

    let id = body["connectionId"];
    if (!document.IS_IFRAME) {
        console.log(newCursor, userDict, id)
    }

    if (!(id in userDict)) {
        userCounter++;
        userDict[id] = "User " + userCounter;
    }
    cursorManager.createCursor(id, userDict[id], generateRandomColor()); //Creates cursor if doesn't exist

    cursorManager.toggleFlag(id, true);

    if (ver === syncedVersion && pendingDelta === undefined) {
        if (newCursor.type === "atIndex") {
            cursorManager.moveCursor(id, { 'index': newCursor.index, 'length': newCursor.length });
        }
        else if (newCursor.type === "highlight") {
            cursorManager.moveCursor(id, { 'index': newCursor.index, 'length': newCursor.length });
        }
        else if (newCursor.type === "notInDocument") {
            cursorManager.removeCursor(id);
        }
        cursorManager.update();
    }
}

function alertTimeoutHandler() {
    if (!document.IS_IFRAME) {
        console.log("alertTimeoutHandler")
    }
    errorAlert.parentElement.style.display = "none";
}

function alertError(message) {
    if (alertTimeout) clearTimeout(alertTimeout);
    alertTimeout = setTimeout(alertTimeoutHandler, 4000)

    errorAlert.innerText = message;
    errorAlert.parentElement.style.display = "block";
    errorAlert.parentElement.style.backgroundColor = "red";
}

function alertSuccess(message) {
    if (alertTimeout) clearTimeout(alertTimeout);
    alertTimeout = setTimeout(alertTimeoutHandler, 4000)

    errorAlert.innerText = message;
    errorAlert.parentElement.style.display = "block";
    errorAlert.parentElement.style.backgroundColor = "green";
}

function openDocumentHandler(documentName) {

    //documentName = elm.getAttribute('value');

    // editUI.style.display = "block";
    // documentsUI.style.display = "none";

    // if(documentSelect.value === "")
    // {
    //     alertError("No existing documents to open")
    //     return false;
    // }
    // if (allDocuments.length === 0){
    //     setTimeout(1000);
    // }

    // console.log(documentName)
    // console.log (Object.keys(allDocuments).map(function(key){
    //     return allDocuments[key]["documentName"];
    // }))
    // console.log (Object.keys(allDocuments).map(function(key){
    //     return allDocuments[key]["documentName"].indexOf(documentName) > -1;
    // }))

    if ((Object.keys(allDocuments).map(function (key) {
        return allDocuments[key]["documentName"].indexOf(documentName) != -1;
    }))) {
        documentsUI.style.display = "none";
        //console.log(documentName)
        AWS.call("joinDocument", { "documentName": documentName });
        if (document.IS_INDEX)
            clearInterval(SelectionInterval);
    }
    else {
        alertError("Document name doesn't exist")
    }
    return false;
}

function createDocumentHandler() {
    documentsUI.style.display = "none";
    if (documentName.value === "") {
        alertError("Please enter the new document's name")
        return false;
    }

    AWS.call("newDocument", { "documentName": documentName.value });
    clearInterval(SelectionInterval);
    return false;
}

function openHandler() {
    if (!document.IS_IFRAME) {
        console.log("open")
    }
    AWS.call("listDocuments")
}

function newDocumentHandler(statusCode, body) {
    if (statusCode !== 200) {
        alertError("Could not create document: " + body);
        return;
    }
console.log(body);
    alertSuccess("Document created");
    window.location.assign(pathRoot+'/views/document.html?doc='+ documentName.value)
    editUI.style.display = "block";
}

function generateCardsForAllDocuments(documents) {
    if (currentDocumentCards !== documents) {
        //get div with id cardsDiv
        let cardsDiv = document.getElementById("documentsCardsDiv");
        cardsDiv.innerHTML = "";
        //loop through all documents
        for (const doc of documents) {
            docDate = doc.documentDate.substring(5, 16).split(' ');
            displayedDate = docDate[1] + " " + docDate[0] + ", " + docDate[2];
            cardsDiv.innerHTML += `
            <div class="card" style="width:16em; height: 16m; margin-top: 10px; margin-bottom: 10px;display: inline-block;">
                <iframe src="${pathRoot}/views/document.html?iframe=y?doc=${doc.documentName}" scrolling="no" style="overflow:hidden; width:100%; height:100%;border:none;" title="${doc.documentName}"></iframe> 
                <div class="card-body">
                    <a href='${pathRoot}/views/document.html?doc=${doc.documentName}'>
                        <h5 id="card" class="card-title">${doc.documentName}</h5>
                    </a>
                    <div style="display: inline-block;">
                        <p id="cardDate" class="card-text" style="display: inline-block;"><img id="cardDocumentIcon" alt="Document" src="${pathRoot}/media/document.png" style="height:2; width:2em; display: inline-block;">${displayedDate} <!-- Default dropup button -->
                            <div class="btn-group dropup">
                                <button type="button" class="btn btn-secondary dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                    Dropup
                                </button>
                                <div class="dropdown-menu">
                                    <!-- Dropdown menu links -->
                                    <a class="dropdown-item" href="${pathRoot}/views/revert.html?doc=${doc.documentName}">Revert Version</a>
                                    <a class="dropdown-item" href="#">Rename</a>
                                    <a class="dropdown-item" href="#">Delete</a>
                                </div>
                            </div>            
                        </p>
                    </div>
                    <br>
                </div>
            </div> 
        `
        }
        currentDocumentCards = documents;
    }
}

function listDocumentsHandler(statusCode, body) {
    if (document.IS_INDEX) {
        // console.log (allDocuments)
        // console.log (body["documents"])
        // console.log (JSON.stringify(allDocuments)==JSON.stringify(body["documents"]))
        //console.log( allDocuments.filter(o1 => body["documents"].some(o2 => o1.documentName === o2.documentName)).length === body["documents"].length);
        if (!document.NOT_SORT_DATE) {
            console.log(body["documents"].sort(function (a, b) { return new Date(b.documentDate) - new Date(a.documentDate)}))
            body["documents"].sort(function (a, b) { return new Date(b.documentDate) - new Date(a.documentDate)});
            if (currentDocumentSort === false){
                generateCardsForAllDocuments(body["documents"]);
                currentDocumentSort = true;
            }
        }
        else {
            body["documents"].sort(function (a, b) { return a.documentName.localeCompare(b.documentName) });
            if (currentDocumentSort === true){
                generateCardsForAllDocuments(body["documents"]);
                currentDocumentSort = false;
            }
        }
        if (!(allDocuments.filter(o1 => body["documents"].some(o2 => o1.documentName === o2.documentName)).length === body["documents"].length)) {
            //console.log(body["documents"]);
            generateCardsForAllDocuments(body["documents"]);
            allDocuments = body["documents"];
        }
    }
    else if (document.IS_DOC) {
        allDocuments = body["documents"];
        var script = document.createElement('script');
        script.innerHTML = `openDocumentHandler(decodeURI(location.href.split('doc=')[1]));`
        document.body.appendChild(script);
    }
    else if (document.IS_REVERT) {
        allDocuments = body["documents"];
        var script = document.createElement('script');
        script.innerHTML = `openDocumentHandler(decodeURI(location.href.split('doc=')[1]));`
        document.body.appendChild(script);
    }
    else {
        allDocuments = body["documents"];
    }
    // var isNotSameDoc = false;
    // for(const doc in body["documents"])
    // {
    //     let documentName = body["documents"][doc]["documentName"];
    //     if (documentSelect.innerHTML !== `<option value=\"${documentName}\">${documentName}</option>`){
    //         isNotSameDoc = true;
    //         break;
    //     }
    // }

    // if (isNotSameDoc) {
    //     documentSelect.innerHTML = "";
    //     let sortArr = [];
    //     for(const doc in body["documents"])
    //     {
    //         let documentName = body["documents"][doc]["documentName"];
    //         sortArr.push(documentName)
    //     }
    //     sortArr.sort((a, b) => a.localeCompare(b))
    //     for (var i =0; i<sortArr.length;i++){
    //         documentSelect.innerHTML += `<option value=\"${sortArr[i]}\">${sortArr[i]}</option>`;
    //     }
    // }
}

function composeDocumentOnJoin(statusCode, body) {
    newVersion = body["newVersion"];
    oldVersion = body["oldVersion"];
    deltas = body["deltas"];

    while (newVersion > allDeltas.length) allDeltas.push(undefined);

    for (const delta in deltas) {
        syncedDocument = syncedDocument.compose(JSON.parse(deltas[delta]));
        allDeltas[oldVersion + delta] = deltas[delta];
        syncedVersion++;
    }

    if (newVersion === latestDelta) {

        if (!document.IS_IFRAME) {
            alertSuccess("Opened document");
        }
        editUI.style.display = "block";

        if (cursorInterval === undefined)
            (function () {
                if (!document.IS_IFRAME) {
                    sendCursorChanges();
                    setTimeout(arguments.callee, 500);
                }
            })();

        // Handle any outstanding out-of-order deltas
        for (let i = syncedVersion; i < allDeltas.length; i++) {
            if (allDeltas[i] === undefined) break;
            console.warn(`Handling out-of-order delta version ${i} after document load`)
            allDeltas[i] = allDeltas[i]["delta"]

            syncedDocument = syncedDocument.compose(JSON.parse(allDeltas[i]));
            syncedVersion++;
        }

        quill.setContents(syncedDocument, 'silent');
    }
    else {
        if (latestDelta - newVersion <= 100) {
            AWS.call("getDeltas", { "oldVersion": newVersion, "newVersion": latestDelta })
        }
        else {
            AWS.call("getDeltas", { "oldVersion": newVersion, "newVersion": (newVersion + 100) })
        }
    }
}

function joinDocumentHandler(statusCode, body) {
    syncedDocument = new Delta();
    latestDelta = parseInt(body['documentVersion']);

    if (latestDelta == 0) {
        if (!document.IS_IFRAME) {
            alertSuccess("Opened document");
        }
        editUI.style.display = "block";
        documentsUI.style.display = "none";

        if (cursorInterval === undefined)
            (function () {
                if (!document.IS_IFRAME) {
                    sendCursorChanges();
                    setTimeout(arguments.callee, 500);
                }
            })();

        return false;
    }
    else if (latestDelta < 100) {
        AWS.call("getDeltas", { "oldVersion": 0, "newVersion": latestDelta })
    }
    else {
        AWS.call("getDeltas", { "oldVersion": 0, "newVersion": 100 })
    }
    if (!document.IS_IFRAME) {
        sendCursorChanges();
    }
}

function inOrderDeltaHandler(delta, isOwn, silent) {
    let parsedDelta = new Delta(JSON.parse(delta));
    // for(let i = syncedVersion; i < allDeltas.length; i++)
    // {
    //     if(allDeltas[i] === undefined) break;
    //     parsedDelta = parsedDelta.compose(JSON.parse(allDeltas[i]))

    //     syncedVersion++;
    //     deltaVersion++;
    // }

    if (pendingDelta === undefined) {
        // The very normal case w/o any races: We didn't send anything, and we received a new delta
        syncedDocument = syncedDocument.compose(parsedDelta);
        quill.updateContents(parsedDelta, 'silent');
    }
    else if (isOwn === true) {
        // The very normal case w/o any races: We sent a delta, and we received that delta
        pendingDelta = undefined;
        syncedDocument = syncedDocument.compose(parsedDelta);

        if (blockedDelta !== undefined) {
            pendingDelta = blockedDelta;
            blockedDelta = undefined;

            if (silent !== true)
                //AWS.call("addDelta", { "documentVersion": syncedVersion, "delta": JSON.stringify(pendingDelta) })
                AWS.call("addDelta", { "documentVersion": syncedVersion, "message": JSON.stringify(getMyCursor()), "delta": JSON.stringify(pendingDelta) })

        }
    }
    else if (isOwn === false) {
        // Someone beat us to it, we need to transform our deltas and resend
        console.warn(`Race condition on delta version ${syncedVersion}`)

        // Merge all the unsynced changes we have
        if (blockedDelta !== undefined) {
            pendingDelta = pendingDelta.compose(blockedDelta);
            blockedDelta = undefined;
        }

        // CHECK FOR
        // Out of order receipt of deltas (might happen in the case of different execution times of the lambda functions) IF THE PREVIOUS DELTAS WILL WORK
        let magicDelta = pendingDelta.invert(syncedDocument);
        magicDelta = magicDelta.compose(parsedDelta);

        pendingDelta = parsedDelta.transform(pendingDelta, true);
        magicDelta = magicDelta.compose(pendingDelta)
        quill.updateContents(magicDelta);

        syncedDocument = syncedDocument.compose(parsedDelta);

        // Send the transformed delta
        if (silent !== true)
            //AWS.call("addDelta", { "documentVersion": syncedVersion, "delta": JSON.stringify(pendingDelta) })
            AWS.call("addDelta", { "documentVersion": syncedVersion, "message": JSON.stringify(getMyCursor()), "delta": JSON.stringify(pendingDelta) })

    }
    else
        console.error("UNEXPECTED CASE", syncedVersion, isOwn, delta, pendingDelta, allDeltas)

    // if(silent !== true)
    //     sendCursorChanges();
}

function newDeltaHandler(statusCode, body) {
    let delta = body["delta"];
    let isOwn = body["isOwn"];
    let deltaVersion = body["version"];
    let newCursor = JSON.parse(body["message"]);

    if (!isOwn) {
        newBroadcastHandler(statusCode, body, newCursor);
    }

    while (deltaVersion >= allDeltas.length) allDeltas.push(undefined); // Fill it with empty deltas till we reach the correct size

    if (deltaVersion < syncedVersion) // How did we receive a delta twice?
        console.error("UNEXPECTED CASE", syncedVersion, deltaVersion, isOwn, delta, pendingDelta, allDeltas)
    else if (deltaVersion > syncedVersion) {
        // Out of order receipt of deltas (might happen in the case of different execution times of the lambda functions)
        console.warn(`Out-of-order delta version ${deltaVersion} (expected ${syncedVersion})`)

        allDeltas[deltaVersion] = body;
    }
    else if (deltaVersion === syncedVersion) {
        allDeltas[deltaVersion] = body;

        for (let i = syncedVersion; i < allDeltas.length; i++) {
            if (!document.IS_IFRAME) {
                console.log(syncedVersion);
            }
            if (allDeltas[i] === undefined) break;
            syncedVersion++;

            let silent = i < allDeltas.length - 1 && allDeltas[i + 1] !== undefined;
            inOrderDeltaHandler(allDeltas[i]["delta"], allDeltas[i]["isOwn"], silent);

            allDeltas[i] = allDeltas[i]["delta"];
        }
    }
    else // ???
        console.error("UNEXPECTED CASE", syncedVersion, deltaVersion, isOwn, delta, pendingDelta, allDeltas)
}

function messageHandler(message) {
    let statusCode = message.statusCode;
    let body = message.body;

    if (statusCode === 400) console.error(message)
    else body = JSON.parse(body);

    switch (message.action) {
        case "newDocument":
            newDocumentHandler(statusCode, body);
            break;
        case "listDocuments":
            listDocumentsHandler(statusCode, body);
            break;
        case "joinDocument":
            joinDocumentHandler(statusCode, body);
            break;
        case "newDelta":
            newDeltaHandler(statusCode, body);
            break;
        case "getDeltas":
            composeDocumentOnJoin(statusCode, body);
            break;
        case "newBroadcast":
            newBroadcastHandler(statusCode, body);
            break;
        default:
            console.error(`Unknown Action \"${message.action}\"`)
    }
}

function textChangeHandler(delta, oldDelta, source) {
    if (source == 'api') {
        // console.log("An API call triggered this change.");
    } else if (source == 'user') {
        // console.log("A user action triggered this change.");
        // console.log(source);
        // console.log(oldDelta);
        // console.log(delta);

        // console.log(JSON.stringify({delta, "version":7}))
        if (pendingDelta === undefined) {
            pendingDelta = delta;
            AWS.call("addDelta", { "documentVersion": syncedVersion, "message": JSON.stringify(getMyCursor()), "delta": JSON.stringify(pendingDelta) })

        }
        else if (blockedDelta === undefined)
            blockedDelta = delta;
        else
            blockedDelta = blockedDelta.compose(delta);
    }
}

/*function mazenVersioning(documentName,version){

    // open document but passes version and c
    //join doc

    //get the deltas
    AWS.call("getDeltas")
}
*/
// const AWS = new Remote(openHandler, messageHandler);
// window.textChangeHandler = textChangeHandler;
const AWS = new Remote(openHandler, messageHandler);
window.textChangeHandler = textChangeHandler;