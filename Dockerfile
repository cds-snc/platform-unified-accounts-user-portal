FROM node:24-alpine@sha256:2bdb65ed1dab192432bc31c95f94155ca5ad7fc1392fb7eb7526ab682fa5bf14 AS base

ARG GIT_SHA

ENV PORT=3000
ENV NODE_ENV=production
ENV NEXT_OUTPUT_STANDALONE=true
ENV NEXT_PUBLIC_BASE_PATH=/ui/v2
ENV CI=true
ENV GIT_SHA=$GIT_SHA
COPY . /src
WORKDIR /src

RUN corepack enable
RUN pnpm install
RUN pnpm build

FROM node:24-alpine@sha256:2bdb65ed1dab192432bc31c95f94155ca5ad7fc1392fb7eb7526ab682fa5bf14 AS final
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