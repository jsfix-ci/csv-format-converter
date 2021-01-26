FROM node:14

ENTRYPOINT ["bash", "/entrypoint.sh"]
CMD ["npm", "start"]

ARG NPM_TOKEN

WORKDIR /app
COPY . /app
COPY .npmrc.docker .npmrc
RUN set -ex && \
  npm ci && \
  rm .npmrc && \
  npm run build && \
  mv entrypoint.sh /
