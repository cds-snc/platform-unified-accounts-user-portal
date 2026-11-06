FROM node:26-alpine@sha256:20c29f6abefc3dffbdcae5677e4ee5dd0c45073a24ff6f5a7f25010b825f0a7b AS base

ARG GIT_SHA

ENV PORT=3000
ENV NODE_ENV=production
ENV NEXT_OUTPUT_STANDALONE=true
ENV CI=true
ENV GIT_SHA=$GIT_SHA
COPY . /src
WORKDIR /src

RUN npm install --global corepack@0.36.0 && corepack enable
RUN pnpm install
RUN pnpm build

FROM node:26-alpine@sha256:20c29f6abefc3dffbdcae5677e4ee5dd0c45073a24ff6f5a7f25010b825f0a7b AS final
LABEL maintainer="-"

ARG GIT_SHA

ENV NODE_ENV=production
ENV GIT_SHA=$GIT_SHA

WORKDIR /src

COPY --from=base /src/public ./public
COPY --from=base /src/package.json ./package.json
COPY --from=base /src/.next/standalone ./
COPY --from=base /src/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]