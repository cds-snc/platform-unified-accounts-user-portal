FROM node:24-alpine@sha256:6a1c190e17215d844926b0677f4bf87273ff7d5e54db06d3b5b5863ab0b09a3d AS base

ARG GIT_SHA

ENV PORT=3000
ENV NODE_ENV=production
ENV NEXT_OUTPUT_STANDALONE=true
ENV CI=true
ENV GIT_SHA=$GIT_SHA
COPY . /src
WORKDIR /src

RUN corepack enable
RUN pnpm install
RUN pnpm build

FROM node:24-alpine@sha256:6a1c190e17215d844926b0677f4bf87273ff7d5e54db06d3b5b5863ab0b09a3d AS final
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