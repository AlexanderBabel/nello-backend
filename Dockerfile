FROM node:14-alpine

WORKDIR /usr/src/app
COPY package.json yarn.lock ./
RUN yarn --prod --network-timeout 100000
COPY . ./
CMD ["node", "index.js"]

LABEL org.opencontainers.image.source="https://github.com/alexanderbabel/nello-backend/"