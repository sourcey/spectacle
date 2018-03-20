NAME    := sourcey/spectacle
VERSION := $$(git describe --tags `git rev-list --tags --max-count=1`)

build:
	docker build -t ${NAME}:latest -t ${NAME}:v${VERSION} .

push:
	@echo ${NAME}
	@docker push ${NAME}

login:
	@docker log -u ${DOCKER_USER} -p ${DOCKER_PASS}
