FROM node:12-alpine

# update & setup
RUN apk update && apk upgrade && apk add bash git vim

# install ansible
#RUN apk add ansible

# intall aws cli
USER root
WORKDIR /tmp

RUN wget -q -O /etc/apk/keys/sgerrand.rsa.pub https://alpine-pkgs.sgerrand.com/sgerrand.rsa.pub && \
    wget https://github.com/sgerrand/alpine-pkg-glibc/releases/download/2.31-r0/glibc-2.31-r0.apk && \
    wget https://github.com/sgerrand/alpine-pkg-glibc/releases/download/2.31-r0/glibc-bin-2.31-r0.apk && \
    apk add glibc-2.31-r0.apk && \
    apk add glibc-bin-2.31-r0.apk

RUN apk add curl && \
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
    unzip awscliv2.zip && \
    ./aws/install

# install aws-cdk
RUN npm install -g aws-cdk

RUN mkdir -p /app
WORKDIR /app
