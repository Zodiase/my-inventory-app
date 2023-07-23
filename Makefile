IMG_TAG ?= $(shell date +%s)

.PHONY: image
image:
	docker build . --file Dockerfile --tag zodiase/my-inventory-app:${IMG_TAG}

.PHONY: push-image
push-image:
	docker push zodiase/my-inventory-app:${IMG_TAG}

.PHONY: up
up:
	docker-compose up -d meteorapp

.PHONY: shell
shell:
	docker-compose run --rm -it --service-ports --entrypoint /bin/bash meteorapp

.PHONY: help
help:
	@echo "Usage: make [target]"
	@echo "Targets:"
	@echo "  image       Build the Docker image"
	@echo "  help        Show this help message"
