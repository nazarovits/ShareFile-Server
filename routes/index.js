var express = require('express');
var router = express.Router();

var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();

var shareFile = require('../helpers/shareFile');

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

    /*
    *
    * {"Method":"Standard","ChunkUri":"https://storage-eu-8.sharefile.com/upload.aspx?uploadid=75770bbd-9c70-4eba-946d-4c9aebbaa509&tool=apiv3&batchid=5040a231-36b2-4205-8ec3-e27d0e0fa327&encparams=y83sJlsk5-jxPNB86tiWqutwAIJpbfxOAEcIxQEXAo3IoeKCP6vK0_ixFKvo_6qse4pGzBES5YvwpTmJKfcn-0JIEr1DGLUOvETdXTfBbiEjH5jQ-ZsxGOY4qecGE-N_qibx09MbMcVfmMNHSiY-3t0eV7lj_W8F-WThYUu8PbpGPBYGJNFGqCVVAO-Z--P1iYIPkv7Y9U0MNqYZixspN3UyOFrHUD4i8P-nUFkfGxx25aXqXeCAtbUKxKIupC8nCHHOt6Wm4VEPEUT_kXKROpMP-fsNv9P8XBb25GTpM10Mz9PjEw8kTMSwX6OnXpg1Gr5HXlR2Mf_JTwsllpAuVp312uOyYROOr_wvxmuSVl7MwBPwTtK90Bc2nAvfh6xsu7Efi9jR24VP4HTnl22TgpGZwCl371sIIhKpxVwOoBwXvvNBcDT4-kma1llSsSJTfxT7fwUSLIeOdsESmgRQjRO1LTwSAz3Y0Xz1NDDl7MfYuLFI9JpsRw5bARsMEypPDicQhFE3JXmNcnI-kglc_2BUE__QtI89uU3TtYOSnulJfugpCRJWoSGMXgJDtnUdwifUTGIauCDg8SqeAfy7NIgYbCY_u_SMPzVQEG8$&h=s1NnlZUzBzKpKWYGjT1MbPUIyTyULBGKPB8ec0Y0GE8%3d","ProgressData":"75770bbd-9c70-4eba-946d-4c9aebbaa509%2chttps%3a%2f%2fstorage-eu-8.sharefile.com%2fuploadstatus.ashx%2cAmazon-Standard%2czpc3159d90-01f7-41a7-a8ab-3704157466%2cQbSICxfN%2bOlj7%2fA2ZPV4L3TKtf0Q2RT3Tww57v%2fZqV4%3d","IsResume":false,"ResumeIndex":0,"ResumeOffset":0,"ResumeFileHash":"","odata.metadata":"https://nokojetihinboxdesign.sf-api.com/sf/v3/$metadata#UploadSpecification/ShareFile.Api.Models.UploadSpecification@Element","odata.type":"ShareFile.Api.Models.UploadSpecification"}
    *
    * */

}

router.post('/multi', multipartMiddleware, function (req, res, next) {
    var options = req.body;

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

module.exports = router;
