from sqlalchemy.orm import Session

from .database import Base, SessionLocal, engine
from . import models  # noqa: F401


CLASS_NAMES = (
    "Grade 6A",
    "Grade 6B",
    "Grade 7A",
    "Grade 7B",
    "Grade 8A",
    "Grade 8B",
    "Grade 9A",
    "Grade 9B",
    "Grade 10A",
    "Grade 11A",
)
SUBJECT_NAMES = ("Mathematics", "English", "Science", "History", "ICT")


def initialize_database() -> None:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as session:
        _seed_lookups(session)
        session.commit()


def _seed_lookups(session: Session) -> None:
    for model, names in (
        (models.SchoolClass, CLASS_NAMES),
        (models.Subject, SUBJECT_NAMES),
    ):
        existing_names = set(session.query(model.name).all())
        existing_names = {name for (name,) in existing_names}
        session.add_all(model(name=name) for name in names if name not in existing_names)


if __name__ == "__main__":
    initialize_database()
    print("Database tables and school lookup data are ready.")
