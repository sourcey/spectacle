FROM node:20-alpine
ARG SOURCEY_VERSION=latest
RUN npm install -g "sourcey@${SOURCEY_VERSION}" && npm cache clean --force
WORKDIR /docs
ENTRYPOINT ["sourcey"]
CMD ["build"]
LABEL org.opencontainers.image.title="Sourcey" \
      org.opencontainers.image.description="Open source documentation platform" \
      org.opencontainers.image.url="https://sourcey.com" \
      org.opencontainers.image.source="https://github.com/sourcey/sourcey"
