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
const auth0 = require ('./auth0');
const webendpoints = require('./webendpoints');


module.exports = {

    logWebhook: (webhookEvent) => {
        return new Promise ( async (resolve, reject ) => {
            try {
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
                console.log(webhookEvent.type);
                //console.log(JSON.stringify(webhookEvent, null, 4));

                switch (webhookEvent.type) {
                    case 'checkout.session.completed':
                        await module.exports.checkoutSessionCompleted(webhookEvent);
                        break;
                    case 'invoice.payment_succeeded':
                        await module.exports.invoicePaymentSucceeded(webhookEvent);
                        break;
                    case 'customer.subscription.created':
                        await module.exports.customerSubscriptionCreated(webhookEvent);
                        break;
                    case 'customer.subscription.deleted':
                        await module.exports.customerSubscriptionDeleted(webhookEvent);
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
                console.log(err);
                return resolve({});
                //return reject (err);
            }
        });
    },

    invoicePaymentSucceeded: (webhookEvent) => {
        return new Promise ( async (resolve, reject ) => {
            try {
                const mdbSessionUpdate = await mongoDb.db.collection(process.env.STRIPE_PAYMENT_INDEX).insertOne(webhookEvent.data.object);

                await auth0.setUserAppMetadata({
                    search_field: 'app_metadata.stripe_customer_id',
                    search_value: webhookEvent.data.object.customer,
                    app_metadata_var_name: 'paid_until',
                    app_metadata_var_value: new Date(webhookEvent.data.object.lines.data[0].period.end * 1000)
                });

                return resolve ({});

            }
            catch (err) {
                return reject (err);
            }
        });
    },

    checkoutSessionCompleted: (webhookEvent) => {
        return new Promise ( async (resolve, reject) => {
            try {
                const auth0_sub_id = webhookEvent.data.object.client_reference_id;
                const stripe_customer_id = webhookEvent.data.object.customer;

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

                /*
                const purchaseRequestUpdate = await mongoDb.db.collection(process.env.PURCHASE_INDEX).updateOne({ _id: mdbSession.purchaseRequestId }, {
                    $set: updateObject
                });
                 */

                // Moved into CreateCustomer
                //const auth0UserUpdateResult = await auth0.setUsersStripeCustomerId({ auth0_sub_id: auth0_sub_id, stripe_customer_id: stripe_customer_id } );

                return resolve ({});
            }
            catch (err) {
                return reject (err);
            }
        });

        /*
        {
    "id": "evt_1FaLJKIU3sdNNsUycqUnQNc0",
    "object": "event",
    "api_version": "2019-10-17",
    "created": 1572696150,
    "data": {
        "object": {
            "id": "cs_test_0ezieW09fAApeLNvda0JaszqpiNry47Kj7WmV2tb7RD2NaS8cpjQWENV",
            "object": "checkout.session",
            "billing_address_collection": null,
            "cancel_url": "http://localhost:4200/private/signupcancel?session_id={CHECKOUT_SESSION_ID}",
            "client_reference_id": "auth0|5d5bb51057e8cd0cd1b2d6a7",
            "customer": "cus_G1FDQ1pNfLxvV2",
            "customer_email": null,
            "display_items": [
                {
                    "amount": 200,
                    "currency": "eur",
                    "plan": {
                        "id": "plan_G5rHmWk1HFb1pE",
                        "object": "plan",
                        "active": true,
                        "aggregate_usage": null,
                        "amount": 200,
                        "amount_decimal": "200",
                        "billing_scheme": "per_unit",
                        "created": 1572535670,
                        "currency": "eur",
                        "interval": "day",
                        "interval_count": 1,
                        "livemode": false,
                        "metadata": {
                            "displayOrder": "1"
                        },
                        "nickname": "Daily",
                        "product": "prod_G5rGxKQ7dESQLU",
                        "tiers": null,
                        "tiers_mode": null,
                        "transform_usage": null,
                        "trial_period_days": null,
                        "usage_type": "licensed"
                    },
                    "quantity": 1,
                    "type": "plan"
                }
            ],
            "livemode": false,
            "locale": null,
            "mode": "subscription",
            "payment_intent": null,
            "payment_method_types": [
                "card"
            ],
            "setup_intent": null,
            "submit_type": null,
            "subscription": "sub_G6YQIjgYvPOkb6",
            "success_url": "http://localhost:4200/private/signupthanks?session_id={CHECKOUT_SESSION_ID}"
        }
    },
    "livemode": false,
    "pending_webhooks": 1,
    "request": {
        "id": "req_mGJtYmeY1mdSMH",
        "idempotency_key": null
    },
    "type": "checkout.session.completed",
    "createDate": "2019-11-02T12:02:34.870Z"
}
         */
    },

    customerSubscriptionCreated: (webhookEvent) => {
        return new Promise ( async (resolve, reject) => {
            try {
                // Subscription contains the subscription plan, which references the product.
                // Product contains comma-separated list of roles to enable in the metadata.
                const stripeProductId = webhookEvent.data.object.plan.product;
                //const stripeProduct = await webendpoints.getProductById({ productId: stripeProductId });
                //const rolesArray = stripeProduct.data.metadata.enablesRoles.split(',');
                //const stripeCustomer = await webendpoints.getCustomerById({ stripeCustomerId: webhookEvent.data.object.customer });

                const [ stripeProduct, stripeCustomer ] = await Promise.all([
                    webendpoints.getProductById({ productId: stripeProductId }),
                    webendpoints.getCustomerById({ stripeCustomerId: webhookEvent.data.object.customer })
                ]);

                // Metadata of stripeProduct has list of the objects with the Auth0 Roles to be assigned to the user
                const rolesArray = JSON.parse(stripeProduct.metadata.enablesRoles);
                const roleNamesArray = rolesArray.map( i => { return i.id; });

                const result = await auth0.setUserRoles({
                    auth0_sub_id: stripeCustomer.metadata.auth0_user_sub,
                    roles: roleNamesArray
                });

                return resolve ({});
            }
            catch (err) {
                return reject (err);
            }
        });

        /* Shape
 {
  id: 'evt_1FaLJKIU3sdNNsUymTFv9ryE',
  object: 'event',
  api_version: '2019-10-17',
  created: 1572696147,
  data: {
    object: {
      id: 'sub_G6YQIjgYvPOkb6',
      object: 'subscription',
      application_fee_percent: null,
      billing_cycle_anchor: 1572696147,
      billing_thresholds: null,
      cancel_at: null,
      cancel_at_period_end: false,
      canceled_at: null,
      collection_method: 'charge_automatically',
      created: 1572696147,
      current_period_end: 1572782547,
      current_period_start: 1572696147,
      customer: 'cus_G1FDQ1pNfLxvV2',
      days_until_due: null,
      default_payment_method: 'pm_1FaLJGIU3sdNNsUyYDFxJYNU',
      default_source: null,
      default_tax_rates: [],
      discount: null,
      ended_at: null,
      invoice_customer_balance_settings: [Object],
      items: [Object],
      latest_invoice: 'in_1FaLJHIU3sdNNsUy21yDeTwr',
      livemode: false,
      metadata: {},
      next_pending_invoice_item_invoice: null,
      pending_invoice_item_interval: null,
      pending_setup_intent: null,
      plan: [Object],
      quantity: 1,
      schedule: null,
      start_date: 1572696147,
      status: 'incomplete',
      tax_percent: null,
      trial_end: null,
      trial_start: null
    }
  },
  livemode: false,
  pending_webhooks: 1,
  request: { id: 'req_mGJtYmeY1mdSMH', idempotency_key: null },
  type: 'customer.subscription.created',
  createDate: 2019-11-02T12:02:33.566Z
}
         */
    },

    customerSubscriptionDeleted: (webhookEvent) => {
        return new Promise ( async (resolve, reject) => {
            try {
                const stripeProductId = webhookEvent.data.object.plan.product;

                const [ stripeProduct, stripeCustomer ] = await Promise.all([
                    webendpoints.getProductById({ productId: stripeProductId }),
                    webendpoints.getCustomerById({ stripeCustomerId: webhookEvent.data.object.customer })
                ]);

                // Metadata of stripeProduct has list of the objects with the Auth0 Roles to be assigned to the user
                const rolesArray = JSON.parse(stripeProduct.metadata.enablesRoles);
                const roleNamesArray = rolesArray.map( i => { return i.id; });

                const result = await auth0.removeUserRoles({
                    auth0_sub_id: stripeCustomer.metadata.auth0_user_sub,
                    roles: roleNamesArray
                });

                return resolve ({});
            }
            catch (err) {
                return reject (err);
            }
        });

        /* Shape
 {
  id: 'evt_1FaLJKIU3sdNNsUymTFv9ryE',
  object: 'event',
  api_version: '2019-10-17',
  created: 1572696147,
  data: {
    object: {
      id: 'sub_G6YQIjgYvPOkb6',
      object: 'subscription',
      application_fee_percent: null,
      billing_cycle_anchor: 1572696147,
      billing_thresholds: null,
      cancel_at: null,
      cancel_at_period_end: false,
      canceled_at: null,
      collection_method: 'charge_automatically',
      created: 1572696147,
      current_period_end: 1572782547,
      current_period_start: 1572696147,
      customer: 'cus_G1FDQ1pNfLxvV2',
      days_until_due: null,
      default_payment_method: 'pm_1FaLJGIU3sdNNsUyYDFxJYNU',
      default_source: null,
      default_tax_rates: [],
      discount: null,
      ended_at: null,
      invoice_customer_balance_settings: [Object],
      items: [Object],
      latest_invoice: 'in_1FaLJHIU3sdNNsUy21yDeTwr',
      livemode: false,
      metadata: {},
      next_pending_invoice_item_invoice: null,
      pending_invoice_item_interval: null,
      pending_setup_intent: null,
      plan: [Object],
      quantity: 1,
      schedule: null,
      start_date: 1572696147,
      status: 'incomplete',
      tax_percent: null,
      trial_end: null,
      trial_start: null
    }
  },
  livemode: false,
  pending_webhooks: 1,
  request: { id: 'req_mGJtYmeY1mdSMH', idempotency_key: null },
  type: 'customer.subscription.created',
  createDate: 2019-11-02T12:02:33.566Z
}
         */
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
