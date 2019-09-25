var express = require('express');
var router = express.Router();
const webendpointsObj = require ('./../objects/webendpoints');

router.post('/createSession/', async (req, res, next) => {
    webendpointsObj.createSession(req)
        .then(function(result) {
            res.json(result);
        })
        .catch(function (error) {
            if (!('statusCode' in error)) { error.statusCode = 500; }
            res.status(error.statusCode).json(error);
        });
});

router.post('/getSession/', async (req, res, next) => {
    webendpointsObj.getSession(req)
        .then(function(result) {
            res.json(result);
        })
        .catch(function (error) {
            if (!('statusCode' in error)) { error.statusCode = 500; }
            res.status(error.statusCode).json(error);
        });
});

router.post('/getStripeSubscriptions/', async (req, res, next) => {
    webendpointsObj.getStripeSubscriptions(req)
        .then(function(result) {
            res.json(result);
        })
        .catch(function (error) {
            if (!('statusCode' in error)) { error.statusCode = 500; }
            res.status(error.statusCode).json(error);
        });
});

router.post('/getSubcriptionPaymentHistory/', async (req, res, next) => {
    webendpointsObj.getSubcriptionPaymentHistory(req)
        .then(function(result) {
            res.json(result);
        })
        .catch(function (error) {
            if (!('statusCode' in error)) { error.statusCode = 500; }
            res.status(error.statusCode).json(error);
        });
});

router.post('/savePurchaseRequest/', async (req, res, next) => {
    webendpointsObj.savePurchaseRequest(req)
        .then(function(result) {
            res.json(result);
        })
        .catch(function (error) {
            if (!('statusCode' in error)) { error.statusCode = 500; }
            res.status(error.statusCode).json(error);
        });
});

router.post('/sessionCancelled/', async (req, res, next) => {
    webendpointsObj.sessionCancelled(req)
        .then(function(result) {
            res.json(result);
        })
        .catch(function (error) {
            if (!('statusCode' in error)) { error.statusCode = 500; }
            res.status(error.statusCode).json(error);
        });
});

module.exports = router;
