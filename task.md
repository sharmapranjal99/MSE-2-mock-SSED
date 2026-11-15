# CampusHub Docker Hands-On Tasks

## 1. Frontend Dockerfile

-   Create a multi-stage Dockerfile for `app/frontend`.
-   Use Node.js to build the React application.
-   Use an unprivileged Nginx image in the final stage to serve the
    build.
-   Ensure the final image does not contain Node.js or `node_modules`.
-   Run the container as a non-root user.
-   Add a `HEALTHCHECK`.

## 2. API and Worker Dockerfile

-   Create one Dockerfile for `app/api` that can be used by both the API
    and worker services.
-   Use a slim or Alpine base image with a pinned version tag.
-   Order dependency installation to make effective use of Docker layer
    caching.
-   Install production dependencies only.
-   Run the container as a non-root user.
-   Add an API `HEALTHCHECK`.
-   Set `npm start` as the default command.

## 3. Build Hygiene

-   Add a `.dockerignore` file for each build context.
-   Exclude at least `node_modules`, `.env`, and `.git`.

## 4. Docker Compose Orchestration

-   Create a single `docker-compose.yml` at the repository root.
-   Configure all nine services:
    -   Gateway
    -   Frontend
    -   API
    -   Worker
    -   PostgreSQL database
    -   Redis
    -   RabbitMQ
    -   MinIO
    -   MailHog
-   Reuse the API image for the worker and configure the worker command
    appropriately.
-   Configure the worker so it does not inherit an unsuitable API health
    check.
-   Create and assign the required `frontend`, `backend`, and `data`
    networks.
-   Connect each service only to the networks it needs.
-   Use named volumes for PostgreSQL and MinIO data.
-   Configure service startup dependencies using `depends_on` with
    `condition: service_healthy` for the database, Redis, RabbitMQ, and
    MinIO.
-   Write working health checks for PostgreSQL, Redis, RabbitMQ, and
    MinIO.
-   Add a restart policy to every service.
-   Set CPU and memory limits for every service.
-   Publish only the gateway on all host interfaces.
-   If needed for local screenshots, publish the MailHog UI, RabbitMQ
    UI, and MinIO console on `127.0.0.1` only.

## 5. Configuration and Secrets

-   Configure services using variables from `.env` through `env_file` or
    variable substitution.
-   Use the variable names provided in `.env.example`.
-   Do not hardcode passwords, keys, or hostnames in
    `docker-compose.yml`.
-   Add `.env` to `.gitignore` and `.dockerignore`.
-   Keep `.env.example` committed with placeholder values only.
-   Ensure no real secrets are included in committed files.
-   Configure the API to run database migrations and seed the database
    automatically when the stack starts.
-   Verify the migration through the API logs.

## 6. Gateway and Networking

-   Configure Nginx as the gateway and single public entry point.
-   Route `/` to the frontend.
-   Route `/api/` to the API.
-   Route `/storage/` to the MinIO bucket at `minio:9000/campushub/`.
-   Ensure uploaded event images can be displayed in the browser.
-   Ensure image uploads of up to 4 MB work through the gateway.
-   Configure and verify the proxy upload-size limit.
-   Verify that no service other than the gateway is exposed on public
    host interfaces.

## 7. README

-   Create `README.md`.
-   Explain how to run the stack.
-   Include a short architecture sketch or service list.
-   Document three design decisions and the reason for each.

## 8. Final Verification

-   Start the complete stack using
    `docker compose up -d --build --wait`.
-   Verify that all nine containers are healthy.
-   Verify the health endpoint through the gateway.
-   Verify that the frontend loads at `/`.
-   Verify that the events list is returned and subsequently served from
    the cache.
-   Verify that a registration is accepted, queued, and its email
    arrives in MailHog.
-   Verify that an uploaded image is served from `/storage/`.
-   Verify that data survives `docker compose down` followed by
    `docker compose up`.
-   Verify that the API, worker, frontend, and gateway run as non-root
    users.
-   Verify that only one port is published publicly.
-   Verify that the API image is under 250 MB.
-   Verify that no secrets are hardcoded.
-   Verify the test cases by running grade.sh file

## 9. Optional Enhancements

-   Add Compose profiles or an override file to separate development and
    production behaviour.
-   Generate a vulnerability scan report for the API image and apply two
    fixes.
-   Tag the image with a version and write a release note explaining how
    it could be pushed to a registry.
-   Explain how monitoring could be added to the stack.
