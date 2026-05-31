FROM node:lts-bookworm-slim

RUN apt-get update && \
  apt-get upgrade -y && \
  apt-get install -y --no-install-recommends ffmpeg stockfish && \
  rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json .
RUN npm install
COPY . .

EXPOSE 5000
CMD ["npm", "start"]