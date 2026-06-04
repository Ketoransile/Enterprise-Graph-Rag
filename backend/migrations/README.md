# Alembic Migrations

Run migrations from the backend directory:

```bash
alembic upgrade head
```

Create new revision (after updating models):

```bash
alembic revision --autogenerate -m "message"
```
