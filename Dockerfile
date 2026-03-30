FROM node:20-alpine
RUN npm install -g sourcey@latest
WORKDIR /docs
ENTRYPOINT ["sourcey"]
CMD ["build"]
LABEL org.opencontainers.image.title="Sourcey" \
      org.opencontainers.image.description="Open source documentation platform" \
      org.opencontainers.image.url="https://sourcey.com" \
      org.opencontainers.image.source="https://github.com/sourcey/sourcey"
