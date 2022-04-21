FROM --platform=linux/arm64 node:16-alpine3.14

# Create app directory
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --only=production --silent
RUN npm install pm2 -g
RUN npm audit fix
COPY start.sh app.json ./

COPY ./src ./src

CMD [ "npm", "start" ]
