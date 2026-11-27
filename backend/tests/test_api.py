import os

import pytest

os.environ["DATABASE_URL"] = "sqlite://"
os.environ["SECRET_KEY"] = "a-long-test-secret-key-that-is-at-least-thirty-two-bytes"

from fastapi.testclient import TestClient
from sqlalchemy import select

from backend.app.auth import hash_password
from backend.app.database import Base, SessionLocal, engine
from backend.app.main import app
from backend.app.models import Parent, SchoolClass, StaffMember, Student, Subject, UserAccount
from backend.app.init_db import CLASS_NAMES, SUBJECT_NAMES


@pytest.fixture(autouse=True)
def database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as session:
        session.add_all(SchoolClass(name=name) for name in CLASS_NAMES)
        session.add_all(Subject(name=name) for name in SUBJECT_NAMES)
        session.add_all(
            (
                StaffMember(
                    id="ST-PRINCIPAL",
                    full_name="Principal User",
                    email="principal@example.edu",
                    role="Principal",
                    department="Administration",
                ),
                StaffMember(
                    id="ST-TEACHER",
                    full_name="Teacher User",
                    email="teacher@example.edu",
                    role="Teacher",
                    department="Mathematics",
                ),
            )
        )
        session.flush()
        session.add_all(
            (
                UserAccount(
                    email="principal@example.edu",
                    password_hash=hash_password("a-secure-test-password"),
                    role="principal",
                    staff_id="ST-PRINCIPAL",
                ),
                UserAccount(
                    email="teacher@example.edu",
                    password_hash=hash_password("another-secure-test-password"),
                    role="teacher",
                    staff_id="ST-TEACHER",
                ),
            )
        )
        school_class = session.scalar(
            select(SchoolClass).where(SchoolClass.name == "Grade 9A")
        )
        session.add(
            Student(
                id="CC-0001",
                full_name="Student One",
                email="student@example.edu",
                class_id=school_class.id,
            )
        )
        session.commit()
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def login(client, email="principal@example.edu", password="a-secure-test-password"):
    response = client.post(
        "/api/auth/login",
        json={"email": email, "password": password},
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_login_rejects_bad_password_and_returns_role(client):
    bad_login = client.post(
        "/api/auth/login",
        json={"email": "principal@example.edu", "password": "wrong-password"},
    )
    assert bad_login.status_code == 401

    headers = login(client)
    assert client.get("/api/students", headers=headers).status_code == 200
    assert client.get("/api/announcements", headers=headers).status_code == 200


def test_student_crud_and_role_guard(client):
    headers = login(client)
    created = client.post(
        "/api/students",
        headers=headers,
        json={
            "name": "New Student",
            "className": "Grade 10A",
            "email": "new.student@example.edu",
            "avatar": "https://example.edu/avatar.svg",
        },
    )
    assert created.status_code == 201
    assert created.json()["className"] == "Grade 10A"
    student_id = created.json()["id"]

    teacher_headers = login(
        client,
        "teacher@example.edu",
        "another-secure-test-password",
    )
    forbidden = client.post(
        "/api/students",
        headers=teacher_headers,
        json={
            "name": "Forbidden Student",
            "className": "Grade 10A",
            "email": "forbidden@example.edu",
        },
    )
    assert forbidden.status_code == 403

    updated = client.put(
        f"/api/students/{student_id}",
        headers=headers,
        json={
            "name": "Updated Student",
            "className": "Grade 11A",
            "email": "new.student@example.edu",
            "avatar": None,
        },
    )
    assert updated.status_code == 200
    assert updated.json()["name"] == "Updated Student"

    deleted = client.delete(f"/api/students/{student_id}", headers=headers)
    assert deleted.status_code == 204


def test_teacher_leave_request_can_be_reviewed_by_principal(client):
    teacher_headers = login(
        client,
        "teacher@example.edu",
        "another-secure-test-password",
    )
    created = client.post(
        "/api/leaves",
        headers=teacher_headers,
        json={
            "date": "2026-11-20",
            "start": "10:00",
            "end": "11:00",
            "reason": "Medical appointment with supporting details",
        },
    )
    assert created.status_code == 201
    assert created.json()["name"] == "Teacher User"
    assert created.json()["status"] == "Pending"

    principal_headers = login(client)
    reviewed = client.patch(
        f"/api/leaves/{created.json()['id']}",
        headers=principal_headers,
        json={"status": "Approved", "remarks": "Approved"},
    )
    assert reviewed.status_code == 200
    assert reviewed.json()["status"] == "Approved"


def test_staff_account_command_creates_linked_teacher(monkeypatch):
    from backend.app.create_user import create_staff_account

    answers = iter(("new.teacher@example.edu", "New Teacher", "Science"))
    passwords = iter(("a-new-secure-password", "a-new-secure-password"))
    monkeypatch.setattr("builtins.input", lambda _prompt: next(answers))
    monkeypatch.setattr(
        "backend.app.create_user.getpass.getpass",
        lambda _prompt: next(passwords),
    )

    create_staff_account("teacher")

    with SessionLocal() as session:
        account = session.scalar(
            select(UserAccount).where(UserAccount.email == "new.teacher@example.edu")
        )
        assert account.role == "teacher"
        assert account.staff_id is not None


def test_grade_staff_visitor_and_attendance_updates_are_persistent(client):
    principal_headers = login(client)
    teacher_headers = login(
        client,
        "teacher@example.edu",
        "another-secure-test-password",
    )

    grade = client.put(
        "/api/grades",
        headers=teacher_headers,
        json={
            "studentId": "CC-0001",
            "subject": "Mathematics",
            "academicYear": 2026,
            "term": "Term 3",
            "score": 93.5,
        },
    )
    assert grade.status_code == 200
    assert grade.json()["score"] == 93.5
    grades = client.get(
        "/api/grades?studentId=CC-0001",
        headers=principal_headers,
    )
    assert any(item["score"] == 93.5 for item in grades.json())

    created_staff = client.post(
        "/api/staff",
        headers=principal_headers,
        json={
            "name": "New Office Member",
            "email": "new.office@example.edu",
            "role": "Office Staff",
            "department": "Administration",
        },
    )
    assert created_staff.status_code == 201
    staff_id = created_staff.json()["id"]
    updated_staff = client.put(
        f"/api/staff/{staff_id}",
        headers=principal_headers,
        json={
            "name": "Updated Office Member",
            "email": "new.office@example.edu",
            "role": "Office Staff",
            "department": "Student Services",
        },
    )
    assert updated_staff.status_code == 200
    assert updated_staff.json()["department"] == "Student Services"
    assert client.delete(
        f"/api/staff/{staff_id}",
        headers=principal_headers,
    ).status_code == 204

    visitor = client.post(
        "/api/visitors",
        headers=principal_headers,
        json={
            "name": "Test Visitor",
            "idNumber": "TEST-001",
            "phone": "+94770000111",
            "purpose": "Parent meeting",
            "person": "Teacher User",
            "vehicle": "CAA-1111",
        },
    )
    assert visitor.status_code == 201
    visitor_id = visitor.json()["id"]
    checked_out = client.patch(
        f"/api/visitors/{visitor_id}/checkout",
        headers=principal_headers,
    )
    assert checked_out.status_code == 200
    assert checked_out.json()["status"] == "Checked out"

    gate_event = client.post(
        "/api/attendance",
        headers=principal_headers,
        json={"studentId": "CC-0001", "type": "Entry"},
    )
    assert gate_event.status_code == 201
    attendance = client.get(
        "/api/attendance/records?studentId=CC-0001",
        headers=principal_headers,
    )
    assert any(record["status"] == "Present" for record in attendance.json())

    checked_in = client.post(
        "/api/staff-attendance",
        headers=teacher_headers,
        json={"type": "in"},
    )
    assert checked_in.status_code == 200
    checked_out = client.post(
        "/api/staff-attendance",
        headers=teacher_headers,
        json={"type": "out"},
    )
    assert checked_out.status_code == 200
    assert checked_out.json()["checkOut"] is not None


def test_timetable_crud_teacher_scope_and_conflicts(client):
    principal_headers = login(client)
    teacher_headers = login(
        client,
        "teacher@example.edu",
        "another-secure-test-password",
    )
    payload = {
        "className": "Grade 9A",
        "subject": "Mathematics",
        "teacherId": "ST-TEACHER",
        "dayOfWeek": "Monday",
        "startTime": "08:00",
        "endTime": "08:45",
        "room": "Room 204",
    }

    created = client.post("/api/timetable", headers=principal_headers, json=payload)
    assert created.status_code == 201
    entry = created.json()
    assert entry["className"] == "Grade 9A"
    assert entry["teacherName"] == "Teacher User"

    assert client.get("/api/timetable", headers=teacher_headers).json() == [entry]
    assert (
        client.post("/api/timetable", headers=teacher_headers, json=payload).status_code
        == 403
    )

    conflict = {**payload, "startTime": "08:30", "endTime": "09:00"}
    assert (
        client.post("/api/timetable", headers=principal_headers, json=conflict).status_code
        == 409
    )

    updated = {**payload, "startTime": "09:00", "endTime": "09:45"}
    changed = client.put(
        f"/api/timetable/{entry['id']}", headers=principal_headers, json=updated
    )
    assert changed.status_code == 200
    assert changed.json()["startTime"] == "09:00:00"
    assert (
        client.delete(f"/api/timetable/{entry['id']}", headers=principal_headers).status_code
        == 204
    )
    assert client.get("/api/timetable", headers=principal_headers).json() == []


def test_system_settings_persist_and_control_workflows(client):
    principal_headers = login(client)
    teacher_headers = login(
        client,
        "teacher@example.edu",
        "another-secure-test-password",
    )

    saved = client.put(
        "/api/settings/studentQr",
        headers=principal_headers,
        json={"enabled": False},
    )
    assert saved.status_code == 200
    stored_settings = client.get("/api/settings", headers=principal_headers).json()
    assert next(item for item in stored_settings if item["key"] == "studentQr")["enabled"] is False
    rejected_scan = client.post(
        "/api/attendance",
        headers=principal_headers,
        json={"studentId": "CC-0001", "type": "Entry"},
    )
    assert rejected_scan.status_code == 409

    client.put(
        "/api/settings/leaveApprovals",
        headers=principal_headers,
        json={"enabled": False},
    )
    leave = client.post(
        "/api/leaves",
        headers=teacher_headers,
        json={
            "date": "2026-11-20",
            "start": "10:00",
            "end": "11:00",
            "reason": "Medical appointment with supporting details",
        },
    )
    assert leave.status_code == 201
    assert leave.json()["status"] == "Approved"

    client.put(
        "/api/settings/biometric",
        headers=principal_headers,
        json={"enabled": False},
    )
    rejected_checkin = client.post(
        "/api/staff-attendance",
        headers=teacher_headers,
        json={"type": "in"},
    )
    assert rejected_checkin.status_code == 409


def test_parent_can_load_only_linked_student_records(client):
    with SessionLocal() as session:
        parent = Parent(
            full_name="Linked Parent",
            email="linked.parent@example.edu",
            phone="+94770000999",
        )
        session.add(parent)
        student = session.scalar(
            select(Student).where(Student.id == "CC-0001")
        )
        student.parents.append(parent)
        session.commit()
        parent_id = parent.id
        session.add(
            UserAccount(
                email="linked.parent@example.edu",
                password_hash=hash_password("linked-parent-password"),
                role="parent",
                parent_id=parent_id,
            )
        )
        session.commit()

    headers = login(
        client,
        "linked.parent@example.edu",
        "linked-parent-password",
    )
    students = client.get("/api/students", headers=headers)
    assert students.status_code == 200
    assert [student["id"] for student in students.json()] == ["CC-0001"]
    assert client.get("/api/grades", headers=headers).status_code == 200
    assert client.get("/api/attendance/records", headers=headers).status_code == 200
    assert client.get("/api/settings", headers=headers).status_code == 200
    assert client.put(
        "/api/settings/parentAlerts",
        headers=headers,
        json={"enabled": False},
    ).status_code == 403


def test_student_and_parent_timetable_reads_are_class_scoped(client):
    principal_headers = login(client)
    payload = {
        "className": "Grade 9A",
        "subject": "Mathematics",
        "teacherId": "ST-TEACHER",
        "dayOfWeek": "Monday",
        "startTime": "08:00",
        "endTime": "08:45",
        "room": "Room 204",
    }
    linked_entry = client.post("/api/timetable", headers=principal_headers, json=payload)
    other_entry = client.post(
        "/api/timetable",
        headers=principal_headers,
        json={**payload, "className": "Grade 10A", "startTime": "09:00", "endTime": "09:45"},
    )
    assert linked_entry.status_code == other_entry.status_code == 201

    with SessionLocal() as session:
        parent = Parent(
            full_name="Linked Parent",
            email="schedule.parent@example.edu",
            phone="+94770000999",
        )
        student = session.scalar(select(Student).where(Student.id == "CC-0001"))
        student.parents.append(parent)
        session.add(
            UserAccount(
                email="schedule.student@example.edu",
                password_hash=hash_password("student-schedule-password"),
                role="student",
                student_id=student.id,
            )
        )
        session.flush()
        session.add(
            UserAccount(
                email="schedule.parent@example.edu",
                password_hash=hash_password("parent-schedule-password"),
                role="parent",
                parent_id=parent.id,
            )
        )
        session.commit()

    student_headers = login(
        client, "schedule.student@example.edu", "student-schedule-password"
    )
    parent_headers = login(
        client, "schedule.parent@example.edu", "parent-schedule-password"
    )
    expected = [linked_entry.json()]
    assert client.get("/api/timetable", headers=student_headers).json() == expected
    assert client.get("/api/timetable", headers=parent_headers).json() == expected
