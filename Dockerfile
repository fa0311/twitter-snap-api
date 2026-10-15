FROM node:24 AS node-build
WORKDIR /app

RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm i --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:24 AS runtime
WORKDIR /app

COPY .temp/ffmpeg /opt/ffmpeg
ENV PATH="/opt/ffmpeg/bin:${PATH}"
ENV LD_LIBRARY_PATH="/opt/ffmpeg/lib:${LD_LIBRARY_PATH}"

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm i --frozen-lockfile --prod

COPY --from=node-build /app/dist ./dist

HEALTHCHECK --interval=15m --timeout=60s --start-period=30s --retries=1 \
    CMD curl -S --fail "http://127.0.0.1:3000/health/encoder?codec=libx264&format=mp4"
EXPOSE 3000
ENTRYPOINT ["pnpm","start"]
