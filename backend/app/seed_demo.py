from datetime import date, datetime, time, timedelta, timezone
from uuid import UUID, uuid5, NAMESPACE_URL

from sqlalchemy import select

from .auth import hash_password
from .database import SessionLocal
from .init_db import CLASS_NAMES, SUBJECT_NAMES, initialize_database
from .models import (
    Announcement,
    AttendanceRecord,
    GateEvent,
    Grade,
    LeaveRequest,
    Parent,
    SchoolClass,
    StaffAttendanceRecord,
    StaffMember,
    Student,
    Subject,
    SystemSetting,
    UserAccount,
    Visitor,
)


DEMO_PASSWORD = "DemoSchool!2026"
ACCOUNT_CONFIG = (
    ("demo.principal@centralcollege.edu", "Principal", "principal", "DEMO-ST-PRINCIPAL"),
    ("demo.teacher@centralcollege.edu", "Teacher", "teacher", "DEMO-ST-TEACHER"),
    ("demo.office@centralcollege.edu", "Office Staff", "office", "DEMO-ST-OFFICE"),
    ("demo.security@centralcollege.edu", "Security", "security", "DEMO-ST-SECURITY"),
)
STUDENT_DATA = (
    ("Aarav Fernando", "aarav.fernando"),
    ("Amaya Perera", "amaya.perera"),
    ("Anika Silva", "anika.silva"),
    ("Arjun Jayasinghe", "arjun.jayasinghe"),
    ("Diya Wickramasinghe", "diya.wickramasinghe"),
    ("Ethan Senanayake", "ethan.senanayake"),
    ("Ishani De Alwis", "ishani.dealwis"),
    ("Kabir Wijesinghe", "kabir.wijesinghe"),
    ("Maya Fernando", "maya.fernando"),
    ("Noah Perera", "noah.perera"),
    ("Riya Silva", "riya.silva"),
    ("Zayn Jayasinghe", "zayn.jayasinghe"),
)
SUBJECT_SCORES = {
    "Mathematics": (88, 76, 94, 68, 82),
    "English": (92, 85, 89, 74, 91),
    "Science": (84, 81, 93, 72, 87),
    "History": (79, 88, 86, 80, 84),
    "ICT": (95, 90, 91, 85, 89),
}
ANNOUNCEMENTS = (
    (
        "Term 3 parent-teacher meetings",
        "Meet your child's teachers on Friday. Contact the school office to select a time.",
        date(2026, 11, 4),
    ),
    (
        "Inter-house athletics meet",
        "The annual athletics meet takes place on November 20. Students should arrive by 7:30 AM.",
        date(2026, 11, 2),
    ),
    (
        "Library hours update",
        "The school library remains open until 4:00 PM on weekdays this term.",
        date(2026, 10, 28),
    ),
)
SYSTEM_SETTINGS = {
    "studentQr": True,
    "biometric": True,
    "parentAlerts": True,
    "leaveApprovals": True,
}


def _stable_uuid(name: str) -> UUID:
    return uuid5(NAMESPACE_URL, f"central-college-demo:{name}")


def seed_demo_data() -> None:
    initialize_database()
    now = datetime.now(timezone.utc)
    with SessionLocal() as session:
        for key, enabled in SYSTEM_SETTINGS.items():
            if session.get(SystemSetting, key) is None:
                session.add(SystemSetting(key=key, enabled=enabled))
        classes = {
            school_class.name: school_class
            for school_class in session.scalars(select(SchoolClass)).all()
        }
        subjects = {
            subject.name: subject
            for subject in session.scalars(select(Subject)).all()
        }
        for class_name in CLASS_NAMES:
            classes.setdefault(class_name, SchoolClass(name=class_name))
        for subject_name in SUBJECT_NAMES:
            subjects.setdefault(subject_name, Subject(name=subject_name))
        session.add_all(
            item for item in classes.values() if item.id is None
        )
        session.add_all(item for item in subjects.values() if item.id is None)
        session.flush()

        staff_by_role: dict[str, StaffMember] = {}
        for email, title, role, staff_id in ACCOUNT_CONFIG:
            staff = session.get(StaffMember, staff_id)
            if staff is None:
                staff = StaffMember(
                    id=staff_id,
                    full_name=f"Demo {title}",
                    email=email,
                    role=title,
                    department={
                        "principal": "Administration",
                        "teacher": "Mathematics",
                        "office": "Administration",
                        "security": "Campus Safety",
                    }[role],
                )
                session.add(staff)
            staff_by_role[role] = staff
            account = session.scalar(
                select(UserAccount).where(UserAccount.email == email)
            )
            if account is None:
                session.add(
                    UserAccount(
                        email=email,
                        password_hash=hash_password(DEMO_PASSWORD),
                        role=role,
                        staff_id=staff_id,
                    )
                )

        students: list[Student] = []
        for index, (full_name, email_prefix) in enumerate(STUDENT_DATA, start=1):
            student_id = f"DEMO-{index:04d}"
            email = f"demo.{email_prefix.replace('.', '')}@centralcollege.edu"
            student = session.get(Student, student_id)
            if student is None:
                student = Student(
                    id=student_id,
                    full_name=full_name,
                    email=email,
                    class_id=classes[
                        CLASS_NAMES[6] if index <= 5 else CLASS_NAMES[(index + 2) % len(CLASS_NAMES)]
                    ].id,
                    avatar_url=(
                        "https://api.dicebear.com/7.x/initials/svg?seed="
                        f"{full_name.replace(' ', '%20')}&backgroundColor=e7edf7"
                    ),
                )
                session.add(student)
            students.append(student)
        session.flush()

        parent = session.get(Parent, _stable_uuid("parent"))
        if parent is None:
            parent = Parent(
                id=_stable_uuid("parent"),
                full_name="Demo Parent",
                email="demo.parent@centralcollege.edu",
                phone="+94770000001",
                address="Central College demo household",
            )
            session.add(parent)
        if students[0] not in parent.students:
            parent.students.append(students[0])
        if students[1] not in parent.students:
            parent.students.append(students[1])
        if session.scalar(
            select(UserAccount).where(
                UserAccount.email == "demo.parent@centralcollege.edu"
            )
        ) is None:
            session.add(
                UserAccount(
                    email="demo.parent@centralcollege.edu",
                    password_hash=hash_password(DEMO_PASSWORD),
                    role="parent",
                    parent_id=parent.id,
                )
            )
        if session.scalar(
            select(UserAccount).where(
                UserAccount.email == "demo.student@centralcollege.edu"
            )
        ) is None:
            session.add(
                UserAccount(
                    email="demo.student@centralcollege.edu",
                    password_hash=hash_password(DEMO_PASSWORD),
                    role="student",
                    student_id=students[0].id,
                )
            )
        session.flush()

        for subject_name, scores in SUBJECT_SCORES.items():
            subject = subjects[subject_name]
            for student, score in zip(students[: len(scores)], scores):
                grade = session.scalar(
                    select(Grade).where(
                        Grade.student_id == student.id,
                        Grade.subject_id == subject.id,
                        Grade.academic_year == 2026,
                        Grade.term == "Term 3",
                    )
                )
                if grade is None:
                    session.add(
                        Grade(
                            student_id=student.id,
                            subject_id=subject.id,
                            academic_year=2026,
                            term="Term 3",
                            score=score,
                            teacher_id=staff_by_role["teacher"].id,
                        )
                    )

        today = date.today()
        school_days: list[date] = []
        cursor = today
        while len(school_days) < 14:
            if cursor.weekday() < 5:
                school_days.append(cursor)
            cursor -= timedelta(days=1)
        for index, school_date in enumerate(school_days):
            for student_index, student in enumerate(students[:8]):
                record = session.scalar(
                    select(AttendanceRecord).where(
                        AttendanceRecord.student_id == student.id,
                        AttendanceRecord.attendance_date == school_date,
                    )
                )
                if record is None:
                    is_absent = (student_index == 3 and index == 4) or (
                        student_index == 7 and index == 8
                    )
                    check_in = datetime.combine(
                        school_date,
                        time(7, 40 + (student_index * 2) % 18),
                        tzinfo=timezone.utc,
                    )
                    session.add(
                        AttendanceRecord(
                            student_id=student.id,
                            attendance_date=school_date,
                            status="Absent" if is_absent else "Present",
                            check_in_at=None if is_absent else check_in,
                            recorded_by=staff_by_role["security"].id,
                        )
                    )
                    if not is_absent and (
                        school_date == today or index < 3
                    ):
                        session.add(
                            GateEvent(
                                id=_stable_uuid(
                                    f"gate:{student.id}:{school_date.isoformat()}"
                                ),
                                student_id=student.id,
                                event_type="Entry",
                                occurred_at=check_in,
                                recorded_by=staff_by_role["security"].id,
                            )
                        )

        staff_record = session.scalar(
            select(StaffAttendanceRecord).where(
                StaffAttendanceRecord.staff_id == staff_by_role["teacher"].id,
                StaffAttendanceRecord.attendance_date == today,
            )
        )
        if staff_record is None:
            session.add(
                StaffAttendanceRecord(
                    staff_id=staff_by_role["teacher"].id,
                    attendance_date=today,
                    status="Present",
                    check_in_at=now - timedelta(hours=2),
                )
            )

        leave = session.get(LeaveRequest, "LV-DEMO-001")
        if leave is None:
            session.add(
                LeaveRequest(
                    id="LV-DEMO-001",
                    staff_id=staff_by_role["teacher"].id,
                    leave_date=today + timedelta(days=3),
                    start_time=time(10, 30),
                    end_time=time(11, 30),
                    reason="Demo leave request for a medical appointment",
                    status="Pending",
                )
            )

        visitor_ids = (_stable_uuid("visitor-1"), _stable_uuid("visitor-2"))
        visitor_data = (
            ("Nimal Jayasuriya", "ID-DEMO-001", "+94770000101", "Parent meeting", "Demo Teacher", "CAA-2481", False),
            ("Farah Nazeer", "ID-DEMO-002", "+94770000102", "Admissions inquiry", "Office", None, True),
        )
        for visitor_id, data in zip(visitor_ids, visitor_data):
            if session.get(Visitor, visitor_id) is None:
                name, id_number, phone, purpose, person, vehicle, checked_out = data
                session.add(
                    Visitor(
                        id=visitor_id,
                        visitor_name=name,
                        id_number=id_number,
                        phone=phone,
                        purpose=purpose,
                        person_to_visit=person,
                        vehicle_number=vehicle,
                        checked_in_at=now - timedelta(hours=1),
                        checked_out_at=now - timedelta(minutes=5) if checked_out else None,
                        recorded_by=staff_by_role["security"].id,
                    )
                )

        for title, body, published_date in ANNOUNCEMENTS:
            announcement_id = _stable_uuid(f"announcement:{title}")
            if session.get(Announcement, announcement_id) is None:
                session.add(
                    Announcement(
                        id=announcement_id,
                        title=title,
                        body=body,
                        published_at=datetime.combine(
                            published_date, time(9), tzinfo=timezone.utc
                        ),
                        created_by=staff_by_role["principal"].id,
                    )
                )

        session.commit()


if __name__ == "__main__":
    seed_demo_data()
    print("Demo data is ready. Seeded data is retained on repeat runs.")
    print(f"Demo login password: {DEMO_PASSWORD}")
