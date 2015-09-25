/**
 * Created by istvan on 14.09.2015.
 */

'use strict';

var fs = require('fs');
var http = require('http');
var urlParser = require('url');
var debug = require('debug');
var request = require('superagent');
var async = require('async');

var shareFileModule = function (options) {
    var self = this;

    this.credentials = null;
    this.tokens = null;

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

    function formatUrlQueryParams(uri, query) {
        var url = urlParser.parse(uri);

        url.query = query;
        url = urlParser.format(url);

        return url;
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

            uri = formatUrlQueryParams(uri, query);
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

                        if (!res || (res.status !== 401)) {
                            return callback(err);
                        }
                        self.authenticate(self.credentials, function (err) {
                            if (err) {
                                return callback(err);
                            }
                            makeRequest(options, callback);
                        });

                    } else if (res.ok) {
                        callback(null, res.body, res);
                    } else {
                        err = new Error(res.text);
                        callback(err);
                    }
                });

        });
    }

    this.authenticate = function () {
        var self = this;
        var args = arguments;
        var options;
        var callback;
        var clientId;
        var clientSecret;
        var username;
        var password;
        var hostname;
        var credentials;
        var url;

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

        if (!clientId) {
            throw new Error('CLIENT_ID is undefined');
        }

        if (!clientSecret) {
            throw new Error('CLIENT_SECRET is undefined');
        }

        if (!hostname) {
            throw new Error('SHAREFILE_HOSTNAME is undefined');
        }

        if (!username) {
            throw new Error('SHAREFILE_USERNAME is undefined');
        }

        if (!password) {
            throw new Error('SHAREFILE_PASSWORD is undefined');
        }

        url = 'https://' + hostname +'.sharefile.com/oauth/token';

        credentials = {
            grant_type: 'password',
            client_id: clientId,
            client_secret: clientSecret,
            username: username,
            password: password
        };

        url = formatUrlQueryParams(url, credentials);

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
                    self.credentials = credentials;

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
            uri += '(' + options.itemId + ')';
        }

        options.uri = uri;

        makeRequest(options, function (err, body, res) {
            if (err) {
                if (callback && (typeof callback === 'function')) {
                    callback(err);
                }
            } else {
                if (callback && (typeof callback === 'function')) {
                    callback(null, body);
                }
            }
        });
    };

    function multipartFormPostUpload(chunkUri, file, callback) {
        console.log('>>> try to upload the file');

        var fileName = file.originalFilename;
        var fileData = file.fileData;
        var url = urlParser.parse(chunkUri);
        var host = url.host;
        var path = url.path;
        var boundaryKey = new Date().valueOf();
        var newline = '\r\n';
        var body = '--' + boundaryKey + newline +
            'Content-Disposition: form-data; name="File1"; filename="' + fileName + '"' + newline +
            '' + newline +
            fileData + newline +
            '--' + boundaryKey +
            '' + newline + newline;

        //request:
        var request = http.request({
            method: 'post',
            host: host,
            path: path
        });

        request.setHeader('Content-Type', 'multipart/form-data; boundary="' + boundaryKey + '"');
        request.write(body);
        request.end();

        //response:
        request.on('response', function(res) {
            var message = '';

            console.log(res.statusCode);

            res.on('data', function (chunk) {
                message += chunk;
            });

            res.on('error', function (err) {
                console.error(err);
                callback(err);
            });

            res.on('end', function () {
                console.log(message);
                callback(null, message);
            });
        });

    };

    this.uploadFile = function (folderId, file, callback) {
        var uri = '/sf/v3/Items';
        var options = {};

        uri += '(' + folderId + ')/Upload';

        options.uri = uri;

        if (!folderId) {
            throw new Error('folderId is undefined');
        }
        if (!file) {
            throw new Error('file is undefined');
        }
        if (!file.path) {
            throw new Error('file.path is undefined');
        }
        if (!file.originalFilename) {
            throw new Error('file.originalFilename is undefined');
        }

        async.parallel({

            //try to get ChunkUri:
            chunkUri: function (cb) {
                makeRequest(options, function (err, body, res) {
                    var uri;

                    if (err) {
                        return cb(err);
                    }

                    uri = body['ChunkUri'];
                    cb(null, uri);
                });
            },

            //try to get the file data:
            fileData: function(cb) {
                if (file.data) {
                    return cb(null, file.data);
                }

                fs.readFile(file.path, function (err, data) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, data);
                });
            }

        }, function (err, results) {
            var chunkUri;
            var fileData;

            if (err) {
                if (callback && (typeof callback === 'function')) {
                    callback(err );
                }
                return;
            }

            chunkUri = results.chunkUri;
            fileData = results.fileData;

            file.fileData = fileData;

            multipartFormPostUpload(chunkUri, file, function (err, res) {
                if (callback && (typeof callback === 'function')) {
                    callback(err, res.body, res);
                }
            });
        });
    };

    this.postUpload = function (options, callback) {
        var file = options.file;
        var chunkUri = options.chunkUri;

        multipartFormPostUpload(chunkUri, file, callback);
        //callback(null, 'SUCCESS');
    };

    this.getThumbnailUrl = function (itemId, options) {
        var hostname;
        var url;
        var size = (options && options.size) ? options.size : '75';

        if (!self.tokens || !self.tokens.subdomain) {
            throw new Error('Unauthorized');
        }

        hostname = self.tokens.subdomain;
        url = 'https://' + hostname + '.sharefile.com/Viewer/Thumbnail/?itemId=' + itemId;
        url += '&thumbNailSize=' + size;

        return url;
    };

};

module.exports = new shareFileModule();
