let Delta = Quill.import('delta');

let syncedVersion = 0;
let allDeltas = [];

//Should have the document up to allDeltas[syncedVersion]
let syncedDocument = new Delta();
let loadedDocument = new Delta();

let pendingDelta = undefined;
let blockedDelta = undefined;

let errorAlert = document.getElementById("errorAlert");
let alertTimeout = undefined;

let editUI = document.getElementById("container");
let documentsUI = document.getElementById("documents");

let latestDelta = 0;

let documentSelect = document.getElementById("documentSelect");
let documentName = document.getElementById("documentName");

function alertTimeoutHandler()
{
    console.log("alertTimeoutHandler")
    errorAlert.parentElement.style.display = "none";
}

function alertError(message)
{
    if(alertTimeout) clearTimeout(alertTimeout);
    alertTimeout = setTimeout(alertTimeoutHandler, 4000)

    errorAlert.innerText = message;
    errorAlert.parentElement.style.display = "block";
    errorAlert.parentElement.style.backgroundColor = "red";
}

function alertSuccess(message)
{
    if(alertTimeout) clearTimeout(alertTimeout);
    alertTimeout = setTimeout(alertTimeoutHandler, 4000)

    errorAlert.innerText = message;
    errorAlert.parentElement.style.display = "block";
    errorAlert.parentElement.style.backgroundColor = "green";
}

function openDocumentHandler()
{
    if(documentSelect.value === "")
    {
        alertError("No existing documents to open")
        return false;
    }

    AWS.call("joinDocument", { "documentName": documentSelect.value });
    clearInterval(SelectionInterval);

    return false;
}

function createDocumentHandler()
{
    if(documentName.value === "")
    {
        alertError("Please enter the new document's name")
        return false;
    }
    
    AWS.call("newDocument", { "documentName": documentName.value });
    clearInterval(SelectionInterval);
    return false;
}

function openHandler()
{
    console.log("open")
    AWS.call("listDocuments")
}

function newDocumentHandler(statusCode, body)
{
    if(statusCode !== 200)
    {
        alertError("Could not create document: " + body);
        return;
    }

    alertSuccess("Document created");
    editUI.style.display = "block";
    documentsUI.style.display = "none";
}

function listDocumentsHandler(statusCode, body)
{
    var isNotSameDoc = false;
    for(const doc in body["documents"])
    {
        let documentName = body["documents"][doc]["documentName"];
        if (documentSelect.innerHTML !== `<option value=\"${documentName}\">${documentName}</option>`){
            isNotSameDoc = true;
            break;
        }
    }
    
    if (isNotSameDoc) {
        documentSelect.innerHTML = "";
        let sortArr = [];
        for(const doc in body["documents"])
        {
            let documentName = body["documents"][doc]["documentName"];
            sortArr.push(documentName)
        }
        sortArr.sort((a, b) => a.localeCompare(b))
        for (var i =0; i<sortArr.length;i++){
            documentSelect.innerHTML += `<option value=\"${sortArr[i]}\">${sortArr[i]}</option>`;
        }
    }
}

function composeDocumentOnJoin(statusCode, body){
    newVersion = body["newVersion"];
    oldVersion = body["oldVersion"];
    deltas = body["deltas"];
    


    for (const delta of deltas){
        loadedDocument = loadedDocument.compose(JSON.parse(delta));
    }

    if (newVersion === latestDelta){
        alertSuccess("Opened document");
        editUI.style.display = "block";
        documentsUI.style.display = "none"
        syncedVersion = latestDelta;
        quill.setContents(loadedDocument,'silent');
        
    }
    else{
        if(latestDelta - newVersion <= 100){
            AWS.call("getDeltas", { "oldVersion": newVersion+1, "newVersion": latestDelta})
        }
        else{
            AWS.call("getDeltas"),{"oldVersion": newVersion+1, "newVersion": (newVersion+1)+99}
        }
    }
}

function joinDocumentHandler(statusCode, body)
{
    loadedDocument = new Delta();
    latestDelta = parseInt(body['documentVersion']);


    if (latestDelta<100){
        AWS.call("getDeltas", { "oldVersion": 0, "newVersion": latestDelta })
    }
    else{
        AWS.call("getDeltas", { "oldVersion": 0, "newVersion": 99})
    }

    // TODO handle more than 100 deltas


    // UNCOMMENT IF EVERYTHING GOES WRONG
    // alertSuccess("Opened document");
    // editUI.style.display = "block";
    // documentsUI.style.display = "none";   
}

function newDeltaHandler(statusCode, body)
{
    
    let delta = body["delta"];
    let isOwn = body["isOwn"];
    let deltaVersion = body["version"];
    while(deltaVersion >= allDeltas.length) allDeltas.push(undefined); // Fill it with empty deltas till we reach the correct size


    if(deltaVersion < syncedVersion) // How did we receive a delta twice?
        console.error("UNEXPECTED CASE", syncedVersion, deltaVersion, pendingDeltaVersion, isOwn, delta, pendingDelta, allDeltas)
    else if(deltaVersion > syncedVersion)
    {
        // Out of order receipt of deltas (might happen in the case of different execution times of the lambda functions)
        console.warn(`Out-of-order delta version ${deltaVersion} (expected ${syncedVersion})`)

        allDeltas[deltaVersion] = delta;
    }
    else if(deltaVersion === syncedVersion)
    {
        if(pendingDelta === undefined)
        {
            // The very normal case w/o any races: We didn't send anything, and we received a new delta
            allDeltas[syncedVersion] = delta;
            syncedVersion++;
            pendingDelta = undefined;
            syncedDocument = syncedDocument.compose(JSON.parse(allDeltas[deltaVersion]));
            quill.updateContents(JSON.parse(allDeltas[deltaVersion]), 'silent');
        }
        else if(isOwn === true)
        {
            // The very normal case w/o any races: We sent a delta, and we received that delta
            allDeltas[syncedVersion] = delta;
            syncedVersion++;
            pendingDelta = undefined;

            syncedDocument = syncedDocument.compose(JSON.parse(allDeltas[deltaVersion]));


            if(blockedDelta !== undefined)
            {
                pendingDelta = blockedDelta;
                AWS.call("addDelta", { "documentVersion": syncedVersion, "delta": JSON.stringify(pendingDelta) })
                blockedDelta = undefined;
            }
        }
        else if(isOwn === false)
        {
            // Someone beat us to it, we need to transform our deltas and resend
            console.warn(`Race condition on delta version ${deltaVersion}`)

            // Merge all the unsynced changes we have
            if(blockedDelta !== undefined)
            {
                pendingDelta = pendingDelta.compose(blockedDelta);
                blockedDelta = undefined;
            }

            let parsedDelta = new Delta(JSON.parse(delta));
            allDeltas[deltaVersion] = delta;
            syncedVersion++;

            // CHECK FOR
            // Out of order receipt of deltas (might happen in the case of different execution times of the lambda functions) IF THE PREVIOUS DELTAS WILL WORK

            let magicDelta = pendingDelta.invert(syncedDocument);
            magicDelta = magicDelta.compose(parsedDelta);

            pendingDelta = parsedDelta.transform(pendingDelta, true);
            magicDelta = magicDelta.compose(pendingDelta)
            quill.updateContents(magicDelta);

            syncedDocument = syncedDocument.compose(parsedDelta);
            
            // Send the transformed delta
            AWS.call("addDelta", { "documentVersion": syncedVersion, "delta": JSON.stringify(pendingDelta) })
        }
        else
            console.error("UNEXPECTED CASE", syncedVersion, deltaVersion, pendingDeltaVersion, isOwn, delta, pendingDelta, allDeltas)

        // Handle any outstanding out-of-order deltas
        for(let i = syncedVersion; i < allDeltas.length; i++)
            if(allDeltas[i] !== undefined) // TODO test this
            {
                let parsedDelta = new Delta(JSON.parse(delta));

                console.warn(`Handling out-of-order delta version ${i}`)
                quill.updateContents(parsedDelta, 'silent');
                syncedVersion++;

                syncedDocument = syncedDocument.compose(parsedDelta);
                syncedDelta = quill.getContents();
            }
    }
    else // ???
        console.error("UNEXPECTED CASE", syncedVersion, deltaVersion, pendingDeltaVersion, isOwn, delta, pendingDelta, allDeltas)
}

function messageHandler(message)
{
    let statusCode = message.statusCode;
    let body = message.body;

    if(statusCode === 400) console.error(message)
    else body = JSON.parse(body);
     
    switch(message.action)
    {
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
            composeDocumentOnJoin(statusCode,body);
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
        if(pendingDelta === undefined)
        {
            pendingDelta = delta;
            AWS.call("addDelta", { "documentVersion": syncedVersion, "delta": JSON.stringify(pendingDelta) })
        }
        else if(blockedDelta === undefined)
            blockedDelta = delta;
        else
            blockedDelta = blockedDelta.compose(delta);
    }
}

const AWS = new Remote(openHandler, messageHandler);
window.textChangeHandler = textChangeHandler;
