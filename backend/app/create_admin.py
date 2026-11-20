import os
import sys
from uuid import uuid4

from pydantic import EmailStr, TypeAdapter
from sqlalchemy import select

from .auth import hash_password
from .database import SessionLocal
from .init_db import initialize_database
from .models import StaffMember, UserAccount


def create_principal_account() -> None:
    raw_email = os.getenv("BOOTSTRAP_ADMIN_EMAIL", "").strip().lower()
    email = str(TypeAdapter(EmailStr).validate_python(raw_email)) if raw_email else ""
    password = os.getenv("BOOTSTRAP_ADMIN_PASSWORD", "")
    full_name = os.getenv("BOOTSTRAP_ADMIN_NAME", "").strip()
    if not email or not password or not full_name:
        raise RuntimeError(
            "Set BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PASSWORD, and "
            "BOOTSTRAP_ADMIN_NAME before running this command."
        )
    if len(password) < 12:
        raise RuntimeError("The initial principal password must be at least 12 characters.")

    initialize_database()
    with SessionLocal() as session:
        if session.scalar(select(UserAccount).where(UserAccount.email == email)):
            raise RuntimeError("An account already exists for that email address.")
        staff_id = f"ST-{uuid4().hex[:8].upper()}"
        staff = StaffMember(
            id=staff_id,
            full_name=full_name,
            email=email,
            role="Principal",
            department="Administration",
        )
        account = UserAccount(
            email=email,
            password_hash=hash_password(password),
            role="principal",
            staff_id=staff_id,
        )
        session.add_all((staff, account))
        session.commit()


if __name__ == "__main__":
    try:
        create_principal_account()
    except (RuntimeError, ValueError) as error:
        print(error, file=sys.stderr)
        raise SystemExit(1) from error
    print("Principal account created.")
