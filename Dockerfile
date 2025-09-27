FROM node:22 AS node-build
WORKDIR /app

RUN npm i -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm i --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:22 AS runtime
WORKDIR /app

COPY .temp/ffmpeg /opt/ffmpeg
ENV PATH="/opt/ffmpeg/bin:${PATH}"
ENV LD_LIBRARY_PATH="/opt/ffmpeg/lib:${LD_LIBRARY_PATH}"

RUN npm i -g pnpm

COPY package.json pnpm-lock.yaml ./
RUN pnpm i --frozen-lockfile --prod

COPY --from=node-build /app/dist ./dist

EXPOSE 3000
ENTRYPOINT ["pnpm","start"]
