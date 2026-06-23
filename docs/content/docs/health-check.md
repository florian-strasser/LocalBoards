# Health Check

LocalBoards exposes a public health endpoint so you can monitor whether an instance is up and able to reach its database. This is useful for Docker, Docker Compose, reverse proxies, load balancers, and uptime monitors.

## The endpoint

```
GET /api/health
```

It is public (no authentication) and performs a lightweight `SELECT 1` against the database.

When the app is running and can reach its database it responds with HTTP `200`:

```json
{ "status": "ok", "database": "ok" }
```

If the database is unreachable it responds with HTTP `503`:

```json
{ "status": "error", "database": "unreachable" }
```

No internal details are leaked in either case.

## Docker

The official Docker image already declares a `HEALTHCHECK` against this endpoint, so you don't need to configure anything. Container health shows up automatically:

```bash
docker ps
# STATUS shows e.g. "Up 2 minutes (healthy)"
```

The check uses Node's built-in `fetch`, so no extra tools (like `curl`) are required inside the image. It allows a short start-up grace period for the server to boot and apply database migrations before the first probe.

## Docker Compose

Because the image ships its own health check, Compose reports it without extra configuration. You can also use it to gate dependent services:

```yaml
services:
  app:
    image: localboards/localboards:latest
    # ...
  db:
    image: mysql:8
    # ...

  # Example: only start something after the app is healthy
  some-dependent-service:
    depends_on:
      app:
        condition: service_healthy
```

## Uptime monitoring

Point any monitor (UptimeRobot, Better Stack, a Kubernetes readiness probe, a load-balancer health check, etc.) at `https://your-domain/api/health` and treat a non-`200` response as unhealthy. Because the check also verifies database connectivity, it catches the common failure mode where the app process is alive but its database has gone away.
