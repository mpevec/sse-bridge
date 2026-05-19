FROM oven/bun:slim
WORKDIR /app
ENV NODE_ENV=production
COPY --chown=bun:bun dist/index.js dist/index.js.map /app/
USER bun
CMD ["bun", "/app/index.js"]
