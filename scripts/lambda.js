const AWS = require('aws-sdk');
const WS_ENDPOINT = "osh89asdcb.execute-api.eu-central-1.amazonaws.com/production/";

const ddbClient = new AWS.DynamoDB.DocumentClient();
const wsClient = new AWS.ApiGatewayManagementApi({ endpoint: WS_ENDPOINT });

// const LOG = async(value) => { console.log(new Error().stack + "\n\n" + JSON.stringify(value)); return value; }
const LOG = async(value) => { return value; } // Don't log 3ashan mesh 3ayez 2adfa3 feloos CloudWatch, ty.

const error = async(message) => { return LOG({ statusCode: 400, body: message }); }
const success = async(response) => { return LOG({ statusCode: 200, body: JSON.stringify(response) }); }

const sendToOne = async(connectionId, body) => {
    try
    {
        let toPost = {
            ConnectionId: connectionId,
            Data: JSON.stringify(body)
        };
        
        LOG(toPost)
        await wsClient.postToConnection(toPost).promise();
    }
    catch(err)
    {
        LOG("OH NO!")
        LOG(err)
    }
};

const sendToMany = async(connectionIds, body) => {
    if(connectionIds.length === 0) return;
    
    const all = connectionIds.map(i => sendToOne(i, body));
    return Promise.all(all);
};


const connectHandler = async(connectionId) => {
    await ddbClient.put({
        TableName: "shared-docs-users",
        Item: { "connectionId": connectionId }
    }).promise();
    
    return success({});
}

const disconnectHandler = async(connectionId) => {
    const old = await ddbClient.delete({
        TableName: "shared-docs-users",
        Key: { "connectionId": connectionId },
        ReturnValues: 'ALL_OLD'
    }).promise();
    LOG(old)
    
    if(old.Attributes && old.Attributes["documentName"])
    {
        await ddbClient.update({
            TableName: "shared-docs-documents",
            Key: { 'documentName': old.Attributes["documentName"] },
            UpdateExpression: "DELETE documentUsers :u",
            ExpressionAttributeValues: { ':u': ddbClient.createSet(connectionId) },
        }).promise();
    }
    
    return success({});
}

const newDocument = async(connectionId, body) => {
    if(!body.hasOwnProperty("documentName")) return error("No documentName")
    
    try
    {
        await ddbClient.put({
            TableName: "shared-docs-documents",
            Item: {
                "documentName": body.documentName,
                "documentVersion": 0,
                "documentDeltas": [],
                "documentUsers": ddbClient.createSet([connectionId]),
                "documentDate": new Date().toUTCString(),
            },
            ConditionExpression:"attribute_not_exists(documentName)",
        }).promise();
        
        const old = await ddbClient.update({
            TableName: "shared-docs-users",
            Key: { connectionId: connectionId },
            UpdateExpression: "SET documentName = :u",
            ExpressionAttributeValues: { ':u': body.documentName },
            ReturnValues: 'ALL_OLD'
        }).promise();
        if(old.Attributes["documentName"] == body.documentName) return success({})
        
        // await ddbClient.update({
        //     TableName: "shared-docs-documents",
        //     Key: { 'documentName': old.Attributes["documentName"] },
        //     UpdateExpression: "DELETE documentUsers :u",
        //     ExpressionAttributeValues: { ':u': ddbClient.createSet(connectionId) },
        // }).promise();
        
        return success({})
    }
    catch(err)
    {
        if (err.name !== 'ConditionalCheckFailedException')  throw err;
        
        return error("A document with that name already exists")
    }
}

const deleteDocument = async(connectionId, body) => {
    if(!body.hasOwnProperty("documentName")) return error("No documentName")
    
    try
    {
        await ddbClient.delete({
            TableName: "shared-docs-documents",
            Key: {"documentName": body.documentName},
            ConditionExpression:"attribute_exists(documentName)",
        }).promise();
        
    //   const old = await ddbClient.update({
    //         TableName: "shared-docs-users",
    //         Key: { connectionId: connectionId },
    //         UpdateExpression: "SET documentName = :u",
    //         ExpressionAttributeValues: { ':u': body.documentName },
    //         ReturnValues: 'ALL_OLD'
    //     }).promise();
    //     if(old.Attributes["documentName"] == body.documentName) return success({})
        
        // await ddbClient.update({
        //     TableName: "shared-docs-documents",
        //     Key: { 'documentName': old.Attributes["documentName"] },
        //     UpdateExpression: "DELETE documentUsers :u",
        //     ExpressionAttributeValues: { ':u': ddbClient.createSet(connectionId) },
        // }).promise();
        
        return success({})
    }
    catch(err)
    {
        if (err.name !== 'ConditionalCheckFailedException')  throw err;
        
        return error("Couldn't find document with that name")
    }
}

const renameDocument = async(connectionId, body) => {
    if(!body.hasOwnProperty("documentOldName")) return error("No Old documentName")
    if(!body.hasOwnProperty("documentNewName")) return error("No New documentName")
    try
    {
        const doc = await ddbClient.get({
            TableName: "shared-docs-documents",
            Key: { 'documentName': body.documentOldName },
        }).promise();
        if(!doc.Item) return error("Couldn't find document with that name")
     
        await ddbClient.put({
            TableName: "shared-docs-documents",
            Item: {
                "documentName": body.documentNewName,
                "documentVersion": doc.Item["documentVersion"],
                "documentDeltas": doc.Item["documentDeltas"],
                "documentUsers": doc.Item["documentUsers"],
                "documentDate": doc.Item["documentDate"],
            },
            ConditionExpression:"attribute_not_exists(body.documentNewName)",
        }).promise();

        await ddbClient.delete({
            TableName: "shared-docs-documents",
            Key: {"documentName": body.documentOldName},
        }).promise();


        // await ddbClient.update({
        //     TableName: "shared-docs-documents",
        //     Key: {"documentName": body.documentOldName},
        //     UpdateExpression: "SET documentName = :u",
        //     ExpressionAttributeValues: { ':u': body.documentNewName },
        //     ConditionExpression:"attribute_exists(documentOldName)",
        // }).promise();
         
        return success({})
    }
    catch(err)
    {
        if (err.name !== 'ConditionalCheckFailedException')  throw err;
        
        return error("Document with that name exists")
    }
}

const listDocuments = async(connectionId, body) => {
    const scanResult = await ddbClient.scan({
        TableName : "shared-docs-documents",
        ProjectionExpression: ["documentName", "documentVersion", "documentDate"]
    }).promise();
    return success({"documents" : scanResult["Items"]})
}

const joinDocument = async(connectionId, body) => {
    if(!body.hasOwnProperty("documentName")) return error("No documentName")
    
    const doc = await ddbClient.get({
        TableName: "shared-docs-documents",
        Key: { 'documentName': body.documentName },
    }).promise();
    if(!doc.Item) return error("Invalid documentName")
    
    const updatedDoc = await ddbClient.update({
        TableName: "shared-docs-documents",
        Key: { 'documentName': body.documentName },
        UpdateExpression: "ADD documentUsers :u",
        ExpressionAttributeValues: { ':u': ddbClient.createSet(connectionId) },
        ReturnValues: 'ALL_OLD'
    }).promise();
    
    const old = await ddbClient.update({
        TableName: "shared-docs-users",
        Key: { "connectionId": connectionId },
        UpdateExpression: "SET documentName = :u",
        ExpressionAttributeValues: { ':u': body.documentName },
        ReturnValues: 'ALL_OLD'
    }).promise();
    if(!old.Attributes.hasOwnProperty("documentName") || old.Attributes["documentName"] == body.documentName) return success({ "documentVersion": updatedDoc.Attributes["documentVersion"] })
    
    await ddbClient.update({
        TableName: "shared-docs-documents",
        Key: { 'documentName': old.Attributes["documentName"] },
        UpdateExpression: "DELETE documentUsers :u",
        ExpressionAttributeValues: { ':u': ddbClient.createSet(connectionId) },
    }).promise();
    
    // try
    // {
    //     await ddbClient.update({
    //         "TableName": "shared-docs-documents",
    //         Key: { 'documentName': old.Attributes["documentName"] },
    //         UpdateExpression: "ADD documentUsers :u",
    //         ExpressionAttributeValues: { ':u': ddbClient.createSet(connectionId) },
    //         ConditionExpression: "documentName = :n AND NOT contains(students, :student)",
    //     }).promise();
    // }
    // catch(ConditionalCheckFailedException)
    // {
    //     error("document with given documentName does not exist")
    // }
    
    // const old = await ddbClient.update({
    //     "TableName": "shared-docs-users",
    //     Key: { connectionId: connectionId },
    //     UpdateExpression: "SET documentName = :u",
    //     ExpressionAttributeValues: { ':u': body.documentName },
    //     ReturnValues: 'ALL_OLD'
    // }).promise();
    
    // if(old.Attributes && old.Attributes["documentName"])
    // {
    //     await ddbClient.update({
    //         "TableName": "shared-docs-documents",
    //         Key: { 'documentName': old.Attributes["documentName"] },
    //         UpdateExpression: "DELETE documentUsers :u",
    //         ExpressionAttributeValues: { ':u': ddbClient.createSet(connectionId) },
    //     }).promise();
    // }
    
    return success({ "documentVersion": doc.Item["documentVersion"] })
}

const addDelta = async(connectionId, body) => {
    if(!body.hasOwnProperty("documentVersion")) return error("No documentVersion")
    if(!body.hasOwnProperty("delta")) return error("No delta")
    // if(!body.hasOwnProperty("message")) return error("No message")
    
    const user =  await ddbClient.get({
        TableName: "shared-docs-users",
        Key: { 'connectionId': connectionId },
        ProjectionExpression: "documentName"
    }).promise();
    
    let accepted = true;
    try
    {
        await ddbClient.update({
            TableName: "shared-docs-documents",
            Key: { 'documentName': user.Item["documentName"] },
            UpdateExpression: "SET documentDeltas = list_append(documentDeltas, :d), documentVersion = documentVersion + :o",
            ExpressionAttributeValues: { ':d': [body.delta], ':v': body.documentVersion, ':o': 1 },
            ConditionExpression: "documentVersion = :v"
        }).promise();
    }
    catch(err)
    {
        if (err.name !== 'ConditionalCheckFailedException')  throw err;
        accepted = false;
        // LOG(ConditionalCheckFailedException)
    }
    
    if(accepted === true)
    {
        const doc =  await ddbClient.get({
            TableName: "shared-docs-documents",
            Key: { 'documentName': user.Item["documentName"] },
            ProjectionExpression: ["documentVersion", "documentUsers"]
        }).promise();
        
        let newDeltaBody = { "delta": body["delta"], "message": body["message"], "version": body["documentVersion"], "isOwn": false, "connectionId":connectionId };
        let newDelta = { "action": "newDelta", "statusCode": 200, "body": JSON.stringify(newDeltaBody) };
        
        let otherUsers = doc.Item["documentUsers"].values;
        const senderIndex = otherUsers.indexOf(connectionId);
        if (senderIndex > -1) otherUsers.splice(senderIndex, 1);

        await sendToMany(otherUsers, newDelta)
        
        // const sleep = ms => new Promise(r => setTimeout(r, ms));
        // await sleep(Math.random()*2000);
        
        newDeltaBody["isOwn"] = true;
        newDelta["body"] = JSON.stringify(newDeltaBody);
        
        await sendToOne(connectionId, newDelta);
    }
    
    success({"accepted": accepted, "version": body["documentVersion"] });
    return undefined;
}

const getDeltas = async(connectionId, body) => {
    if(!body.hasOwnProperty("oldVersion")) return error("No old version")
    if(!body.hasOwnProperty("newVersion")) return error("No new version")
    
    if(body["newVersion"] - body["oldVersion"] > 100)  return error("Cannot get more than 100 deltas at a time")
    if(body["oldVersion"] < 0)  return error("Old version less than zero")

    const user =  await ddbClient.get({
        TableName: "shared-docs-users",
        Key: { 'connectionId': connectionId },
        ProjectionExpression: "documentName"
    }).promise();
    
    if(user === undefined || user.Item === undefined || user.Item["documentName"] == undefined)
        return error("Not in a document");
    
    const doc =  await ddbClient.get({
        TableName: "shared-docs-documents",
        Key: { 'documentName': user.Item["documentName"] },
        ProjectionExpression: ["documentVersion", "documentDeltas"]
    }).promise();
    
    if(doc.Item["documentVersion"] < body["newVersion"])
        return error("New version bigger than latest document version");
        
    return success({"newVersion": body["newVersion"], "oldVersion": body["oldVersion"], "deltas": doc.Item["documentDeltas"].slice(body["oldVersion"],body["newVersion"]) });
}

const broadcastMessage = async(connectionId, body) => {
    if(!body.hasOwnProperty("message")) return error("No message")
    
    const user =  await ddbClient.get({
        TableName: "shared-docs-users",
        Key: { 'connectionId': connectionId },
        ProjectionExpression: "documentName"
    }).promise();
    
    if(user === undefined || user.Item === undefined || user.Item["documentName"] == undefined)
        return error("Not in a document");
    
    const doc = await ddbClient.get({
        TableName: "shared-docs-documents",
        Key: { 'documentName': user.Item["documentName"] },
        ProjectionExpression: ["documentUsers"]
    }).promise();
    
    let otherUsers = doc.Item["documentUsers"].values;
    const senderIndex = otherUsers.indexOf(connectionId);
    if (senderIndex > -1) otherUsers.splice(senderIndex, 1);
    
    console.log(otherUsers)
    await sendToMany(otherUsers, { "action": "newBroadcast", "statusCode": 200, "body": JSON.stringify({ "message": body["message"], "connectionId":connectionId }) })
    console.log("SENT")
    
    return undefined;
}

const defaultHandler = async(connectionId, body) => {
    if(!body) return error("No body")
    
    try { body = JSON.parse(body) }
    catch { return error("Invalid body") }
    
    if(!body.action) error("No body action")
    
    let documentResult;
    switch(body.action)
    {
        case "newDocument":
            documentResult = await newDocument(connectionId, body);
            break;
        case "listDocuments":
            documentResult = await listDocuments(connectionId, body);
            break;
        case "joinDocument":
            documentResult = await joinDocument(connectionId, body);
            break;
        case "addDelta":
            documentResult = await addDelta(connectionId, body);
            break;
        case "getDeltas":
            documentResult = await getDeltas(connectionId, body);
            break;
        case "sendBroadcast":
            documentResult = await broadcastMessage(connectionId, body);
            break;
        case "deleteDocument": 
            documentResult = await deleteDocument(connectionId, body);
            break;
        case "renameDocument": 
            documentResult = await renameDocument(connectionId, body);
            break;
        default:
            return error("Invalid action");
    }
    
    if(documentResult !== undefined)
    {
        let actionResult = { "action": body.action, "statusCode": documentResult.statusCode, "body": documentResult.body };
        await sendToOne(connectionId, actionResult);
    }
    
    return success({});
}

exports.handler = async (event) => {
    LOG(event)
    
    if(!event.requestContext) return error("No context")
    
    const connectionId = event.requestContext.connectionId;
    if(!connectionId) return error("No connectionId")
    
    const routeKey = event.requestContext.routeKey;
    if(!routeKey) return error("No routeKey")
    
    switch(routeKey)
    {
        case "$connect":
            return connectHandler(connectionId);
        case "$disconnect":
            return disconnectHandler(connectionId);
        case "$default":
            return defaultHandler(connectionId, event.body);
    }
    
    return error("Invalid routeKey")
};
