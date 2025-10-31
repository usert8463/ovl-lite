FROM node:lts-buster

RUN git clone https://github.com/usert8463/ovl-lite /root/ovl-lite

WORKDIR /root/ovl-lite

COPY package.json .
RUN npm i
COPY . .

EXPOSE 8000

CMD ["npm","run","start"]
