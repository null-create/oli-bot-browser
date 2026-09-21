# Convenience commands for local development and testing of the agent
PHONY: init clean test run stop restart build rebuild

init:
	@echo "Initializing project for development..."
	@npm install

clean:
	@echo "Cleaning up..."
	@rm -rf ./dist ./node_modules

test:
	@echo "Running tests..."
	@npm run test

run:
	@echo "Running agent in container with API server..."
	@docker compose up -d

stop:
	@echo "Stopping Agent..."
	@docker compose down

restart: 
	@echo "Restarting Agent..."
	@make stop
	@make run

build:
	@echo "Building and running agent..."
	@docker compose up -d --build

rebuild:
	@echo "Rebuilding Agent..."
	@make stop
	@make build
