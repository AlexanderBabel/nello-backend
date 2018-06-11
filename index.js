try {
    require('./env');
} catch (err) {
    console.log('Could not load env.js');
    process.exit();
}

const app = require('express')();
const server = require('http').Server(app);
const bodyParser = require('body-parser');
const io = require('socket.io')(server);
const Chance = require('chance');

const chance = new Chance();
const clients = [];

app.use(bodyParser.json());
app.use(function (req, res, next) {
    for (const client of clients) {
        if (client.name === `/callback/${req.path}`) {
            client.socket.broadcast.emit('call', req.body);
            return;
        }
    }

    res.status(200).send('OK');
});
app.listen(process.env.REST_PORT);

io.on('connection', (socket) => {
    socket.on('getWebhook', (data) => {
        for (let i = 0; i < clients.length; i++) {
            if (data.locationId === clients[i].locationId) {
                clients[i].socket = socket;
                socket.broadcast.emit('webhook', {
                    url: `${process.env.HOST_NAME}/callback/${clients[i].name}`
                });
            }
        }

        const name = generateRandomWebhookName();
        clients.push({
            socket,
            name,
            locationId: data.locationId
        });

        socket.broadcast.emit('webhook', {
            url: `${process.env.HOST_NAME}/callback/${clients[i].name}`
        });
    });

    socket.on('disconnect', () => {
        let index = -1;
        for (let i = 0; i < clients.length; i++) {
            if (clients[i].socket === socket) {
                index = i;
            }
        }

        if (index !== -1) {
            clients.splice(index, 1);
        }
    });
});

function generateRandomWebhookName() {
    return `${chance.sentence({ words: 5 }).replace(/ /g, '-').toLowerCase().replace(/\./g, '')}-${chance.integer({ min: 0, max: 9999 })}`;
}