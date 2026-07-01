FROM golang:1.26-alpine AS build

WORKDIR /src

COPY apps/api/go.mod apps/api/go.sum ./apps/api/
RUN cd apps/api && go mod download

COPY apps/api ./apps/api
COPY db ./db

RUN cd apps/api && CGO_ENABLED=0 GOOS=linux go build -o /out/eu-hz-api ./cmd/api

FROM alpine:3.22

WORKDIR /app/apps/api

COPY --from=build /out/eu-hz-api ./eu-hz-api
COPY db /app/db

EXPOSE 8080

CMD ["./eu-hz-api", "serve"]
