FROM node:16-alpine

# Install packages
RUN apk update && apk add --update --no-cache \
    git \
    bash \
    curl \
    openssh \
    python3 \
    py3-pip \
    py-cryptography \
    wget \
    jq

RUN apk --no-cache add --virtual builds-deps build-base python3

# Update NPM
RUN npm config set unsafe-perm true
RUN npm update -g

# Install AWSCLI
RUN pip install --upgrade pip && \
    pip install --upgrade awscli

# Install Serverless Framework
RUN npm install -g redis-commander

ENV SERVICE_USER=redis
ENV HOME=/redis-commander
ENV NODE_ENV=production

WORKDIR /redis-commander

COPY startup.sh ./

CMD ["/redis-commander/startup.sh"]
