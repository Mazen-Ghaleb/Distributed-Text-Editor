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

let isDisconnected = false;

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
        if (!document.IS_VERSIONING){
        //console.log("sendCursorChanges")
        }
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
        ver = body["version"] + 1;
        if (!document.IS_IFRAME) {
            if (!document.IS_VERSIONING){
            //console.log(newCursor)
            }
        }
    }

    let id = body["connectionId"];
    if (!document.IS_IFRAME) {
        if (!document.IS_VERSIONING){
        //console.log(newCursor, userDict, id)
        }
    }

    if (!(id in userDict)) {
        userCounter++;
        userDict[id] = "User " + userCounter;
    }
    //console.log(currentDocumentDeltaNum,docLastDeltaNum,ver)
    //if (!document.IS_VERSIONING || ((document.IS_VERSIONING && docLastDeltaNum === ver) && currentDocumentDeltaNum === ver )){
    if (!document.IS_VERSIONING || (document.IS_VERSIONING && currentDocumentDeltaNum === ver )){

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
                cursorManager.toggleFlag(id, false);
                //cursorManager.removeCursor(id);
            }
            cursorManager.update();
        }
    }
    else { // IN VERSIONING but not last delta
        cursorManager.toggleFlag(id, false);
        //cursorManager.removeCursor(id);
        //cursorManager.clearCursors();
        cursorManager.update();
    }
}

function alertTimeoutHandler() {
    if (!document.IS_IFRAME) {
        console.log("alertTimeoutHandler")
    }
    errorAlert.parentElement.style.display = "none";
}

function alertError(message, forever) {
    if (alertTimeout) clearTimeout(alertTimeout);

    if(forever !== true)
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
    newDocumentName = documentName.value;
    AWS.call("newDocument", { "documentName": newDocumentName});
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
    //console.log(body);
    alertSuccess("Document created");
    if (document.IS_INDEX){
        window.location.assign(pathRoot+'/views/document.html?doc='+newDocumentName)   
        //window.location.assign(pathRoot+'/views/document.html?doc='+ documentName.value)
        editUI.style.display = "block";
    }
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
                <iframe src="${pathRoot}/views/document.html?iframe=y&doc=${doc.documentName}" scrolling="no" style="overflow:hidden; width:100%; height:100%;border:none;" title="${doc.documentName}"></iframe> 
                <div class="card-body">
                    <a href='${pathRoot}/views/document.html?doc=${doc.documentName}'>
                        <h5 id="card" class="card-title" style="height:6em; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 3; line-clamp: 3; -webkit-box-orient: vertical ">${doc.documentName}</h5>
                    </a>
                    <div style="display: inline-block;">
                        <p id="cardDate" class="card-text" style="display: inline-block;"><img id="cardDocumentIcon" alt="Document" src="${pathRoot}/media/document.png" style="height:2; width:2em; display: inline-block;">${displayedDate}  </p> 
                        <!-- Default dropup button -->
                        <div class="btn-group dropup docMenu">
                            <input type="image" class="btn dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false"" alt="Edit" src="${pathRoot}/media/tripleDot.png">
                            <div class="dropdown-menu">
                                <!-- Dropdown menu links -->
                                <a class="dropdown-item" href="${pathRoot}/views/versioning.html?doc=${doc.documentName}">Version Document</a>
                                <a class="dropdown-item" href="javascript:;" onclick='
                                let documentNewName= prompt("Please enter your new document name");
                                if (documentNewName !== null) {
                                AWS.call("renameDocument", { "documentOldName": "${doc.documentName}", "documentNewName": documentNewName });
                                }'>Rename</a>
                                <a class="dropdown-item" href="javascript:;" onclick='
                                let documentNewName= prompt("Please enter your new document name");
                                if (documentNewName !== null) {
                                AWS.call("duplicateDocument", { "documentOldName": "${doc.documentName}", "documentNewName": documentNewName });
                                newDocumentName = documentNewName;
                                }'>Duplicate</a>
                                <a class="dropdown-item" href="javascript:;" onclick='AWS.call("deleteDocument", { "documentName": "${doc.documentName}" });'>Delete</a>
                                
                            </div>
                        </div>
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
        if (document.SORT_DATE) {
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
        //console.log(allDocuments,body["documents"]);
        let x = allDocuments.filter(o1 => body["documents"].some(o2 => o1.documentName === o2.documentName)).length;
        //console.log(x, allDocuments.length);
        
        if ((x !== allDocuments.length) || (x !== body["documents"].length)) {
            generateCardsForAllDocuments(body["documents"]);
            allDocuments = body["documents"];
        }
    }
    else if (document.SEARCH) {
        search_results = []
        for (let i = 0; i < body["documents"].length; i++) {
            if (body["documents"][i].documentName.toLowerCase().includes(search_term.toLowerCase())){
                search_results.push(body["documents"][i])
            }
        }
        if (search_results.length === 0) {
            let cardsDiv = document.getElementById("documentsCardsDiv");
            cardsDiv.innerHTML = '<h1 style="vertical-align:middle;text-align:center; color:black; margin-top:20%;">No Results Found</h1>';
            ResultsHeader.style.display="none";
            currentDocumentCards = [];
        }
        else {
            ResultsHeader.style.display="block";
            if (document.SORT_DATE) {
                search_results.sort(function (a, b) { return new Date(b.documentDate) - new Date(a.documentDate)});
                if (currentDocumentSort === false){
                    generateCardsForAllDocuments(search_results);
                    currentDocumentSort = true;
                }
            }
            else {
                search_results.sort(function (a, b) { return a.documentName.localeCompare(b.documentName) });
                if (currentDocumentSort === true){
                    generateCardsForAllDocuments(search_results);
                    currentDocumentSort = false;
                }
            }
            let x = allDocuments.filter(o1 => body["documents"].some(o2 => o1.documentName === o2.documentName)).length;
            
            if ((x !== allDocuments.length) || (x !== body["documents"].length)) {
                generateCardsForAllDocuments(search_results);
                allDocuments = body["documents"];
            }
        }
    }
    else if (document.IS_DOC) {
        allDocuments = body["documents"];
        if ((Object.keys(allDocuments).map(function (key) {
            return allDocuments[key]["documentName"].indexOf(documentName) != -1;
        }))){
        var script = document.createElement('script');
        console.log("BUR", new URL(location.href).searchParams.get("doc"), location.href)
        script.innerHTML = `openDocumentHandler(new URL(location.href).searchParams.get("doc"));`
        document.body.appendChild(script);
        }
        else {
            let doucmentsDiv = document.getElementById("documents");
            doucmentsDiv.innerHTML = '<h1 style="vertical-align:middle;text-align:center; color:black; margin-top:20%;">No Document Found with this name</h1>';
        }
    }
    else if (document.IS_VERSIONING) {
        allDocuments = body["documents"];
        var script = document.createElement('script');
        script.innerHTML = `openDocumentHandler(decodeURI(location.href.split('doc=')[1]));`
        document.body.appendChild(script);
    }
    else {
        allDocuments = body["documents"];
    }
}

function composeDocumentOnJoin(statusCode, body) {
    newVersion = body["newVersion"];
    oldVersion = body["oldVersion"];
    deltas = body["deltas"];

    while (newVersion > allDeltas.length) allDeltas.push(undefined);

    for (const delta in deltas) {
        syncedDocument = syncedDocument.compose(JSON.parse(deltas[parseInt(delta)]));
        allDeltas[parseInt(oldVersion) + parseInt(delta)] = deltas[parseInt(delta)];
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
                    if (!document.IS_VERSIONING){
                    sendCursorChanges();
                    setTimeout(arguments.callee, 500);
                    }
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
        if (document.IS_VERSIONING && docLastDeltaNum !== undefined) {
            currentDocumentDelta = syncedDocument;
        }

        let url = new URL(location.href)
        let extraDeltaUnparsed = url.searchParams.get("extraDelta");
        let extraDeltaVersion = url.searchParams.get("extraDeltaVersion");
        if(extraDeltaUnparsed != undefined && extraDeltaVersion != undefined)
        {
            let extraDelta = new Delta(JSON.parse(extraDeltaUnparsed));
            extraDeltaVersion = parseInt(extraDeltaVersion);

            let unsyncedDelta = new Delta();
            for(let i = extraDeltaVersion; i < syncedVersion; i++)
                unsyncedDelta = unsyncedDelta.compose(JSON.parse(allDeltas[i]));

            pendingDelta = unsyncedDelta.transform(extraDelta, true);
            quill.updateContents(pendingDelta);
            AWS.call("addDelta", { "documentVersion": syncedVersion, "message": JSON.stringify(getMyCursor()), "delta": JSON.stringify(pendingDelta) })

            // quill.updateContents(pendingDelta);
            // inOrderDeltaHandler(extraDeltaUnparsed, true);
            // syncedDocument = syncedDocument.compose(extraDelta);
            // AWS.call("addDelta", { "documentVersion": syncedVersion, "message": JSON.stringify(getMyCursor()), "delta": JSON.stringify(extraDelta) })
        }

        url.searchParams.delete("extraDelta");
        url.searchParams.delete("extraDeltaVersion");
        history.pushState({}, null, url.toString());
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
    if (document.IS_VERSIONING && docLastDeltaNum === undefined) {
        currentDocumentDeltaNum = latestDelta; 
        docLastDeltaNum = latestDelta;
        verionSlider.max = latestDelta;
        verionSlider.value = latestDelta;
        valBox.innerHTML= `Version: ${latestDelta}`;
        valBox.style.display = 'initial';
    } else if (document.IS_VERSIONING) {
        latestDelta = verionSlider.value;
        currentDocumentDeltaNum = verionSlider.value;
    }
    if (latestDelta == 0) {
        if (!document.IS_IFRAME) {
            alertSuccess("Opened document");
        }
        editUI.style.display = "block";
        documentsUI.style.display = "none";

        if (cursorInterval === undefined)
            (function () {
                if (!document.IS_IFRAME) {
                    if (!document.IS_VERSIONING){
                    sendCursorChanges();
                    setTimeout(arguments.callee, 500);
                    }
                }
            })();

        let url = new URL(location.href)
        let extraDelta = url.searchParams.get("extraDelta");
        let extraDeltaVersion = url.searchParams.get("extraDeltaVersion");
        if(extraDelta != undefined && extraDeltaVersion != undefined)
        {
            // quill.updateContents(extraDelta);
            // inOrderDeltaHandler(extraDelta, true);


            // pendingDelta = unsyncedDelta.transform(extraDelta, true);
            quill.updateContents(extraDelta);
            AWS.call("addDelta", { "documentVersion": syncedVersion, "message": JSON.stringify(getMyCursor()), "delta": extraDelta })

            // quill.updateContents(new Delta(JSON.parse(extraDelta)));
            // syncedDocument = syncedDocument.compose(JSON.parse(extraDelta));
            // AWS.call("addDelta", { "documentVersion": syncedVersion, "message": JSON.stringify(getMyCursor()), "delta": extraDelta })
        }

        url.searchParams.delete("extraDelta");
        url.searchParams.delete("extraDeltaVersion");
        history.pushState({}, null, url.toString());

        return false;
    }
    else if (latestDelta < 100) {
        AWS.call("getDeltas", { "oldVersion": 0, "newVersion": latestDelta })
    }
    else {
        AWS.call("getDeltas", { "oldVersion": 0, "newVersion": 100 })
    }
    if (!document.IS_IFRAME) {
        if (!document.IS_VERSIONING){
        sendCursorChanges();
        }
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
        // if (document.IS_VERSIONING) {
        //     lastDeltaLength = quill.getLength()
        // }
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
        // if (document.IS_VERSIONING) {
        //     lastDeltaLength = quill.getLength()
        // }

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
    //console.log(body)
  
    while (deltaVersion >= allDeltas.length) allDeltas.push(undefined); // Fill it with empty deltas till we reach the correct size

    if (deltaVersion < syncedVersion) { // How did we receive a delta twice?

        if (document.IS_VERSIONING) {  // In Older Version and Got Delta
            docLastDeltaNum = deltaVersion+1;
            verionSlider.max = deltaVersion+1;
            }
        else {
            console.error("UNEXPECTED CASE", syncedVersion, deltaVersion, isOwn, delta, pendingDelta, allDeltas)
        }
    }
    else if (deltaVersion > syncedVersion) {
        // Out of order receipt of deltas (might happen in the case of different execution times of the lambda functions)
        console.warn(`Out-of-order delta version ${deltaVersion} (expected ${syncedVersion})`)

        allDeltas[deltaVersion] = body;
    }
    else if (deltaVersion === syncedVersion) {
        allDeltas[deltaVersion] = body;

        for (let i = syncedVersion; i < allDeltas.length; i++) {
            if (!document.IS_IFRAME) {
                if (!document.IS_VERSIONING){
                //console.log(syncedVersion);
                }
            }
            if (allDeltas[i] === undefined) break;

            syncedVersion++;
            if (document.IS_VERSIONING && (currentDocumentDeltaNum === syncedVersion-1)) {      
                //console.log(currentDocumentDeltaNum)             
                //console.log(deltaVersion,syncedVersion);
                docLastDeltaNum = syncedVersion;
                verionSlider.max = syncedVersion;
                verionSlider.value = syncedVersion;
                valBox.innerHTML= `Version: ${syncedVersion}`;
                currentDocumentDeltaNum = syncedVersion;

            } else if (document.IS_VERSIONING) {
                //console.log("here");
                docLastDeltaNum = syncedVersion;
                verionSlider.max = syncedVersion;
                return;
            }

            let silent = i < allDeltas.length - 1 && allDeltas[i + 1] !== undefined;
            inOrderDeltaHandler(allDeltas[i]["delta"], allDeltas[i]["isOwn"], silent);
            console.log(newCursor)
            if (isOwn === false)
                newBroadcastHandler(statusCode, body, newCursor);

            allDeltas[i] = allDeltas[i]["delta"];
        }
    }
    else // ???
        console.error("UNEXPECTED CASE", syncedVersion, deltaVersion, isOwn, delta, pendingDelta, allDeltas)
}

function deleteDocumentHandler(statusCode, body) {
    if (statusCode !== 200) {
        alertError("Could not delete document" + body);
        return;
    }
        alertSuccess("Deleted document successfully");
        AWS.call('listDocuments');
}
function renameDocumentHandler(statusCode, body) {
    if (statusCode !== 200) {
        alertError("Could not rename document" + body);
        return;
    }
        alertSuccess("Renamed document successfully");
        AWS.call('listDocuments');
}
function duplicateDocumentHandler(statusCode, body) {
    if (statusCode !== 200) {
        alertError("Could not duplicate document" + body);
        return;
    }
        alertSuccess("Duplicated document successfully");
        AWS.call('listDocuments');
        if (document.IS_INDEX){
        window.location.assign(pathRoot+'/views/document.html?doc='+newDocumentName)
        }
}
function newDocumentVersionHandler(statusCode, body) {
    if (statusCode !== 200) {
        alertError("Could not create the version of this document" + body);
        return;
    }
        alertSuccess("Created new version of document successfully");
}
function messageHandler(message) {
    let statusCode = message.statusCode;
    let body = message.body;
    console.log(body)
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
        case "deleteDocument":
            deleteDocumentHandler(statusCode, body);
            break;
        case "renameDocument":
            renameDocumentHandler(statusCode, body);
            break;
        case "duplicateDocument":
            duplicateDocumentHandler(statusCode, body);
            break;
        case "newDocumentVersion":
            newDocumentVersionHandler(statusCode, body);
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

function disconnectHandler()
{
    if(document.IS_IFRAME) return;
    
    setTimeout(()=> alertError("Disconnected. Waiting for an internet connection...", true), 2000); // Show error after 2 seconds
}

window.addEventListener('offline', disconnectHandler);
window.addEventListener('online', () => {
    if(document.IS_IFRAME) return;

    if (blockedDelta !== undefined)
        pendingDelta = pendingDelta.compose(blockedDelta);

    let extraDelta = pendingDelta;
    if(extraDelta === undefined)
    {
        let url = new URL(location.href)
        url.searchParams.delete("extraDelta");
        url.searchParams.delete("extraDeltaVersion");

        window.location.assign(url.toString());
    }
    else
    {
        let url = new URL(location.href)
        url.searchParams.set("extraDelta", JSON.stringify(pendingDelta));
        url.searchParams.set("extraDeltaVersion", syncedVersion);

        window.location.assign(url.toString());
        // new URL(location.href).searchParams.get("doc")
    }
});

const AWS = new Remote(openHandler, messageHandler, disconnectHandler, disconnectHandler);
window.textChangeHandler = textChangeHandler;
