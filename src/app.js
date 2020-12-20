require('dotenv-safe').config({
    path: process.env.DOTENV_PATH ? process.env.DOTENV_PATH : '.env'
});

const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const cors = require ('cors');
const compression = require('compression');
const logger = require('morgan');
const path = require('path');
const createError = require('http-errors');
const debug = require('debug')('pronto-stack:server');

const app = express();

app.use(helmet());
app.use(cookieParser());
app.use(compression());

app.use(logger('dev'));

app.use(cors());
app.options('*', cors());

var jwt = require('express-jwt');
var jwks = require('jwks-rsa');

var jwtCheck = jwt({
    secret: jwks.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: 'https://' + process.env.AUTH0_DOMAIN + '/.well-known/jwks.json'
    }),
    audience: process.env.AUDIENCE,
    issuer: process.env.ISSUER,
    algorithms: ['RS256']
});

const webhooks = require ('./routes/webhooks');
const webendpoints = require ('./routes/webendpoints');

// Webhook Stripe validation requires raw buffer
const rawBodyParser = bodyParser.raw({type: '*/*'});
app.use('/payments/webhooks', rawBodyParser, webhooks);

// Traditional website calls work with JSON
const jsonBodyParser = bodyParser.json({ limit: '50mb'});
const urlencodedBodyParser = bodyParser.urlencoded({ extended: false });
app.use('/payments/webendpoints', jsonBodyParser, urlencodedBodyParser, /*jwtCheck, */webendpoints);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    //res.render('error');

    res.json( {statusCode: err.status, message: err.message})
});

const server = app.listen(parseInt(process.env.REST_SERVER_PORT), () => {
    console.log("Server running on port", process.env.REST_SERVER_PORT);
});

server.on('error', onError);
server.on('listening', onListening);

function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }

    var bind = typeof parseInt(process.env.REST_SERVER_PORT) === 'string'
        ? 'Pipe ' + parseInt(process.env.REST_SERVER_PORT)
        : 'Port ' + parseInt(process.env.REST_SERVER_PORT);

    // handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            console.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(bind + ' is already in use');
            process.exit(1);
            break;
        default:
            throw error;
    }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
    var addr = server.address();
    var bind = typeof addr === 'string'
        ? 'pipe ' + addr
        : 'port ' + addr.port;
    debug('Listening on ' + bind);
}
