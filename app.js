"use strict";

require('dotenv').config({path: __dirname + '/.env'})

const fs = require('fs');
const chokidar = require('chokidar');
const request    = require('request');
const path = require('path');

const watcher = chokidar.watch(process.env.LOCAL_PATH, {ignored: /^\./, persistent: true});
const fileList = {};

watcher.on('add', (path) => {
    var splitPath = path.split("/");
    waiter(path, splitPath[splitPath.length - 1], true);
});

function waiter(path, filename, first){
    if(fileIsComplete(path, filename)) {
        pushIt(path, filename);
    } else {
        if(first){
            console.log(`New File detected: ${filename}`);
        } else {
            console.log(`New File still processing: ${filename}`);
        }
        setTimeout(function() {
            waiter(path, filename, false);
        }, 500);
    }
}

function pushIt(path, filename){
    uploadFile(path, process.env.DROP_PATH, process.env.TOKEN, filename, (data)=> {
        if(data.err === null){ //if successful
            fs.unlink(path, (err)=> { //error at delete
                if (err){
                    console.error(err)
                } else {
                    console.log(`${filename} uploaded to dropbox and deleted successfully!`);
                }
            });
        } else {//if it breaks
            console.error(data.err);
        }
    });
}

function fileIsComplete(path, filename){
    const size = fs.statSync(path)["size"];
    if(fileList[filename] === size){
        return true;
    } else {
        fileList[filename] = size;
        return false;
    }
}

function uploadFile(localPath,remotePath,token, filename, callback){
    console.log(`Upload called for ${filename}`)
    remotePath = path.normalize("/"+remotePath + "/" +filename);
    fs.readFile(localPath, function read(err, data) {
        if (err){
            console.log(err);
            return ;
        }

        request.post(
            'https://content.dropboxapi.com/2/files/upload',
            {
                headers: { Authorization: 'Bearer ' + token,
                    "Dropbox-API-Arg": JSON.stringify({"path": remotePath,"mode": "add","autorename": true,"mute": false}),
                    "Content-Type": "application/octet-stream"},
                body: data

            }, function(err, httpResponse, bodymsg) {

                callback({
                    err:err,
                    httpResponse:httpResponse,
                    bodymsg:bodymsg
                });
            }

        );

    });
}

console.log(`Dropbox Watcher: Online`);