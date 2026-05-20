FROM node:22-bookworm-slim

RUN apt-get update && \
  apt-get install -y \
  ffmpeg && \
  apt-get upgrade -y && \
  rm -rf /var/lib/apt/lists/*

COPY package.json .

RUN npm install

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
