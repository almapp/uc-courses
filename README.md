# UC Courses REST API

[![Build Status][ci-image]][ci-url] [![dependencies][dependencies-image]][dependencies-url] [![dev-dependencies][dev-dependencies-image]][dev-dependencies-url]

## Development

### Prerequisites

*   Node 5.3.x or newer
*   MongoDB installed and running

### Preparation

Clone this repository:

```sh
git clone https://github.com/almapp/uc-courses.git
cd uc-courses
```

Install dependencies:

```sh
npm install
```

Run:

```sh
npm run develop
```

This will start the application and will be accessible on [`http://localhost:3000/`](http://localhost:3000/).

### Test

Run test suite with:

```sh
npm test
```

## Production

### Prerequisites

*   Docker
*   Docker-Compose

### Setup

Clone this repository:

```sh
git clone https://github.com/almapp/uc-courses.git
cd uc-courses
```

Set the environment variables:

```sh
export NODE_ENV=production

# Optional:
# Perform a GET to this endpoint to manually start the scraping
export SECRET_ENDPOINT=secret_route
```

Change the exposed endpoint on `docker-compose.yml` like this:

```yml
web:
  build: .
  ports:
    - "80:3000"
  # ...
```

Start with:

```sh
docker-compose up -d
```

See the logs with:

```sh
docker-compose logs
```

[ci-image]: https://travis-ci.org/almapp/uc-courses.svg
[ci-url]: https://travis-ci.org/almapp/uc-courses
[dependencies-image]: https://david-dm.org/almapp/uc-courses.svg
[dependencies-url]: https://david-dm.org/almapp/uc-courses
[dev-dependencies-image]: https://david-dm.org/almapp/uc-courses/dev-status.svg
[dev-dependencies-url]: https://david-dm.org/almapp/uc-courses#info=devDependencies
