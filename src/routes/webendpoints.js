var express = require('express');
var router = express.Router();
const webendpointsObj = require ('./../objects/webendpoints');
const auth0 = require ('./../objects/auth0');

router.post('/createSession/', async (req, res, next) => {
    webendpointsObj.createSession(req.body)
        .then(function(result) {
            res.json(result);
        })
        .catch(function (error) {
            if (!('statusCode' in error)) { error.statusCode = 500; }
            res.status(error.statusCode).json(error);
        });
});

router.post('/getSession/', async (req, res, next) => {
    webendpointsObj.getSession(req.body)
        .then(function(result) {
            res.json(result);
        })
        .catch(function (error) {
            if (!('statusCode' in error)) { error.statusCode = 500; }
            res.status(error.statusCode).json(error);
        });
});

router.post('/getCompletedSessionsByAuth0UserId/', async (req, res, next) => {
    webendpointsObj.getCompletedSessionsByAuth0UserId(req.body)
        .then(function(result) {
            res.json(result);
        })
        .catch(function (error) {
            if (!('statusCode' in error)) { error.statusCode = 500; }
            res.status(error.statusCode).json(error);
        });
});

router.post('/sessionCancelled/', async (req, res, next) => {
    webendpointsObj.sessionCancelled(req.body)
        .then(function(result) {
            res.json(result);
        })
        .catch(function (error) {
            if (!('statusCode' in error)) { error.statusCode = 500; }
            res.status(error.statusCode).json(error);
        });
});
/*
router.post('/getPayments/', async (req, res, next) => {
    webendpointsObj.getPayments(req.body)
        .then(function(result) {
            res.json(result);
        })
        .catch(function (error) {
            if (!('statusCode' in error)) { error.statusCode = 500; }
            res.status(error.statusCode).json(error);
        });
});
*/
router.post('/getPaymentsBySubscriptionId/', async (req, res, next) => {
    webendpointsObj.getPaymentsBySubscriptionId(req.body)
        .then(function(result) {
            res.json(result);
        })
        .catch(function (error) {
            if (!('statusCode' in error)) { error.statusCode = 500; }
            res.status(error.statusCode).json(error);
        });
});

router.post('/getSubscriptionById/', async (req, res, next) => {
    webendpointsObj.getSubscriptionById(req.body)
        .then(function(result) {
            res.json(result);
        })
        .catch(function (error) {
            if (!('statusCode' in error)) { error.statusCode = 500; }
            res.status(error.statusCode).json(error);
        });
});

router.post('/getPlanById/', async (req, res, next) => {
    webendpointsObj.getPlanById(req.body)
        .then(function(result) {
            res.json(result);
        })
        .catch(function (error) {
            if (!('statusCode' in error)) { error.statusCode = 500; }
            res.status(error.statusCode).json(error);
        });
});

router.post('/getProductById/', async (req, res, next) => {
    webendpointsObj.getProductById(req.body)
        .then(function(result) {
            res.json(result);
        })
        .catch(function (error) {
            if (!('statusCode' in error)) { error.statusCode = 500; }
            res.status(error.statusCode).json(error);
        });
});

router.post('/getCustomerById/', async (req, res, next) => {
    webendpointsObj.getCustomerById(req.body)
        .then(function(result) {
            res.json(result);
        })
        .catch(function (error) {
            if (!('statusCode' in error)) { error.statusCode = 500; }
            res.status(error.statusCode).json(error);
        });
});

router.post('/getSubscriptionsByCustomerId/', async (req, res, next) => {
    webendpointsObj.getSubscriptionsByCustomerId(req.body)
        .then(function(result) {
            res.json(result);
        })
        .catch(function (error) {
            if (!('statusCode' in error)) { error.statusCode = 500; }
            res.status(error.statusCode).json(error);
        });
});

router.post('/getInvoiceList/', async (req, res, next) => {
    webendpointsObj.getInvoiceList(req.body)
        .then(function(result) {
            res.json(result);
        })
        .catch(function (error) {
            if (!('statusCode' in error)) { error.statusCode = 500; }
            res.status(error.statusCode).json(error);
        });
});

router.post('/cancelSubscription/', async (req, res, next) => {
    webendpointsObj.cancelSubscription(req.body)
        .then(function(result) {
            res.json(result);
        })
        .catch(function (error) {
            if (!('statusCode' in error)) { error.statusCode = 500; }
            res.status(error.statusCode).json(error);
        });
});

router.post('/getBillingProductsPlans/', async (req, res, next) => {
    webendpointsObj.getBillingProductsPlans(req.body)
        .then(function(result) {
            res.json(result);
        })
        .catch(function (error) {
            if (!('statusCode' in error)) { error.statusCode = 500; }
            res.status(error.statusCode).json(error);
        });
});

router.post('/createCustomer/', async (req, res, next) => {
    webendpointsObj.createCustomer(req.body)
        .then(function(result) {
            res.json(result);
        })
        .catch(function (error) {
            if (!('statusCode' in error)) { error.statusCode = 500; }
            res.status(error.statusCode).json(error);
        });
});

router.post('/setUserAppMetadata/', async (req, res, next) => {
    auth0.setUserAppMetadata(req.body)
        .then(function(result) {
            res.json(result);
        })
        .catch(function (error) {
            if (!('statusCode' in error)) { error.statusCode = 500; }
            res.status(error.statusCode).json(error);
        });
});

router.post('/searchUser/', async (req, res, next) => {
    auth0.searchUser(req.body)
        .then(function(result) {
            res.json(result);
        })
        .catch(function (error) {
            if (!('statusCode' in error)) { error.statusCode = 500; }
            res.status(error.statusCode).json(error);
        });
});

router.post('/getRoles/', async (req, res, next) => {
    auth0.getRoles(req.body)
        .then(function(result) {
            res.json(result);
        })
        .catch(function (error) {
            if (!('statusCode' in error)) { error.statusCode = 500; }
            res.status(error.statusCode).json(error);
        });
});

module.exports = router;
