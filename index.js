try {
    require('./env');
} catch (err) {
    console.log('Could not load env.js');
    process.exit();
}

const app = require('express')();
const bodyParser = require('body-parser');
const io = require('socket.io')(process.env.SOCKET_PORT);
const Chance = require('chance');

const chance = new Chance();
const clients = [];

app.use(bodyParser.json());
app.use(function (req, res, next) {
    for (const client of clients) {
        if (`/callback/${client.name}` === req.path) {
            client.socket.broadcast.emit('call', req.body);
            return;
        }
    }

    res.status(200).send('OK');
});
app.listen(process.env.REST_PORT);

io.on('connection', (socket) => {
    socket.on('getWebhook', (data) => {
        const name = generateRandomWebhookName();
        clients.push({
            socket,
            name,
        });

        socket.emit('webhook', {
            url: `${process.env.HOST_NAME}/callback/${name}`
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