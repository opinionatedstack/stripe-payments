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

router.post('/getCompletedSessionsByAuth0UserId/', async (req, res, next) => {
    webendpointsObj.getCompletedSessionsByAuth0UserId(req)
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

router.post('/getPayments/', async (req, res, next) => {
    webendpointsObj.getPayments(req)
        .then(function(result) {
            res.json(result);
        })
        .catch(function (error) {
            if (!('statusCode' in error)) { error.statusCode = 500; }
            res.status(error.statusCode).json(error);
        });
});

router.post('/getPaymentsBySubscriptionId/', async (req, res, next) => {
    webendpointsObj.getPaymentsBySubscriptionId(req)
        .then(function(result) {
            res.json(result);
        })
        .catch(function (error) {
            if (!('statusCode' in error)) { error.statusCode = 500; }
            res.status(error.statusCode).json(error);
        });
});

router.post('/getSubscriptionById/', async (req, res, next) => {
    webendpointsObj.getSubscriptionById(req)
        .then(function(result) {
            res.json(result);
        })
        .catch(function (error) {
            if (!('statusCode' in error)) { error.statusCode = 500; }
            res.status(error.statusCode).json(error);
        });
});

router.post('/getPlanById/', async (req, res, next) => {
    webendpointsObj.getPlanById(req)
        .then(function(result) {
            res.json(result);
        })
        .catch(function (error) {
            if (!('statusCode' in error)) { error.statusCode = 500; }
            res.status(error.statusCode).json(error);
        });
});

router.post('/getProductById/', async (req, res, next) => {
    webendpointsObj.getProductById(req)
        .then(function(result) {
            res.json(result);
        })
        .catch(function (error) {
            if (!('statusCode' in error)) { error.statusCode = 500; }
            res.status(error.statusCode).json(error);
        });
});

router.post('/getCustomerById/', async (req, res, next) => {
    webendpointsObj.getCustomerById(req)
        .then(function(result) {
            res.json(result);
        })
        .catch(function (error) {
            if (!('statusCode' in error)) { error.statusCode = 500; }
            res.status(error.statusCode).json(error);
        });
});

router.post('/getSubscriptionsByCustomerId/', async (req, res, next) => {
    webendpointsObj.getSubscriptionsByCustomerId(req)
        .then(function(result) {
            res.json(result);
        })
        .catch(function (error) {
            if (!('statusCode' in error)) { error.statusCode = 500; }
            res.status(error.statusCode).json(error);
        });
});

router.post('/getInvoiceList/', async (req, res, next) => {
    webendpointsObj.getInvoiceList(req)
        .then(function(result) {
            res.json(result);
        })
        .catch(function (error) {
            if (!('statusCode' in error)) { error.statusCode = 500; }
            res.status(error.statusCode).json(error);
        });
});

router.post('/cancelSubscription/', async (req, res, next) => {
    webendpointsObj.cancelSubscription(req)
        .then(function(result) {
            res.json(result);
        })
        .catch(function (error) {
            if (!('statusCode' in error)) { error.statusCode = 500; }
            res.status(error.statusCode).json(error);
        });
});

router.post('/getBillingProductsPlans/', async (req, res, next) => {
    webendpointsObj.getBillingProductsPlans(req)
        .then(function(result) {
            res.json(result);
        })
        .catch(function (error) {
            if (!('statusCode' in error)) { error.statusCode = 500; }
            res.status(error.statusCode).json(error);
        });
});

module.exports = router;
