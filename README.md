# CampusHub – Dockerized 9-Service Application

## Overview

CampusHub is a Dockerized campus event management application. It uses a multi-container architecture to manage events, registrations, background email processing, caching and image storage.

The application is containerized using Docker and orchestrated using Docker Compose.

## Architecture

The application consists of nine services:

1. Gateway – Nginx reverse proxy
2. Frontend – React application
3. API – Node.js and Express backend
4. Worker – Background email processing
5. PostgreSQL – Relational database
6. Redis – Caching
7. RabbitMQ – Message queue
8. MinIO-compatible object storage – Image storage
9. MailHog – Email testing

### Architecture Flow

```text
                   Browser
                      |
                      v
              Gateway (Nginx)
                 Port 8080
                      |
          +-----------+-----------+
          |           |           |
          v           v           v
       Frontend      API       Object Storage
       React       Express        MinIO
                      |
           +----------+----------+
           |          |          |
           v          v          v
       PostgreSQL   Redis     RabbitMQ
                                  |
                                  v
                                Worker
                                  |
                                  v
                               MailHog
```

### Gateway Routing

| Route | Destination |
|---|---|
| `/` | Frontend |
| `/api/` | API |
| `/storage/` | Object Storage |

Only the gateway is exposed publicly on port 8080.

MailHog and RabbitMQ management interfaces are bound to localhost for local testing.

## Technology Stack

- Docker and Docker Compose
- Nginx
- React
- Node.js
- Express.js
- PostgreSQL 16
- Redis 7
- RabbitMQ 3
- MinIO-compatible object storage
- MailHog

## Project Structure

```text
MSE-2-mock-SSED-main/
│
├── app/
│   ├── api/
│   │   ├── src/
│   │   │   ├── clients.js
│   │   │   ├── migrate.js
│   │   │   ├── queue.js
│   │   │   ├── server.js
│   │   │   └── worker.js
│   │   ├── Dockerfile
│   │   └── .dockerignore
│   │
│   ├── frontend/
│   │   ├── Dockerfile
│   │   └── .dockerignore
│   │
│   └── nginx.conf
│
├── .env.example
├── .gitignore
├── docker-compose.yml
├── grade.sh
└── README.md
```

## Setup Instructions

### Prerequisites

- Docker Desktop
- Docker Compose
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/jermgaming/MSE-2-mock-SSED.git
cd MSE-2-mock-SSED
```

### 2. Configure Environment Variables

Copy the example environment file:

**Windows PowerShell:**

```powershell
Copy-Item .env.example .env
```

**Linux/macOS:**

```bash
cp .env.example .env
```

Update the placeholder values in `.env`, including:

- PGPASSWORD
- REDIS_PASSWORD
- RABBITMQ_PASS
- MINIO_SECRET_KEY

Keep `.env` private and never commit it to Git.

### 3. Build and Start Services

```bash
docker compose up -d --build --wait
```

### 4. Verify Running Containers

```bash
docker compose ps
```

All nine services should be running and their configured healthchecks should pass.

### 5. Access the Application

| Component | URL |
|---|---|
| CampusHub application | http://localhost:8080 |
| API health endpoint | http://localhost:8080/api/health |
| MailHog interface | http://localhost:8025 |
| RabbitMQ management | http://localhost:15672 |

RabbitMQ management credentials are configured in `.env`.

## Docker Configuration

### Frontend

The frontend uses a multi-stage Docker build.

- Builder stage uses Node.js 20 Alpine.
- Dependencies are installed and the production build is generated.
- The generated `dist/` directory is copied into an unprivileged Nginx image.
- The frontend runs as the nginx user.

### API and Worker

The API uses a Node.js 20 Alpine image.

- Production dependencies are installed.
- The image runs as the non-root `node` user.
- The API starts using `npm start`.
- The worker reuses the same API image and runs `node src/worker.js`.

### Docker Compose

Docker Compose manages all nine services.

Configuration includes:

- Dedicated bridge networks.
- Healthchecks for service readiness.
- Persistent named volumes.
- Restart policies.
- CPU and memory resource limits.
- Environment-based credentials.
- Service dependency conditions.

### Networks

Three bridge networks are configured:

| Network | Connected Services |
|---|---|
| frontend | Gateway, Frontend |
| backend | API, Worker, Redis, RabbitMQ, MailHog |
| data | Gateway, API, PostgreSQL, Object Storage |

The networks provide service isolation and controlled communication.

### Persistent Volumes

| Volume | Purpose |
|---|---|
| postgres_data | PostgreSQL database persistence |
| minio_data | Uploaded image persistence |

Data remains available after containers are removed and recreated using `docker compose down` followed by `docker compose up`.

**Important:** Avoid `docker compose down -v` when you want to preserve persistent data.

## Application Workflows

### Event Registration and Email Delivery

1. A user registers for an event.
2. The API validates the name and email.
3. Registration details are saved in PostgreSQL.
4. The API publishes an email message to RabbitMQ.
5. The background worker consumes the message.
6. The worker sends the confirmation email to MailHog.

### Redis Caching

1. The API checks Redis for cached event data.
2. If data exists, Redis returns the cached response (`HIT`).
3. If data does not exist, the API fetches data from PostgreSQL (`MISS`).
4. The result is cached in Redis for 30 seconds.
5. Registration and image upload invalidate the events cache.

### Image Upload

1. A user uploads an event image.
2. The API receives the multipart image request.
3. The image is stored in object storage.
4. The image URL is saved in PostgreSQL.
5. Nginx routes `/storage/` requests to object storage.

## Security Measures

- Non-root execution for API, Worker, Frontend and Gateway.
- Environment variables used for credentials.
- `.env` excluded through `.gitignore` and `.dockerignore`.
- Internal services are not publicly exposed.
- Only Gateway is bound to all host interfaces.
- RabbitMQ management and MailHog interfaces are bound to localhost.
- Dedicated Docker networks provide service isolation.

## Design Decisions

### 1. Multi-Stage Frontend Build

A multi-stage build separates the Node.js build environment from the production Nginx runtime.

This reduces unnecessary build dependencies in the final image and allows the frontend to run using an unprivileged Nginx server.

### 2. Shared API and Worker Image

The API and Worker use the same Docker image because they share the same application code and dependencies.

Different startup commands allow them to perform separate responsibilities without maintaining duplicate Dockerfiles.

### 3. Network Segmentation and Persistent Volumes

Three dedicated networks isolate frontend, backend and data services.

Named volumes preserve PostgreSQL and object storage data across container recreation.

## Testing and Verification

The following checks were performed:

| Test | Expected Result |
|---|---|
| Docker Compose startup | All nine services healthy |
| API health endpoint | HTTP 200 |
| Frontend routing | Application loads |
| Events API | Seeded events returned |
| Redis caching | Second request returns HIT |
| Event registration | HTTP 202 |
| RabbitMQ messaging | Registration message queued |
| Worker email processing | Confirmation email received |
| Image upload | HTTP 201 |
| Image retrieval | HTTP 200 |
| PostgreSQL persistence | Registration survives down/up |
| Object storage persistence | Uploaded image survives down/up |
| Non-root execution | API, Worker, Frontend and Gateway run without root |
| Port exposure | Only Gateway exposed on all interfaces |
| API image size | Below 250 MB |
| Secrets configuration | No hardcoded credentials in Compose |

## Useful Commands

Start services:

```bash
docker compose up -d --build --wait
```

View running containers:

```bash
docker compose ps
```

View logs:

```bash
docker compose logs -f
```

View API logs:

```bash
docker compose logs -f api
```

Stop containers while preserving volumes:

```bash
docker compose down
```

Rebuild services:

```bash
docker compose up -d --build
```

## Cleanup

To stop containers and remove persistent volumes:

```bash
docker compose down -v
```

**Warning:** This permanently removes the PostgreSQL and object storage volumes.

---

**Project:** CampusHub – Dockerized 9-Service Application

**Purpose:** Demonstrate Docker containerization, service orchestration, networking, healthchecks, persistent storage, caching, asynchronous messaging and container security.