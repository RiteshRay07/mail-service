FROM node:alpine

WORKDIR /mail_service

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5000

CMD ["npm", "run", "producer"]