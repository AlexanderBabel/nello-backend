/* eslint-disable no-param-reassign, no-console */
const crypto = require('crypto');
const http = require('http');
const express = require('express');
const socketIo = require('socket.io');
const { version } = require('./package.json');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const clients = {};

const { PORT } = process.env;

const NELLO_HMAC_HEADER = 'x-nello-hook-hmac';

function generateRandomWebhookName() {
  return crypto.randomBytes(32).toString('hex');
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
    url: `${proto}://${process.env.WEBHOOK_HOST || host}/callback/${socket.callbackName}`,
  });
}

app.use(express.text({ type: '*/*' }));

app.get('/', (req, res) => {
  res.send(`
    <center style="margin-top: 40px;">
      <h1>Nello Relay Backend</h1>
      <h2>for <a href="https://github.com/lukasroegner/homebridge-nello">homebridge-nello</a></h2>
      <br />
      <strong>Version ${version || process.env.npm_package_version}</strong><br />
      You can find the code for this project on <a href="https://github.com/AlexanderBabel/nello-backend">GitHub</a>.
    </center>
  `);
});

app.put('/callback/:clientId', (req, res) => {
  const client = clients[req.params.clientId];

  if (!client) {
    res.status(404).send('Not Found');
    return;
  }

  const jsonString = req.body;
  const header = req.header(NELLO_HMAC_HEADER);

  try {
    client.emit('call', {
      ...JSON.parse(req.body),
      rawBody: jsonString,
      hmacSignature: header,
    });
  } catch (e) {
    console.error('Error parsing/emitting webhook data', e);
  }

  res.status(200).send('OK');
});

io.on('connection', (socket) => {
  handleWebhook(socket);

  socket.on('getWebhook', () => {
    handleWebhook(socket);
  });

  socket.on('disconnect', () => {
    if (socket.callbackName) {
      delete clients[socket.callbackName];
    }
  });
});

server.listen(PORT);
