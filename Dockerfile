FROM nginx:latest

RUN apt-get update \
    && curl -sL https://deb.nodesource.com/setup_6.x -o nodesource_setup.sh \
    && apt-get install -y nodejs \
    && apt-get install -y build-essential \
    && curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add - \
    && echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list \
    && apt-get update \
    && apt-get install -y yarn \
    && apt-get install -y vim \
    && apt-get install -y procps \
    && apt-get install net-tools

WORKDIR /

COPY ./package.json /
COPY ./yarn.lock /
COPY ./nginx.conf /etc/nginx/nginx.conf

RUN yarn install

COPY . /

# EXPOSE 3000
EXPOSE 8080

CMD ["yarn", "start", "&&", "nginx-debug", "-g", "daemon off;"] 