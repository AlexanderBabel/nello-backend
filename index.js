/* eslint-disable no-param-reassign */
const app = require('express')();
const bodyParser = require('body-parser');
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const Chance = require('chance');

const chance = new Chance();
const clients = {};

function generateRandomWebhookName() {
  return `${chance
    .sentence({ words: 5 })
    .replace(/ /g, '-')
    .toLowerCase()
    .replace(/\./g, '')}-${chance.integer({ min: 0, max: 9999 })}`;
}

function handleWebhook(socket) {
  if (Date.now() - socket.lastUpdate < 10000) {
    return;
  }

  if (!socket.callbackName) {
    socket.callbackName = generateRandomWebhookName();
    clients[socket.callbackName] = socket;
    socket.lastUpdate = Date.now();
  }

  const { 'x-forwarded-proto': proto, host } = socket.handshake.headers;

  socket.emit('webhook', {
    url: `${proto}://${process.env.HOST || host}/callback/${socket.callbackName}`
  });
}

app.use(bodyParser.json());
app.use((req, res) => {
  const client = clients[req.path.replace('/callback/', '')];
  if (!client) {
    res.status(404).send('Not Found');
    return;
  }

  client.emit('call', req.body);
  res.status(200).send('OK');
});

io.on('connection', socket => {
  handleWebhook(socket);
  socket.on('getWebhook', () => handleWebhook(socket));

  socket.on('disconnect', () => {
    if (socket.callbackName) {
      delete clients[socket.callbackName];
    }
  });
});

server.listen(process.env.PORT);
