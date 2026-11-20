# Central College School Management System

Central College is a React/Vite school portal backed by a FastAPI and SQLAlchemy API. In database mode, student and staff profiles, grades, leave requests, student/staff attendance, gate events, visitor logs, announcements, and principal settings are read from and written to the database. Without `VITE_API_BASE_URL`, the app runs in a non-persistent mock preview.

## Run the local demo

The project is configured for a local SQLite database by default, so PostgreSQL is not required for a quick test. Python and Node.js must be installed.

1. Install frontend dependencies:

   ```powershell
   npm install
   ```

2. Configure and seed the database. Create `backend\.env` from the example, replacing the signing key with a private random value:

   ```powershell
   Copy-Item backend\.env.example backend\.env
   py -c "import secrets; print(secrets.token_urlsafe(48))"
   notepad backend\.env
   ```

   Then run the database setup and demo seeder from the project root:

   ```powershell
   py -m backend.app.init_db
   py -m backend.app.seed_demo
   ```

   The seeder is safe to rerun: it adds missing demo records and does not erase existing data.

3. Start the API in one PowerShell window:

   ```powershell
   py -m uvicorn backend.app.main:app --reload
   ```

   The API health check is at `http://localhost:8000/api/health`; interactive API documentation is at `http://localhost:8000/docs`.

4. Start Vite in another window:

   ```powershell
   npm run dev
   ```

   The root `.env.local` enables the API connection. Restart Vite after changing it.

## Demo accounts

All seeded demo accounts use the password `DemoSchool!2026`. Select a role on the sign-in page; the email is filled in for that role.

| Portal | Email |
|---|---|
| Principal | `demo.principal@centralcollege.edu` |
| Teacher | `demo.teacher@centralcollege.edu` |
| Office | `demo.office@centralcollege.edu` |
| Security | `demo.security@centralcollege.edu` |
| Student | `demo.student@centralcollege.edu` |
| Parent | `demo.parent@centralcollege.edu` |

Change demo passwords before exposing the API beyond a trusted local development environment.

## Database options

The example configuration uses:

```text
DATABASE_URL=sqlite:///./backend/central_college.sqlite3
```

For PostgreSQL, create `central_college_db` on your PostgreSQL server and replace `DATABASE_URL` in the private `backend\.env` file with your SQLAlchemy PostgreSQL URL, for example `postgresql+psycopg://user:password@localhost:5432/central_college_db`. Keep database credentials and the API signing key private. `backend\.env`, `.env.local`, and the local SQLite file are ignored by Git.

`init_db` creates missing ORM tables and lookup rows. `seed_demo` adds representative students, staff and login accounts, parent links, grades, attendance, gate events, leave requests, visitors, announcements, and system settings. `create_all` does not migrate changed columns in an existing database; use a migration tool such as Alembic when evolving a deployed schema.

## Persistent workflows and current limits

- Student enrollment, edits, and deletion; staff profile management; gradebook changes; leave requests and decisions; gate entry/exit; visitor check-in/check-out; staff biometric check-in/out; and principal feature settings persist through the API.
- Parent/student academic, attendance, announcement, and gate views use database records. API changes update the current portal immediately, remain after reload, and sync to other open portals within about five seconds.
- Biometric terminals and device heartbeat/latency are simulated; no physical reader, SMS/email notification provider, or camera-based QR decoder is connected. Security staff can submit a student ID or decoded QR value (`CENTRAL-COLLEGE:<student-id>`).
- Timetables and a few presentational labels remain sample content rather than records managed by the database.

To run the backend test suite:

```powershell
py -m pip install -r backend\requirements-dev.txt
py -m pytest backend\tests
```
