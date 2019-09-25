const stripe = require('stripe')(process.env.STRIPE_KEY);

/*
const elasticsearch = require('elasticsearch');
const zcAdminClient = new elasticsearch.Client({
    host: process.env.ESCONN_ADMIN_STRING,
    log: 'error'
});
*/

const mongoDb = require ('./paymentsMongoDb');
const ObjectID = require('mongodb').ObjectID;


module.exports = {

    logWebhook: (webhookEvent) => {
        return new Promise ( async (resolve, reject ) => {
            try {
                console.log(webhookEvent.type);

                const mongoDbResult = await mongoDb.db.collection(process.env.STRIPE_WEBHOOK_INDEX).updateOne({_id: webhookEvent.id}, { $set: webhookEvent }, { upsert: true });

                return resolve(mongoDbResult);
            }
            catch (e) {
                return reject( e );
            }
        });
    },

    handleWebhook: (req) => {
        return new Promise ( async (resolve, reject ) => {
            try {
                // check signing by Stripe, throw error if failure
                let webhookEvent = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SIGNING_KEY);

                webhookEvent.createDate = new Date();
                module.exports.logWebhook (webhookEvent);

                switch (webhookEvent.type) {
                    case 'checkout.session.completed':
                        await module.exports.checkoutSessionCompleted(webhookEvent);
                        break;
                    case 'invoice.payment_succeeded':
                        await module.exports.invoicePaymentSucceeded(webhookEvent);
                        break;
                    case 'customer.subscription.created':
                        console.log('Not yet processed', webhookEvent.type);
                        break;
                    case 'order.payment_succeeded':
                        console.log('Not yet processed', webhookEvent.type);
                        break;
                    default:
                        console.error('Unhandled Webhook', webhookEvent.type);
                        break;
                }
                return resolve({});
            }
            catch (err) {
                return reject (err);
            }
        });
    },

    invoicePaymentSucceeded: (webhookEvent) => {
        return new Promise ( async (resolve, reject ) => {
            try {
                const mdbSessionUpdate = await mongoDb.db.collection(process.env.STRIPE_PAYMENT_INDEX).insertOne(webhookEvent.data.object);

                return resolve ({});

                /*
                var webhookDataObject = webhook.data.object;
                webhookDataObject.createDate = webhook.createDate;

                await delay(3000);

                const pob = {
                    index: process.env.PURCHASE_INDEX,
                    body: {
                        query: {match: { stripeSubscriptionId: webhookDataObject.subscription }}
                    }
                };
                const paymentSetups = await zcAdminClient.search (pob);

                const paymentSetup = paymentSetups.hits.hits[0];


                const b = {
                    createDate: new Date(),
                    stripeSubscriptionId: webhookDataObject.subscription,
                    stripeCustomerId: webhookDataObject.customer,
                    stripeId: webhookDataObject.id,
                    amount: webhookDataObject.amount_paid / 100,
                    tax: webhookDataObject.tax ? webhookDataObject.tax/100: 0,
                    total: webhookDataObject.total/100,
                    pc_stripe_webhook_id: webhook._id,
                    pc_payment_setup_id: paymentSetup._id,
                    period_start: new Date(webhookDataObject.lines.data[0].period.start * 1000),
                    period_end: new Date(webhookDataObject.lines.data[0].period.end * 1000),
                    payment_type: 'credit-card',
                    payment_provider: 'stripe'
                };

                const pcPayment = await zcAdminClient.index ( {
                    index: 'pc-payment',
                    body: b
                });

                return resolve({});

                */
            }
            catch (err) {
                return reject (err);
            }
        });
    },

    checkoutSessionCompleted: (webhookEvent) => {
        return new Promise ( async (resolve, reject) => {
            try {

                const updateObject = {
                    completed: true,
                    stripeCustomerId: webhookEvent.data.object.customer
                };

                if ('subscription' in webhookEvent.data.object) { updateObject.stripeSubscriptionId = webhookEvent.data.object.subscription; }

                const mdbSession = await mongoDb.db.collection(process.env.STRIPE_SESSION_INDEX).findOne({ _id: webhookEvent.data.object.id });

                if (!mdbSession) { throw Error('Webhook checkoutSessionCompleted session id not found'); }

                mdbSession.completed=true;
                mdbSession.stripeCustomerId = webhookEvent.data.object.customer;

                const mdbSessionUpdate = await mongoDb.db.collection(process.env.STRIPE_SESSION_INDEX).updateOne({ _id: webhookEvent.data.object.id }, {
                    $set: updateObject
                });

                const purchaseRequestUpdate = await mongoDb.db.collection(process.env.PURCHASE_INDEX).updateOne({ _id: mdbSession.purchaseRequestId }, {
                    $set: updateObject
                });

                return resolve ({});
            }
            catch (err) {
                return reject (err);
            }
        });
    },

    customerSubscriptionCreated: (req) => {
        return new Promise ( async (resolve, reject) => {
            try {
                module.exports.logWebhook (req);

                const webhook = req.body;
                webhook.createDate = new Date();

                return resolve ({});

                /*
                const sub = await zcAdminClient.index ( {
                    index: process.env.STRIPE_SUBSCRIPTION_INDEX,
                    id: webhookDataObject.id,
                    body: webhookDataObject,
                    refresh: true
                });
                */
            }
            catch (err) {
                return reject (err);
            }


        });
    },

    orderPaymentSucceeded: (req) => {
        return new Promise ( async (resolve, reject ) => {
            try {
                module.exports.logWebhook (req);

                const webhook = req.body;
                webhook.createDate = new Date();

                //const mdbSessionUpdate = await mongoDb.db.collection(process.env.STRIPE_PAYMENT_INDEX).insertOne(webhook.data.object);

                return resolve ({});
            }
            catch (err) {
                return reject (err);
            }
        });
    }
};

const delay = (ms) => { return new Promise ( (resolve, reject) => { setTimeout( () => {return resolve();}, ms); }); };
