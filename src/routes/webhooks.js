var express = require('express');
var router = express.Router();
const webhooksObj = require ('./../objects/webhooks');


router.post('/handleWebhook/', async (req, res, next) => {
    webhooksObj.handleWebhook(req)
        .then(function(result) {
            res.json(result);
        })
        .catch(function (error) {
            if (!('statusCode' in error)) { error.statusCode = 500; }
            res.status(error.statusCode).json(error);
        });
});

module.exports = router;
