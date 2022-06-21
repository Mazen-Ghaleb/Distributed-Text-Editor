let syncedVersion = 0;
let allDeltas = [];

let syncedDelta = undefined;
let pendingDelta = undefined;
let blockedDelta = undefined;

let errorAlert = document.getElementById("errorAlert");
let alertTimeout = undefined;

let editUI = document.getElementById("container");
let documentsUI = document.getElementById("documents");

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
    documentSelect.innerHTML = "";
    for(const doc in body["documents"])
    {
        let documentName = body["documents"][doc]["documentName"];
        documentSelect.innerHTML += `<option value=\"${documentName}\">${documentName}</option>`;
    }
}

function joinDocumentHandler(statusCode, body)
{
    alertSuccess("Opened document");
    editUI.style.display = "block";
    documentsUI.style.display = "none";   
}

function newDeltaHandler(statusCode, body)
{
    let delta = body["delta"];
    let isOwn = body["isOwn"];
    let deltaVersion = body["version"];
    while(deltaVersion >= allDeltas.length) allDeltas.push(undefined); // Fill it with empty deltas till we reach the correct size

    // console.warn(syncedDelta)
    // syncedDelta = syncedDelta.compose(JSON.parse(delta))
    // quill.setContents(syncedDelta, 'silent'); // Invert to the common, agreed-upon document
    // // quill.updateContents(new Quill.imports.delta(JSON.parse(delta)), 'silent'); // Apply the newly received delta
    // console.warn(syncedDelta)

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

            quill.updateContents(JSON.parse(allDeltas[deltaVersion]), 'silent');
        }
        else if(isOwn === true)
        {
            // The very normal case w/o any races: We sent a delta, and we received that delta
            allDeltas[syncedVersion] = delta;
            syncedVersion++;
            pendingDelta = undefined; 
            
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
            
            allDeltas[deltaVersion] = delta;
            syncedVersion++;

            let newdoc = new Quill.imports.delta({});
            for(let i = 0; i < syncedVersion; i++)
                newdoc = newdoc.compose(new Quill.imports.delta(JSON.parse(allDeltas[i])))
            console.log(newdoc)

            // syncedDelta = syncedDelta.compose(parsedDelta)
            let selection = quill.getSelection(); // TODO transform this
            // console.warn(syncedDelta)
            quill.setContents(newdoc, 'silent'); // Update the document in the user's view
            // syncedDelta = new Quill.imports.delta(syncedDelta);

            // console.warn(pendingDelta)
            let parsedDelta = new Quill.imports.delta(JSON.parse(delta));

            // selection.length = parsedDelta.transformPosition(selection.index + selection.length) - selection.index;
            // selection.index = parsedDelta.transformPosition(selection.index, false);
            quill.setSelection(selection);

            pendingDelta = parsedDelta.transform(pendingDelta, true); // Transform the previously made (unsynced) changes
            // console.warn(pendingDelta)
            quill.updateContents(pendingDelta, 'silent'); // Update to the (transformed) changes we previously made

            // quill.updateContents(pendingDelta.invert(quill.getContents()), 'silent'); // Invert to the common, agreed-upon document
            // console.log(syncedDelta)
            // console.warn(syncedDelta)
            // console.warn(syncedDelta)
            // syncedDelta = new Quill.imports.delta(delta).compose(delta)
            // quill.setContents(syncedDelta, 'silent'); // Invert to the common, agreed-upon document
            // // console.warn(syncedDelta)
            // // quill.updateContents(delta, 'silent'); // Apply the newly received delta
            // console.warn(syncedDelta)

            // syncedDelta = new Quill.imports.delta(quill.getContents());

            // console.log(pendingDelta)
            // pendingDelta = new Quill.imports.delta(JSON.parse(delta)).transform(pendingDelta, true); // Transform the previously made (unsynced) changes
            // console.log(pendingDelta)
            // quill.updateContents(pendingDelta, 'silent'); // Update to the (transformed) changes we previously made

            // Send the transformed delta
            AWS.call("addDelta", { "documentVersion": syncedVersion, "delta": JSON.stringify(pendingDelta) })
        }
        else
            console.error("UNEXPECTED CASE", syncedVersion, deltaVersion, pendingDeltaVersion, isOwn, delta, pendingDelta, allDeltas)

        // Handle any outstanding out-of-order deltas
        for(let i = syncedVersion; i < allDeltas.length; i++)
            if(allDeltas[i] !== undefined) // TODO test this
            {
                console.warn(`Handling out-of-order delta version ${i}`)
                quill.updateContents(JSON.parse(allDeltas[i]), 'silent');
                syncedVersion++;

                syncedDelta = quill.getContents();
            }

        // if(pendingDeltaVersion == undefined || (pendingDeltaVersion === deltaVersion && isOwn === true))
        // {
        //     // The very normal case w/o any races
        //     allDeltas[deltaVersion] = delta;
        //     syncedVersion++;
        //     pendingDeltaVersion = undefined;
    
        //     if(!isOwn) quill.updateContents(JSON.parse(allDeltas[deltaVersion]), 'silent');
        // }
        // else if(pendingDeltaVersion === deltaVersion)
        // {
        //     // Someone beat us to it, we need to transform our deltas and resend
        // }
        // else if(pendingDeltaVersion < deltaVersion)
        // {
        //     // Out of order receipt
        // }
        // else if(pendingDeltaVersion > deltaVersion) // How did we send a delta to a version we never received?
        //     console.error("UNEXPECTED CASE", syncedVersion, deltaVersion, pendingDeltaVersion, isOwn, delta, pendingDelta, allDeltas)
        // else // ???
        //     console.error("UNEXPECTED CASE", syncedVersion, deltaVersion, pendingDeltaVersion, isOwn, delta, pendingDelta, allDeltas)
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