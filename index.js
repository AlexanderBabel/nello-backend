const app = require('express')();
const bodyParser = require('body-parser');
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const Chance = require('chance');

const chance = new Chance();
const clients = [];

function generateRandomWebhookName() {
  return `${chance
    .sentence({ words: 5 })
    .replace(/ /g, '-')
    .toLowerCase()
    .replace(/\./g, '')}-${chance.integer({ min: 0, max: 9999 })}`;
}

app.use(bodyParser.json());
app.use((req, res) => {
  const client = clients.find(c => `/callback/${c.name}` === req.path);
  if (!client) {
    res.status(404).send('Not Found');
    return;
  }

  client.socket.emit('call', req.body);
  res.status(200).send('OK');
});

io.on('connection', socket => {
  socket.on('getWebhook', () => {
    const name = generateRandomWebhookName();
    clients.push({
      socket,
      name
    });

    const { 'x-forwarded-proto': proto, host } = socket.handshake.headers;

    socket.emit('webhook', {
      url: `${proto}://${process.env.HOST || host}/callback/${name}`
    });
  });

  socket.on('disconnect', () => {
    let index = -1;
    for (let i = 0; i < clients.length; i += 1) {
      if (clients[i].socket === socket) {
        index = i;
      }
    }

    if (index !== -1) {
      clients.splice(index, 1);
    }
  });
});

server.listen(process.env.PORT);
