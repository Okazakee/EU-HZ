dev-backend:
	cd apps/api && go run ./cmd/api serve

worker-once:
	cd apps/api && go run ./cmd/api ingest-once

worker-loop:
	cd apps/api && go run ./cmd/api ingest-loop

migrate-up:
	cd apps/api && go run ./cmd/api migrate-up

seed:
	cd apps/api && go run ./cmd/api seed

cleanup:
	cd apps/api && go run ./cmd/api cleanup

docker-up:
	docker compose -f infra/docker-compose.yml up -d

docker-down:
	docker compose -f infra/docker-compose.yml down

docker-up-backend:
	docker compose --env-file .env -f infra/docker-compose.backend.yml up -d --build

docker-down-backend:
	docker compose --env-file .env -f infra/docker-compose.backend.yml down
