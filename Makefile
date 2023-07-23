IMG_TAG ?= $(shell date +%s)

.PHONY: image
image:
	docker build . --file Dockerfile --tag zodiase/my-inventory-app:${IMG_TAG}

.PHONY: help
help:
	@echo "Usage: make [target]"
	@echo "Targets:"
	@echo "  image       Build the Docker image"
	@echo "  help        Show this help message"
