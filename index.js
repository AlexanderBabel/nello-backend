try {
    require('./env');
} catch (err) {
    console.log('Could not load env.js');
    process.exit();
}

const Koa = require('koa');
const koaBody = require('koa-body');
const io = require('socket.io')(process.env.SOCKET_PORT);
const Chance = require('chance');

const app = new Koa();
const chance = new Chance();
const clients = [];

app.use(koaBody());
app.use((ctx) => {
    for (const client of clients) {
        if (client.name === `/callback/${ctx.request.path}`) {
            client.socket.broadcast.emit('call', ctx.request.body);
            return;
        }
    }

    ctx.body = "OK";
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