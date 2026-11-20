import argparse
import getpass
import sys
from uuid import uuid4

from pydantic import EmailStr, TypeAdapter
from sqlalchemy import select

from .auth import hash_password
from .database import SessionLocal
from .init_db import initialize_database
from .models import StaffMember, UserAccount


STAFF_ROLES = {
    "teacher": ("Teacher", "teacher"),
    "office": ("Office Staff", "office"),
    "security": ("Security", "security"),
}


def create_staff_account(role: str) -> None:
    email = str(
        TypeAdapter(EmailStr).validate_python(
            input("Account email: ").strip().lower()
        )
    )
    full_name = input("Full name: ").strip()
    department = input("Department: ").strip() or None
    password = getpass.getpass("Password (minimum 12 characters): ")
    confirmation = getpass.getpass("Confirm password: ")

    if not email or not full_name:
        raise ValueError("Email and full name are required.")
    if len(password) < 12:
        raise ValueError("The password must be at least 12 characters.")
    if password != confirmation:
        raise ValueError("Passwords do not match.")

    initialize_database()
    with SessionLocal() as session:
        if session.scalar(select(UserAccount).where(UserAccount.email == email)):
            raise ValueError("An account already exists for that email address.")

        staff_role, account_role = STAFF_ROLES[role]
        staff_id = f"ST-{uuid4().hex[:8].upper()}"
        session.add_all(
            (
                StaffMember(
                    id=staff_id,
                    full_name=full_name,
                    email=email,
                    role=staff_role,
                    department=department,
                ),
                UserAccount(
                    email=email,
                    password_hash=hash_password(password),
                    role=account_role,
                    staff_id=staff_id,
                ),
            )
        )
        session.commit()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create a school staff login account.")
    parser.add_argument("--role", choices=STAFF_ROLES, required=True)
    args = parser.parse_args()
    try:
        create_staff_account(args.role)
    except ValueError as error:
        print(error, file=sys.stderr)
        raise SystemExit(1) from error
    print(f"{args.role.title()} account created.")
