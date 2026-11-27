from datetime import date, datetime, time, timezone
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from .auth import (
    create_access_token,
    get_current_account,
    get_db,
    require_roles,
    verify_password,
)
from .models import (
    Announcement,
    AttendanceRecord,
    Grade,
    GateEvent,
    LeaveRequest,
    Parent,
    SchoolClass,
    StaffAttendanceRecord,
    StaffMember,
    Student,
    Subject,
    SystemSetting,
    TimetableEntry,
    UserAccount,
    Visitor,
)
from .schemas import (
    AttendanceInput,
    AttendanceRecordResponse,
    AttendanceResponse,
    AnnouncementResponse,
    GradeInput,
    GradeResponse,
    LeaveDecision,
    LeaveInput,
    LeaveResponse,
    LoginRequest,
    LoginResponse,
    StudentInput,
    StudentResponse,
    StaffAttendanceInput,
    StaffAttendanceResponse,
    StaffInput,
    StaffResponse,
    SystemSettingInput,
    SystemSettingResponse,
    TimetableEntryInput,
    TimetableEntryResponse,
    UserPrincipal,
    VisitorInput,
    VisitorResponse,
)
from . import models  # noqa: F401


app = FastAPI(title="Central College API", version="1.0.0")
SYSTEM_SETTING_DEFAULTS = {
    "studentQr": True,
    "biometric": True,
    "parentAlerts": True,
    "leaveApprovals": True,
}
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

DbSession = Annotated[Session, Depends(get_db)]
CurrentAccount = Annotated[UserPrincipal, Depends(get_current_account)]
@app.get("/api/health")
def health_check():
    return {"status": "ok"}


@app.post("/api/auth/login", response_model=LoginResponse)
def login(payload: LoginRequest, session: DbSession):
    account = session.scalar(
        select(UserAccount).where(UserAccount.email == str(payload.email).lower())
    )
    if (
        account is None
        or not account.is_active
        or not verify_password(payload.password, account.password_hash)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    person = (
        session.get(StaffMember, account.staff_id)
        if account.staff_id
        else session.get(Student, account.student_id)
        if account.student_id
        else session.get(Parent, account.parent_id)
        if account.parent_id
        else None
    )
    role_details = {
        "principal": ("School Principal", "Principal"),
        "teacher": ("Teacher", "Teacher"),
        "office": ("Office Staff", "Office staff"),
        "security": ("Security Personnel", "Security"),
        "student": ("Student", "Student"),
        "parent": ("Parent", "Parent"),
    }
    label, short = role_details[account.role]
    return LoginResponse(
        access_token=create_access_token(account),
        user={
            "id": account.role,
            "role": account.role,
            "label": label,
            "short": short,
            "email": account.email,
            "name": person.full_name if person else None,
            "staffId": account.staff_id,
            "studentId": account.student_id,
        },
    )


def _student_response(
    student: Student, attendance: str | None = None
) -> StudentResponse:
    return StudentResponse(
        id=student.id,
        name=student.full_name,
        className=student.school_class.name,
        email=student.email,
        attendance=attendance or "Absent",
        avatar=student.avatar_url,
    )


def _student_today_attendance(session: Session, student_id: str) -> str | None:
    return session.scalar(
        select(AttendanceRecord.status).where(
            AttendanceRecord.student_id == student_id,
            AttendanceRecord.attendance_date == date.today(),
        )
    )


@app.get("/api/students", response_model=list[StudentResponse])
def list_students(
    session: DbSession,
    account: CurrentAccount,
    search: str | None = Query(default=None, max_length=100),
):
    query = select(Student).options(joinedload(Student.school_class))
    if account.role == "student":
        query = query.where(Student.id == account.student_id)
    elif account.role == "parent":
        query = query.join(Student.parents).where(Parent.id == account.parent_id)
    elif account.role not in {"principal", "office", "teacher", "security"}:
        raise HTTPException(status_code=403, detail="Student records are unavailable")
    if search:
        term = f"%{search.strip()}%"
        query = query.where(
            Student.full_name.ilike(term)
            | Student.email.ilike(term)
            | Student.id.ilike(term)
            | Student.school_class.has(SchoolClass.name.ilike(term))
        )
    query = query.outerjoin(
        AttendanceRecord,
        (AttendanceRecord.student_id == Student.id)
        & (AttendanceRecord.attendance_date == date.today()),
    )
    records = session.execute(
        query.add_columns(AttendanceRecord.status).order_by(Student.full_name)
    ).all()
    return [
        _student_response(student, attendance)
        for student, attendance in records
    ]


@app.get("/api/students/{student_id}", response_model=StudentResponse)
def get_student(student_id: str, session: DbSession, account: CurrentAccount):
    student = session.scalar(
        select(Student)
        .options(joinedload(Student.school_class))
        .where(Student.id == student_id)
    )
    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")
    allowed = account.role in {"principal", "office", "teacher", "security"}
    allowed = allowed or (
        account.role == "student" and account.student_id == student.id
    )
    allowed = allowed or (
        account.role == "parent"
        and any(parent.id == account.parent_id for parent in student.parents)
    )
    if not allowed:
        raise HTTPException(status_code=403, detail="You cannot view this student")
    return _student_response(student, _student_today_attendance(session, student.id))


@app.post(
    "/api/students",
    response_model=StudentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_student(
    payload: StudentInput,
    session: DbSession,
    account: Annotated[UserPrincipal, Depends(require_roles("principal", "office"))],
):
    school_class = session.scalar(
        select(SchoolClass).where(SchoolClass.name == payload.class_name)
    )
    if school_class is None:
        raise HTTPException(status_code=422, detail="Unknown class")
    student = Student(
        id=f"CC-{uuid4().hex[:8].upper()}",
        full_name=payload.name.strip(),
        email=str(payload.email).lower(),
        class_id=school_class.id,
        avatar_url=payload.avatar,
    )
    session.add(student)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(
            status_code=409, detail="A student with this email already exists"
        ) from None
    session.refresh(student)
    return _student_response(student)


@app.put("/api/students/{student_id}", response_model=StudentResponse)
def update_student(
    student_id: str,
    payload: StudentInput,
    session: DbSession,
    account: Annotated[UserPrincipal, Depends(require_roles("principal", "office"))],
):
    student = session.get(Student, student_id)
    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")
    school_class = session.scalar(
        select(SchoolClass).where(SchoolClass.name == payload.class_name)
    )
    if school_class is None:
        raise HTTPException(status_code=422, detail="Unknown class")
    student.full_name = payload.name.strip()
    student.email = str(payload.email).lower()
    student.class_id = school_class.id
    student.avatar_url = payload.avatar
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(
            status_code=409, detail="A student with this email already exists"
        ) from None
    session.refresh(student)
    return _student_response(student, _student_today_attendance(session, student.id))


@app.delete("/api/students/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student(
    student_id: str,
    session: DbSession,
    account: Annotated[UserPrincipal, Depends(require_roles("principal", "office"))],
):
    student = session.get(Student, student_id)
    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")
    session.delete(student)
    session.commit()


def _leave_response(leave: LeaveRequest) -> LeaveResponse:
    start = leave.start_time.strftime("%I:%M %p").lstrip("0")
    end = leave.end_time.strftime("%I:%M %p").lstrip("0")
    return LeaveResponse(
        id=leave.id,
        name=leave.staff_member.full_name,
        staffId=leave.staff_id,
        date=leave.leave_date,
        slot=f"{start} – {end}",
        reason=leave.reason,
        status=leave.status,
        remarks=leave.remarks,
        start=leave.start_time,
        end=leave.end_time,
    )


@app.get("/api/leaves", response_model=list[LeaveResponse])
def list_leaves(
    session: DbSession,
    account: Annotated[
        UserPrincipal,
        Depends(
            require_roles(
                "principal", "office", "teacher", "security", "student", "parent"
            )
        ),
    ],
):
    if account.role in {"security", "student", "parent"}:
        return []
    query = select(LeaveRequest).options(joinedload(LeaveRequest.staff_member))
    if account.role == "teacher":
        if not account.staff_id:
            return []
        query = query.where(LeaveRequest.staff_id == account.staff_id)
    leaves = session.scalars(query.order_by(LeaveRequest.created_at.desc())).all()
    return [_leave_response(leave) for leave in leaves]


@app.post(
    "/api/leaves",
    response_model=LeaveResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_leave(
    payload: LeaveInput,
    session: DbSession,
    account: Annotated[UserPrincipal, Depends(require_roles("teacher"))],
):
    if not account.staff_id:
        raise HTTPException(
            status_code=403,
            detail="This teacher account is not linked to a staff profile",
        )
    if payload.end_time <= payload.start_time:
        raise HTTPException(status_code=422, detail="End time must be after start time")
    if payload.start_time < time(7) or payload.end_time > time(17):
        raise HTTPException(status_code=422, detail="Leave times must be between 7 AM and 5 PM")
    approval_setting = session.get(SystemSetting, "leaveApprovals")
    leave = LeaveRequest(
        id=f"LV-{uuid4().hex[:10].upper()}",
        staff_id=account.staff_id,
        leave_date=payload.leave_date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        reason=payload.reason.strip(),
        status="Pending" if approval_setting is None or approval_setting.enabled else "Approved",
    )
    session.add(leave)
    session.commit()
    session.refresh(leave)
    return _leave_response(leave)


@app.patch("/api/leaves/{leave_id}", response_model=LeaveResponse)
def review_leave(
    leave_id: str,
    payload: LeaveDecision,
    session: DbSession,
    account: Annotated[UserPrincipal, Depends(require_roles("principal"))],
):
    leave = session.scalar(
        select(LeaveRequest)
        .options(joinedload(LeaveRequest.staff_member))
        .where(LeaveRequest.id == leave_id)
    )
    if leave is None:
        raise HTTPException(status_code=404, detail="Leave request not found")
    if leave.status != "Pending":
        raise HTTPException(status_code=409, detail="Leave request was already reviewed")
    leave.status = payload.status
    leave.remarks = payload.remarks
    leave.reviewed_by = account.staff_id
    leave.reviewed_at = datetime.now(timezone.utc)
    session.commit()
    session.refresh(leave)
    return _leave_response(leave)


@app.get("/api/attendance", response_model=list[AttendanceResponse])
def list_attendance(session: DbSession, account: CurrentAccount):
    query = select(GateEvent).options(
        joinedload(GateEvent.student).joinedload(Student.school_class)
    )
    if account.role == "student":
        query = query.where(GateEvent.student_id == account.student_id)
    elif account.role == "parent":
        query = query.join(GateEvent.student).join(Student.parents).where(
            Parent.id == account.parent_id
        )
    elif account.role not in {"principal", "office", "teacher", "security"}:
        raise HTTPException(status_code=403, detail="Attendance is unavailable")
    events = session.scalars(query.order_by(GateEvent.occurred_at.desc()).limit(100)).all()
    return [
        AttendanceResponse(
            id=str(event.id),
            student=_student_response(
                event.student,
                _student_today_attendance(session, event.student_id),
            ),
            time=event.occurred_at,
            type=event.event_type,
        )
        for event in events
    ]


@app.post(
    "/api/attendance",
    response_model=AttendanceResponse,
    status_code=status.HTTP_201_CREATED,
)
def record_attendance(
    payload: AttendanceInput,
    session: DbSession,
    account: Annotated[
        UserPrincipal, Depends(require_roles("principal", "office", "security"))
    ],
):
    qr_setting = session.get(SystemSetting, "studentQr")
    if qr_setting is not None and not qr_setting.enabled:
        raise HTTPException(status_code=409, detail="Student gate verification is disabled")
    student = session.scalar(
        select(Student)
        .options(joinedload(Student.school_class))
        .where(Student.id == payload.student_id)
    )
    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")
    now = datetime.now(timezone.utc)
    event = GateEvent(
        student_id=student.id,
        event_type=payload.event_type,
        recorded_by=account.staff_id,
        occurred_at=now,
    )
    session.add(event)
    attendance = session.scalar(
        select(AttendanceRecord).where(
            AttendanceRecord.student_id == student.id,
            AttendanceRecord.attendance_date == date.today(),
        )
    )
    if attendance is None:
        attendance = AttendanceRecord(
            student_id=student.id,
            attendance_date=date.today(),
            status="Present",
            check_in_at=now if payload.event_type == "Entry" else None,
            check_out_at=now if payload.event_type == "Exit" else None,
            recorded_by=account.staff_id,
        )
        session.add(attendance)
    elif payload.event_type == "Entry":
        attendance.status = "Present"
        attendance.check_in_at = attendance.check_in_at or now
        attendance.recorded_by = account.staff_id
    else:
        attendance.check_out_at = now
    session.commit()
    session.refresh(event)
    return AttendanceResponse(
        id=str(event.id),
        student=_student_response(
            student, _student_today_attendance(session, student.id)
        ),
        time=event.occurred_at,
        type=event.event_type,
    )


@app.get("/api/attendance/records", response_model=list[AttendanceRecordResponse])
def attendance_history(
    session: DbSession,
    account: CurrentAccount,
    student_id: str | None = Query(default=None, alias="studentId", max_length=20),
):
    query = select(AttendanceRecord)
    if account.role == "student":
        query = query.where(AttendanceRecord.student_id == account.student_id)
    elif account.role == "parent":
        query = query.join(Student).join(Student.parents).where(
            Parent.id == account.parent_id
        )
    elif account.role in {"principal", "office", "teacher", "security"}:
        if student_id:
            query = query.where(AttendanceRecord.student_id == student_id)
    else:
        raise HTTPException(status_code=403, detail="Attendance history is unavailable")
    records = session.scalars(
        query.order_by(AttendanceRecord.attendance_date.desc()).limit(500)
    ).all()
    return [
        {
            "student_id": record.student_id,
            "date": record.attendance_date,
            "status": record.status,
            "check_in": record.check_in_at,
            "check_out": record.check_out_at,
        }
        for record in records
    ]


@app.get("/api/grades", response_model=list[GradeResponse])
def list_grades(
    session: DbSession,
    account: Annotated[
        UserPrincipal,
        Depends(require_roles("principal", "office", "teacher", "student", "parent")),
    ],
    student_id: str | None = Query(default=None, alias="studentId", max_length=20),
):
    query = select(Grade).join(Grade.subject)
    if account.role == "student":
        query = query.where(Grade.student_id == account.student_id)
    elif account.role == "parent":
        query = query.join(Student, Student.id == Grade.student_id).join(
            Student.parents
        ).where(Parent.id == account.parent_id)
    elif student_id:
        query = query.where(Grade.student_id == student_id)
    grades = session.scalars(
        query.order_by(Grade.student_id, Grade.subject_id, Grade.academic_year, Grade.term)
    ).all()
    return [
        {
            "student_id": grade.student_id,
            "subject": grade.subject.name,
            "academic_year": grade.academic_year,
            "term": grade.term,
            "score": float(grade.score),
            "teacher_id": grade.teacher_id,
        }
        for grade in grades
    ]


@app.put("/api/grades", response_model=GradeResponse)
def upsert_grade(
    payload: GradeInput,
    session: DbSession,
    account: Annotated[UserPrincipal, Depends(require_roles("teacher"))],
):
    student = session.get(Student, payload.student_id)
    subject = session.scalar(select(Subject).where(Subject.name == payload.subject))
    if student is None or subject is None:
        raise HTTPException(status_code=404, detail="Student or subject not found")
    grade = session.scalar(
        select(Grade).where(
            Grade.student_id == payload.student_id,
            Grade.subject_id == subject.id,
            Grade.academic_year == payload.academic_year,
            Grade.term == payload.term,
        )
    )
    if grade is None:
        grade = Grade(
            student_id=payload.student_id,
            subject_id=subject.id,
            academic_year=payload.academic_year,
            term=payload.term,
            score=payload.score,
            teacher_id=account.staff_id,
        )
        session.add(grade)
    else:
        grade.score = payload.score
        grade.teacher_id = account.staff_id
    session.commit()
    session.refresh(grade)
    return {
        "student_id": grade.student_id,
        "subject": subject.name,
        "academic_year": grade.academic_year,
        "term": grade.term,
        "score": float(grade.score),
        "teacher_id": grade.teacher_id,
    }


def _staff_response(person: StaffMember) -> StaffResponse:
    return StaffResponse(
        id=person.id,
        name=person.full_name,
        email=person.email,
        role=person.role,
        department=person.department,
        status=person.status,
    )


@app.get("/api/staff", response_model=list[StaffResponse])
def list_staff(
    session: DbSession,
    account: Annotated[
        UserPrincipal, Depends(require_roles("principal", "office", "teacher"))
    ],
):
    people = session.scalars(select(StaffMember).order_by(StaffMember.full_name)).all()
    return [_staff_response(person) for person in people]


@app.post("/api/staff", response_model=StaffResponse, status_code=201)
def create_staff(
    payload: StaffInput,
    session: DbSession,
    account: Annotated[UserPrincipal, Depends(require_roles("principal", "office"))],
):
    staff_id = f"ST-{uuid4().hex[:8].upper()}"
    person = StaffMember(
        id=staff_id,
        full_name=payload.name.strip(),
        email=str(payload.email).lower() if payload.email else None,
        role=payload.role,
        department=payload.department,
    )
    session.add(person)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(status_code=409, detail="Staff email already exists") from None
    session.refresh(person)
    return _staff_response(person)


@app.put("/api/staff/{staff_id}", response_model=StaffResponse)
def update_staff(
    staff_id: str,
    payload: StaffInput,
    session: DbSession,
    account: Annotated[UserPrincipal, Depends(require_roles("principal", "office"))],
):
    person = session.get(StaffMember, staff_id)
    if person is None:
        raise HTTPException(status_code=404, detail="Staff member not found")
    person.full_name = payload.name.strip()
    person.email = str(payload.email).lower() if payload.email else None
    person.role = payload.role
    person.department = payload.department
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(status_code=409, detail="Staff email already exists") from None
    session.refresh(person)
    return _staff_response(person)


@app.delete("/api/staff/{staff_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_staff(
    staff_id: str,
    session: DbSession,
    account: Annotated[UserPrincipal, Depends(require_roles("principal", "office"))],
):
    person = session.get(StaffMember, staff_id)
    if person is None:
        raise HTTPException(status_code=404, detail="Staff member not found")
    if account.staff_id == staff_id:
        raise HTTPException(status_code=409, detail="You cannot delete your own account")
    session.delete(person)
    session.commit()


def _visitor_response(visitor: Visitor) -> VisitorResponse:
    return VisitorResponse(
        id=str(visitor.id),
        name=visitor.visitor_name,
        idNumber=visitor.id_number,
        phone=visitor.phone,
        purpose=visitor.purpose,
        person=visitor.person_to_visit,
        vehicle=visitor.vehicle_number,
        time=visitor.checked_in_at,
        checkout=visitor.checked_out_at,
        status="Checked out" if visitor.checked_out_at else "On premises",
    )


@app.get("/api/visitors", response_model=list[VisitorResponse])
def list_visitors(
    session: DbSession,
    account: Annotated[
        UserPrincipal, Depends(require_roles("principal", "office", "security"))
    ],
):
    visitors = session.scalars(
        select(Visitor).order_by(Visitor.checked_in_at.desc()).limit(500)
    ).all()
    return [_visitor_response(visitor) for visitor in visitors]


@app.post("/api/visitors", response_model=VisitorResponse, status_code=201)
def create_visitor(
    payload: VisitorInput,
    session: DbSession,
    account: Annotated[UserPrincipal, Depends(require_roles("principal", "office", "security"))],
):
    visitor = Visitor(
        visitor_name=payload.name.strip(),
        id_number=payload.id_number.strip(),
        phone=payload.phone.strip(),
        purpose=payload.purpose.strip(),
        person_to_visit=payload.person.strip(),
        vehicle_number=payload.vehicle.strip() if payload.vehicle else None,
        recorded_by=account.staff_id,
    )
    session.add(visitor)
    session.commit()
    session.refresh(visitor)
    return _visitor_response(visitor)


@app.patch("/api/visitors/{visitor_id}/checkout", response_model=VisitorResponse)
def checkout_visitor(
    visitor_id: str,
    session: DbSession,
    account: Annotated[UserPrincipal, Depends(require_roles("principal", "office", "security"))],
):
    try:
        visitor_uuid = UUID(visitor_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Visitor record not found") from None
    visitor = session.get(Visitor, visitor_uuid)
    if visitor is None:
        raise HTTPException(status_code=404, detail="Visitor record not found")
    if visitor.checked_out_at is not None:
        raise HTTPException(status_code=409, detail="Visitor is already checked out")
    visitor.checked_out_at = datetime.now(timezone.utc)
    session.commit()
    session.refresh(visitor)
    return _visitor_response(visitor)


def _staff_attendance_response(record: StaffAttendanceRecord) -> StaffAttendanceResponse:
    return StaffAttendanceResponse(
        id=str(record.id),
        staff_id=record.staff_id,
        name=record.staff_member.full_name,
        role=record.staff_member.role,
        check_in=record.check_in_at,
        check_out=record.check_out_at,
        status=record.status,
    )


@app.get("/api/staff-attendance", response_model=list[StaffAttendanceResponse])
def list_staff_attendance(
    session: DbSession,
    account: Annotated[
        UserPrincipal, Depends(require_roles("principal", "office", "teacher"))
    ],
):
    query = select(StaffAttendanceRecord).options(
        joinedload(StaffAttendanceRecord.staff_member)
    )
    if account.role == "teacher":
        query = query.where(StaffAttendanceRecord.staff_id == account.staff_id)
    records = session.scalars(
        query.where(StaffAttendanceRecord.attendance_date == date.today())
        .order_by(StaffAttendanceRecord.check_in_at.desc())
    ).all()
    return [_staff_attendance_response(record) for record in records]


@app.post("/api/staff-attendance", response_model=StaffAttendanceResponse)
def record_staff_attendance(
    payload: StaffAttendanceInput,
    session: DbSession,
    account: Annotated[UserPrincipal, Depends(require_roles("teacher"))],
):
    biometric_setting = session.get(SystemSetting, "biometric")
    if biometric_setting is not None and not biometric_setting.enabled:
        raise HTTPException(status_code=409, detail="Biometric attendance is disabled")
    if not account.staff_id:
        raise HTTPException(status_code=403, detail="Account is not linked to staff")
    record = session.scalar(
        select(StaffAttendanceRecord)
        .options(joinedload(StaffAttendanceRecord.staff_member))
        .where(
            StaffAttendanceRecord.staff_id == account.staff_id,
            StaffAttendanceRecord.attendance_date == date.today(),
        )
    )
    now = datetime.now(timezone.utc)
    if record is None:
        if payload.event_type == "out":
            raise HTTPException(status_code=409, detail="Check in before checking out")
        record = StaffAttendanceRecord(
            staff_id=account.staff_id,
            attendance_date=date.today(),
            check_in_at=now,
            status="Present",
        )
        session.add(record)
    elif payload.event_type == "in":
        if record.check_in_at is not None:
            raise HTTPException(status_code=409, detail="Already checked in today")
        record.check_in_at = now
        record.status = "Present"
    else:
        if record.check_in_at is None:
            raise HTTPException(status_code=409, detail="Check in before checking out")
        if record.check_out_at is not None:
            raise HTTPException(status_code=409, detail="Already checked out today")
        record.check_out_at = now
    session.commit()
    session.refresh(record)
    return _staff_attendance_response(record)


@app.get("/api/announcements", response_model=list[AnnouncementResponse])
def list_announcements(
    session: DbSession,
    account: Annotated[
        UserPrincipal,
        Depends(
            require_roles("principal", "office", "teacher", "security", "student", "parent")
        ),
    ],
):
    announcements = session.scalars(
        select(Announcement).order_by(Announcement.published_at.desc())
    ).all()
    return [
        {
            "id": str(announcement.id),
            "title": announcement.title,
            "body": announcement.body,
            "published_at": announcement.published_at,
        }
        for announcement in announcements
    ]


@app.get("/api/settings", response_model=list[SystemSettingResponse])
def list_system_settings(
    session: DbSession,
    account: Annotated[
        UserPrincipal,
        Depends(
            require_roles("principal", "office", "teacher", "security", "student", "parent")
        ),
    ],
):
    settings = session.scalars(select(SystemSetting).order_by(SystemSetting.key)).all()
    return settings


@app.put("/api/settings/{setting_key}", response_model=SystemSettingResponse)
def update_system_setting(
    setting_key: str,
    payload: SystemSettingInput,
    session: DbSession,
    account: Annotated[UserPrincipal, Depends(require_roles("principal"))],
):
    if setting_key not in SYSTEM_SETTING_DEFAULTS:
        raise HTTPException(status_code=404, detail="Setting not found")
    setting = session.get(SystemSetting, setting_key)
    if setting is None:
        setting = SystemSetting(key=setting_key, enabled=payload.enabled)
        session.add(setting)
    else:
        setting.enabled = payload.enabled
    setting.updated_by = account.staff_id
    setting.updated_at = datetime.now(timezone.utc)
    session.commit()
    session.refresh(setting)
    return setting


@app.get("/api/dashboard")
def dashboard_summary(
    session: DbSession,
    account: Annotated[
        UserPrincipal,
        Depends(
            require_roles("principal", "office", "teacher", "security")
        ),
    ],
):
    active_students = session.scalar(
        select(func.count()).select_from(Student).where(Student.status == "Active")
    ) or 0
    active_staff = session.scalar(
        select(func.count()).select_from(StaffMember).where(StaffMember.status == "Active")
    ) or 0
    teaching_staff = session.scalar(
        select(func.count()).select_from(StaffMember).where(
            StaffMember.status == "Active", StaffMember.role == "Teacher"
        )
    ) or 0
    office_staff = session.scalar(
        select(func.count()).select_from(StaffMember).where(
            StaffMember.status == "Active", StaffMember.role == "Office Staff"
        )
    ) or 0
    present_students = session.scalar(
        select(func.count()).select_from(AttendanceRecord).where(
            AttendanceRecord.attendance_date == date.today(),
            AttendanceRecord.status == "Present",
        )
    ) or 0
    pending_leaves = session.scalar(
        select(func.count()).select_from(LeaveRequest).where(
            LeaveRequest.status == "Pending"
        )
    ) or 0
    active_visitors = session.scalar(
        select(func.count()).select_from(Visitor).where(Visitor.checked_out_at.is_(None))
    ) or 0
    return {
        "students": active_students,
        "staff": active_staff,
        "teachers": teaching_staff,
        "officeStaff": office_staff,
        "presentStudents": present_students,
        "attendancePercent": round(present_students * 100 / active_students, 1)
        if active_students
        else 0,
        "pendingLeaves": pending_leaves,
        "activeVisitors": active_visitors,
    }


def _timetable_entry_response(entry: TimetableEntry) -> TimetableEntryResponse:
    return TimetableEntryResponse(
        id=str(entry.id),
        class_name=entry.school_class.name,
        subject=entry.subject.name,
        teacher_id=entry.teacher_id,
        teacher_name=entry.teacher.full_name,
        day_of_week=entry.day_of_week,
        start_time=entry.start_time,
        end_time=entry.end_time,
        room=entry.room,
    )


def _timetable_conflict(
    session: Session,
    payload: TimetableEntryInput,
    class_id: int,
    exclude_id: UUID | None = None,
) -> bool:
    query = select(TimetableEntry).where(
        TimetableEntry.day_of_week == payload.day_of_week,
        TimetableEntry.start_time < payload.end_time,
        TimetableEntry.end_time > payload.start_time,
        (
            (TimetableEntry.class_id == class_id)
            | (TimetableEntry.teacher_id == payload.teacher_id)
            | (TimetableEntry.room == payload.room.strip())
        ),
    )
    if exclude_id is not None:
        query = query.where(TimetableEntry.id != exclude_id)
    return session.scalar(query.limit(1)) is not None


def _timetable_references(
    session: Session, payload: TimetableEntryInput
) -> tuple[SchoolClass, Subject, StaffMember]:
    school_class = session.scalar(
        select(SchoolClass).where(SchoolClass.name == payload.class_name.strip())
    )
    subject = session.scalar(
        select(Subject).where(Subject.name == payload.subject.strip())
    )
    teacher = session.get(StaffMember, payload.teacher_id)
    if school_class is None or subject is None:
        raise HTTPException(status_code=404, detail="Class or subject not found")
    if teacher is None or teacher.role != "Teacher" or teacher.status != "Active":
        raise HTTPException(status_code=404, detail="Active teacher not found")
    if payload.end_time <= payload.start_time:
        raise HTTPException(
            status_code=422, detail="End time must be later than start time"
        )
    return school_class, subject, teacher


def _raise_on_timetable_conflict(
    session: Session,
    payload: TimetableEntryInput,
    class_id: int,
    exclude_id: UUID | None = None,
) -> None:
    if _timetable_conflict(session, payload, class_id, exclude_id):
        raise HTTPException(
            status_code=409,
            detail="This time conflicts with another class, teacher, or room booking",
        )


@app.get(
    "/api/timetable",
    response_model=list[TimetableEntryResponse],
    response_model_by_alias=True,
)
def list_timetable(
    session: DbSession,
    account: Annotated[
        UserPrincipal,
        Depends(require_roles("principal", "office", "teacher", "student", "parent")),
    ],
):
    query = (
        select(TimetableEntry)
        .join(TimetableEntry.school_class)
        .join(TimetableEntry.subject)
        .join(TimetableEntry.teacher)
    )
    if account.role == "teacher":
        query = query.where(TimetableEntry.teacher_id == account.staff_id)
    elif account.role == "student":
        student_class_id = session.scalar(
            select(Student.class_id).where(Student.id == account.student_id)
        )
        if student_class_id is None:
            return []
        query = query.where(TimetableEntry.class_id == student_class_id)
    elif account.role == "parent":
        query = (
            query.join(Student, Student.class_id == TimetableEntry.class_id)
            .join(Student.parents)
            .where(Parent.id == account.parent_id)
            .distinct()
        )
    entries = session.scalars(
        query.order_by(
            TimetableEntry.day_of_week,
            TimetableEntry.start_time,
            TimetableEntry.class_id,
        )
    ).all()
    return [_timetable_entry_response(entry) for entry in entries]


@app.post(
    "/api/timetable",
    response_model=TimetableEntryResponse,
    response_model_by_alias=True,
    status_code=status.HTTP_201_CREATED,
)
def create_timetable_entry(
    payload: TimetableEntryInput,
    session: DbSession,
    account: Annotated[UserPrincipal, Depends(require_roles("principal", "office"))],
):
    school_class, subject, _ = _timetable_references(session, payload)
    _raise_on_timetable_conflict(session, payload, school_class.id)
    entry = TimetableEntry(
        class_id=school_class.id,
        subject_id=subject.id,
        teacher_id=payload.teacher_id,
        day_of_week=payload.day_of_week,
        start_time=payload.start_time,
        end_time=payload.end_time,
        room=payload.room.strip(),
    )
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return _timetable_entry_response(entry)


@app.put(
    "/api/timetable/{entry_id}",
    response_model=TimetableEntryResponse,
    response_model_by_alias=True,
)
def update_timetable_entry(
    entry_id: UUID,
    payload: TimetableEntryInput,
    session: DbSession,
    account: Annotated[UserPrincipal, Depends(require_roles("principal", "office"))],
):
    entry = session.get(TimetableEntry, entry_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Timetable entry not found")
    school_class, subject, _ = _timetable_references(session, payload)
    _raise_on_timetable_conflict(
        session, payload, school_class.id, exclude_id=entry.id
    )
    entry.class_id = school_class.id
    entry.subject_id = subject.id
    entry.teacher_id = payload.teacher_id
    entry.day_of_week = payload.day_of_week
    entry.start_time = payload.start_time
    entry.end_time = payload.end_time
    entry.room = payload.room.strip()
    session.commit()
    session.refresh(entry)
    return _timetable_entry_response(entry)


@app.delete("/api/timetable/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_timetable_entry(
    entry_id: UUID,
    session: DbSession,
    account: Annotated[UserPrincipal, Depends(require_roles("principal", "office"))],
):
    entry = session.get(TimetableEntry, entry_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Timetable entry not found")
    session.delete(entry)
    session.commit()
