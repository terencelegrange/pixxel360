# Pixxel360

**360° Asset Security Posture & Governance Platform**

Pixxel360 provides unified security posture management, compliance oversight, asset governance, and audit trails. It offers a secure, self-hosted web application with role-based access controls, comprehensive audit logging, dynamic feature flags, and dual database support (SQLite and MySQL/MariaDB).

Docker Hub: [`tlgrange/pixxel360`](https://hub.docker.com/r/tlgrange/pixxel360)  
Source: [github.com/terencelegrange/pixxel360](https://github.com/terencelegrange/pixxel360)

---

## Quick Start

Pixxel360 supports multi-architecture deployments (`linux/amd64` and `linux/arm64`) with zero upfront configuration required. If no database is configured, Pixxel360 launches in SQLite trial mode with a built-in setup wizard.

### Option A — SQLite trial mode (Standalone)

No separate database required. All persistent state is saved in the `/app/data` volume.

```bash
docker run -d \
  --name pixxel360 \
  -p 3333:3333 \
  -v pixxel360-data:/app/data \
  -e DB_TYPE=sqlite \
  tlgrange/pixxel360:latest
```

Open [http://localhost:3333](http://localhost:3333) in your browser to access the setup wizard or log in.

### Option B — MySQL / MariaDB (Production)

Connect Pixxel360 to an existing MySQL / MariaDB instance:

```bash
docker run -d \
  --name pixxel360 \
  -p 3333:3333 \
  -e DB_TYPE=mysql \
  -e DATABASE_URL="mysql://pixxel360:yourpassword@mysql-host:3306/pixxel360" \
  -e JWT_SECRET="your-strong-random-secret" \
  tlgrange/pixxel360:latest
```

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | Listening port | `3333` |
| `DB_TYPE` | Database dialect (`sqlite` or `mysql`) | `sqlite` |
| `DATABASE_URL` | Database connection string | `file:/app/data/pixxel360.db` |
| `JWT_SECRET` | Secret key used to sign session cookies | Auto-generated on first boot |
| `ADMIN_EMAIL` | Pre-configured admin email address | Optional |
| `ADMIN_PASSWORD` | Pre-configured admin password | Optional |

---

## Features

- **Asset Security Posture**: Real-time visibility into asset compliance, risk factors, and governance policies.
- **Audit Trails**: Complete logging of administrative and user actions with resource tracing and IP records.
- **Role-Based Access Control**: Granular permissions distinguishing standard users and system administrators.
- **Feature Flags**: Dynamic toggling of application features without service downtime.
- **Multi-Architecture**: First-class support for `linux/amd64` and `linux/arm64` (Apple Silicon & ARM servers).
