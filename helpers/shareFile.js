/**
 * Created by istvan on 14.09.2015.
 */

'use strict';
var fs = require('fs');
var debug = require('debug');
var request = require('superagent');

var shareFileModule = function (options) {
    var self = this;

    //this.tokens = null;

    this.tokens = {
        "access_token": "0c4O6KOOmC5FTXucfeCKRPNEqRHDrcNp$$mFKKxncjyQJ3MDaUZFNh2Ht4pq8XmgKe",
        "refresh_token": "0c4O6KOOmC5FTXucfeCKRPNEqRHDrcNp$$4hdZewrAUgSqFQJP6HFTzysi8RPw00sZfBG43EIu",
        "token_type": "bearer",
        "appcp": "sharefile.com",
        "apicp": "sharefile.com",
        "subdomain": "nokojetihinboxdesign",
        "expires_in": 28800,
        "access_files_folders": true,
        "modify_files_folders": true,
        "admin_users": true,
        "admin_accounts": true,
        "change_my_settings": true,
        "web_app_login": true
    };

    function isAuthorized(callback) {
        var tokens = self.tokens;

        if (!tokens || !tokens.access_token) {

            //try to authorize ...
            self.authenticate(function (err, content) {
                if (err) {
                    if (callback && (typeof callback === 'function')) {
                        callback(err);
                    }
                } else {
                    if (callback && (typeof callback === 'function')) {
                        callback();
                    }
                }
            });

        } else {
            if (callback && (typeof callback === 'function')) {
                callback();
            }
        }
    }

    function setUriFromQueryParams(uri, query) {
        var isFirstParam = true;

        for (var param in query) {
            if (isFirstParam) {
                uri += '?' + param + '=' + query[param];
                isFirstParam = false;
            } else {
                uri += '&' + param + '=' + query[param];
            }
        }

        return uri;
    }

    function makeRequest(options, callback) {
        var options = options || {};
        var query = options.query || {};
        var uri = options.uri;

        if (!uri) {
            throw new Error('uri is undefined');
        }

        isAuthorized(function (err) {
            var authHeader;
            var hostname;
            var url;

            if (err) {
                if (callback && (typeof callback === 'function')) {
                    callback(err);
                }
                return;
            }

            authHeader = self.getAuthorizationHeader();
            hostname = self.getHostName();

            uri = setUriFromQueryParams(uri, query);
            url = hostname + uri;

            console.log('>>> try to make request');
            console.log('>>> url = ', url);

            request
                .get(url)
                .set('Content-Type', 'application/x-www-form-urlencoded')
                .set(authHeader)
                .end(function(err, res){
                    console.log('>>> res.status ', res.status);

                    if (err) {
                        return callback(err);
                    }

                    if (res.ok) {
                        callback(null, res.body, res);
                    } else {
                        err = new Error(res.text);
                        callback(err);
                    }
                });

        });

    }

    this.authenticate = function () {
        var args = arguments;
        var options;
        var callback;
        var clientId;
        var clientSecret;
        var username;
        var password;
        var hostname;
        var url;
        var self = this;

        if (args.length === 2) {
            options = args[0];
            if (typeof args[1] === 'function') {
                callback = args[1];
            }
        } else if (args.length === 1) {
            if (typeof args[0] === 'function') {
                callback = args[0];
            }
        }

        clientId = (options && options.CLIENT_ID) ? options.CLIENT_ID : process.env.CLIENT_ID;
        clientSecret = (options && options.CLIENT_SECRET) ? options.CLIENT_SECRET : process.env.CLIENT_SECRET;
        hostname = (options && options.SHAREFILE_HOSTNAME) ? options.SHAREFILE_HOSTNAME : process.env.SHAREFILE_HOSTNAME;
        username = (options && options.SHAREFILE_USERNAME) ? options.SHAREFILE_USERNAME : process.env.SHAREFILE_USERNAME;
        password = (options && options.SHAREFILE_PASSWORD) ? options.SHAREFILE_PASSWORD : process.env.SHAREFILE_PASSWORD;

        if (!clientId || !clientSecret) {
            throw new Error('CLIENT_ID or CLIENT_SECRET is undefined');
        }

        url = 'https://' + hostname +'.sharefile.com/oauth/token';

        url += '?grant_type=password';
        url += '&client_id=' + clientId;
        url += '&client_secret=' + clientSecret;
        url += '&username=' + username;
        url += '&password=' + password;

        console.log('>>> try to authenticate');
        console.log('>>> url = ', url);

        request
            .get(url)
            .set('Content-Type', 'application/x-www-form-urlencoded')
            .end(function(err, res){
                if (err) {
                    return callback(err);
                }

                if (res.ok) {
                    self.tokens = res.body;
                    callback(null, res.body, res);
                } else {
                    err = new Error(res.text);
                    callback(err);
                }
            });
    };

    this.getAuthorizationHeader = function () {
        var authHeader = {
            'Authorization': 'Bearer ' + self.tokens['access_token']
        };
        return authHeader;
    };

    this.getHostName = function () {
        var subdomain = self.tokens['subdomain'];
        var hostname =  subdomain + '.sf-api.com';

        return hostname;
    };

    this.getItems = function (options, callback) {
        var options = options || {};
        var uri = '/sf/v3/Items';

        if (options.itemId) {
            uri += '(' + options.itemId + ')'
        }

        options.uri = uri;

        makeRequest(options, function (err, body, res) {
            if (err) {
                if (callback && (typeof callback === 'function')) {
                    callback(err );
                }
            } else {
                if (callback && (typeof callback === 'function')) {
                    callback(null, body);
                }
            }
        });
    };

    function multipartFormPostUpload_1(chunkUri, file, callback) {
        var filePath;

        if (!chunkUri) { //check is got upload url:
            throw new Error('No Upload URL received');
        }

        if (!file || !file.path) { //check is got upload url:
            throw new Error('Incorrect parameter "file"');
        }

        console.log('>>> try to upload the file');
        filePath = file.path;
        console.log(filePath);
        console.log(chunkUri);

        var size = {
            'content-length': file.size
        };
        var type = {
            'content-type': file.type
        };

        request
            .post(chunkUri)
            .attach('Filedata', filePath)
            .set('content-type', 'multipart/form-data')
            .set('connection', 'keep-alive')
            .set('content-length', '9495')
            .end(function (err, res) {
                if (err) throw err;

                console.log(res.status);
                console.log(res.body);
                console.log(res.text);

                if (callback && (typeof callback === 'function')) {
                    callback(err, res);
                }
            });
    };

    function multipartFormPostUpload_2(chunkUri, file, callback) {
        var FormData = require('form-data');
        var fs = require('fs');
        var form = new FormData();
        var filePath;
        var err;

        if (!chunkUri) { //check is got upload url:
            throw new Error('No Upload URL received');
        }

        if (!file || !file.path) { //check is got upload url:
            throw new Error('Incorrect parameter "file"');
        }

        console.log('>>> try to upload the file');
        filePath = file.path;
        console.log(filePath);
        console.log(chunkUri);

        form.append('Filedata', fs.createReadStream(filePath));
        form.submit(chunkUri, function(err, res) {
            if (err) throw err;
            console.log('Done');
            console.log(res.statusCode);
            if (callback && (typeof callback === 'function')) {
                callback(err, {success: 'uploaded'});
            }
        });
    };

    function multipartFormPostUpload_3(chunkUri, file, callback) {
        var urlParser = require('url');
        var url;
        var FormData = require('form-data');
        var form = new FormData();
        var filePath;

        if (!chunkUri) { //check is got upload url:
            throw new Error('No Upload URL received');
        }

        if (!file || !file.path) { //check is got upload url:
            throw new Error('Incorrect parameter "file"');
        }

        console.log('>>> try to upload the file');
        filePath = file.path;
        console.log(filePath);
        console.log(chunkUri);

        var http = require('http');

        url = urlParser.parse(chunkUri);

        var host = url.host;
        var path = url.path;

        form.append('Filedata', fs.createReadStream(filePath));
        //form.submit(chunkUri, function(err, res) {
        form.submit(chunkUri, function(err, res) {
            if (err) {
                return callback(err);
            }
            var message = '';

            res.on('data', function (chunk) {
                console.log('got data', chunk);
                message += chunk;
            });

            res.on('end', function (chunk) {
                console.log('res.end');
                console.log(message);
                callback(null, message);
            });

            console.log(res.req.headers);
            console.log('Done');
            console.log(res.statusCode);
            //callback(null, {success: 'uploaded'});

        });


        /*var request = http.request({
            method: 'post',
            host: host,
            path: path,
            headers: form.getHeaders()
        });

        //form.pipe(request);

        request.on('connect', function (socket) {
                console.log('connected');

                socket.on('data', function (chunk) {
                    console.log('on.data');
                });
            })
            .on('response', function(res) {
            console.log('on.response');
            console.log(res.statusCode);

            if (callback && (typeof callback === 'function')) {
                callback(null, res, res);
            }
        }).on('error', function(err) {
            console.log('on.error');
            console.log(err);

            if (callback && (typeof callback === 'function')) {
                callback(err);
            }
        });
    */
    };

    function multipartFormPostUpload(chunkUri, file, callback) {
        var urlParser = require('url');
        var url;
        var FormData = require('form-data');
        var form = new FormData();
        var filePath;

        if (!chunkUri) { //check is got upload url:
            throw new Error('No Upload URL received');
        }

        if (!file || !file.path) { //check is got upload url:
            throw new Error('Incorrect parameter "file"');
        }

        console.log('>>> try to upload the file');
        filePath = file.path;
        console.log(filePath);
        console.log(chunkUri);

        var http = require('http');

        url = urlParser.parse(chunkUri);

        var host = url.host;
        var path = url.path;

        form.append('Filedata', fs.createReadStream(filePath));

        var formHeaders = form.getHeaders();

        formHeaders['connection'] = 'keep-alive';
        formHeaders['content-length'] = '9531';

        console.log('formHeaders');
        console.log(formHeaders);

        var request = http.request({
            method: 'post',
            host: host,
            path: path,
            headers: formHeaders
        });

        form.pipe(request);

        request.on('response', function(res) {
            console.log(res.statusCode);

            var message = '';

            res.on('data', function (chunk) {
                console.log('got data', chunk);
                message += chunk;
            });

            res.on('end', function (chunk) {
                console.log('res.end');
                console.log(message);
                callback(null, message);
            });

            console.log(res.req.headers);
            console.log('Done');
            console.log(res.statusCode);
        });

    };

    this.uploadFile = function (folderId, file, callback) {
        var uri = '/sf/v3/Items';
        var options = {};

        uri += '(' + folderId + ')/Upload';

        options.uri = uri;

        //try to get ChunkUri:
        makeRequest(options, function (err, body, res) {
            var chunkUri;

            if (err) {
                if (callback && (typeof callback === 'function')) {
                    callback(err );
                }
                return;
            }

            chunkUri = body['ChunkUri'];

            callback(null, chunkUri, res);

            /*multipartFormPostUpload(chunkUri, file, function (err, res) {
                if (callback && (typeof callback === 'function')) {
                    callback(err, res.body, res);
                }
            });*/
        });
    };

    this.postUpload = function (options, callback) {
        var file = options.file;
        var chunkUri = options.chunkUri;

        multipartFormPostUpload(chunkUri, file, callback);
        //callback(null, 'SUCCESS');
    }

};

module.exports = new shareFileModule();
