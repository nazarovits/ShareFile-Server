var express = require('express');
var router = express.Router();

var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();

var shareFile = require('../helpers/shareFile');
var fs = require('fs');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/oauth2', function (req, res, next) {
  console.log('----------------------------------');
  console.log('>>> oauth2');
  console.log('query');
  console.log(req.query);
  console.log('----------------------------------');

  res.status(200).send({success: 'authorized'});
});


router.get('/authorize', function (req, res, next) {
    shareFile.authenticate(function (err, content) {
        if (err) {
            return next(err);
        }
        res.status(200).send(content);
    });
});

function getItems(req, res, next) {
    var query = req.query;
    var itemId = req.params.id;
    var params = {
        query: query,
        itemId: itemId
    };

    shareFile.getItems(params, function (err, content) {
        if (err) {
            return next(err);
        }
        res.status(200).send(content);
    });
};

function renderUploadFile(req, res, next) {
    res.render('upload', {title: 'Upload file', res: null});
}

function uploadFile(req, res, next) {
    var file = req.files.file;
    var options = req.body;
    var folderId = options.folderId;

    shareFile.uploadFile(folderId, file, function (err, content) {
        if (err) {
            return next(err);
        }

        if (typeof content === 'object') {
            content = JSON.stringify(content);
        }
        res.render('upload', {title: 'Upload file', res: content});

    });
}

function getThumbnailUrl(req, res, next) {
    var itemId = req.params.id;
    var options = req.query;
    var url = shareFile.getThumbnailUrl(itemId, options);
    var html = '<a href="' + url + '" target="_blank">' + url + '</a>';

    res.status(200).send(html);
};

router.post('/multi', multipartMiddleware, function (req, res, next) {
    var options = req.body;
    console.log(req.headers);
    options.file = req.files.file;

    shareFile.postUpload(options, function (err, result){
        if (err) {
            return next(err);
        }
        res.send(result);
    });
});

router.get('/items', getItems);
router.get('/items/upload', renderUploadFile);
router.post('/items/upload', multipartMiddleware, uploadFile);
router.get('/items/:id', getItems);
router.get('/items/:id/thumbnails', getThumbnailUrl);

module.exports = router;
