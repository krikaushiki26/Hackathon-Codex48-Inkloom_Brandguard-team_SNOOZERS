
from getpass import getpass

from sqlalchemy import select

from database import SessionLocal
from models import User


def main():
    email = input("Enter the registered account email: ").strip().lower()

    confirmation = input(
        "This will give the account Manager permissions. Type PROMOTE to confirm: "
    ).strip()

    if confirmation != "PROMOTE":
        print("Cancelled. No changes made.")
        return

    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == email))

        if user is None:
            print("Account not found. Register it first.")
            return

        if not user.is_active:
            print("Account is inactive. No changes made.")
            return

        user.role = "manager"
        db.commit()

        print(f"Success! {user.email} is now a Manager.")


if __name__ == "__main__":
    main()
