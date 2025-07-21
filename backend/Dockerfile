FROM node:18-alpine

RUN apk add --no-cache ffmpeg

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN mkdir -p temp

EXPOSE 3000

CMD ["npm", "start"]