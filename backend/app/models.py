from datetime import date, datetime, time
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import (
    Column,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Table,
    Text,
    Time,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


student_parents = Table(
    "student_parents",
    Base.metadata,
    Column("student_id", String(20), ForeignKey("students.id", ondelete="CASCADE"), primary_key=True),
    Column("parent_id", Uuid(as_uuid=True), ForeignKey("parents.id", ondelete="CASCADE"), primary_key=True),
)


class SchoolClass(Base):
    __tablename__ = "school_classes"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    students: Mapped[list["Student"]] = relationship(back_populates="school_class")


class Subject(Base):
    __tablename__ = "subjects"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    grades: Mapped[list["Grade"]] = relationship(back_populates="subject")


class StaffMember(Base):
    __tablename__ = "staff_members"
    __table_args__ = (
        CheckConstraint(
            "role IN ('Teacher', 'Office Staff', 'Principal', 'Security')",
            name="ck_staff_members_role",
        ),
        CheckConstraint(
            "status IN ('Active', 'Inactive')",
            name="ck_staff_members_status",
        ),
    )

    id: Mapped[str] = mapped_column(String(20), primary_key=True)
    full_name: Mapped[str] = mapped_column(String(160), nullable=False)
    email: Mapped[str | None] = mapped_column(String(254), unique=True)
    role: Mapped[str] = mapped_column(String(30), nullable=False)
    department: Mapped[str | None] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="Active")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    user_account: Mapped["UserAccount | None"] = relationship(
        back_populates="staff_member",
        uselist=False,
        cascade="all, delete-orphan",
    )
    leave_requests: Mapped[list["LeaveRequest"]] = relationship(
        back_populates="staff_member", foreign_keys="LeaveRequest.staff_id"
    )


class Student(Base):
    __tablename__ = "students"
    __table_args__ = (
        CheckConstraint(
            "status IN ('Active', 'Inactive', 'Graduated')",
            name="ck_students_status",
        ),
    )

    id: Mapped[str] = mapped_column(String(20), primary_key=True)
    full_name: Mapped[str] = mapped_column(String(160), nullable=False)
    email: Mapped[str] = mapped_column(String(254), unique=True, nullable=False)
    class_id: Mapped[int] = mapped_column(
        ForeignKey("school_classes.id", ondelete="RESTRICT"), nullable=False
    )
    avatar_url: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="Active")
    enrolled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    school_class: Mapped[SchoolClass] = relationship(back_populates="students")
    user_account: Mapped["UserAccount | None"] = relationship(
        back_populates="student",
        uselist=False,
        cascade="all, delete-orphan",
    )
    parents: Mapped[list["Parent"]] = relationship(
        secondary=student_parents, back_populates="students"
    )
    grades: Mapped[list["Grade"]] = relationship(
        back_populates="student", cascade="all, delete-orphan"
    )
    attendance_records: Mapped[list["AttendanceRecord"]] = relationship(
        back_populates="student", cascade="all, delete-orphan"
    )
    gate_events: Mapped[list["GateEvent"]] = relationship(
        back_populates="student", cascade="all, delete-orphan"
    )


class UserAccount(Base):
    __tablename__ = "user_accounts"
    __table_args__ = (
        CheckConstraint(
            "role IN ('principal', 'teacher', 'office', 'security', 'student', 'parent')",
            name="ck_user_accounts_role",
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    email: Mapped[str] = mapped_column(String(254), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    staff_id: Mapped[str | None] = mapped_column(
        ForeignKey("staff_members.id", ondelete="CASCADE"), unique=True
    )
    student_id: Mapped[str | None] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), unique=True
    )
    parent_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("parents.id", ondelete="CASCADE"), unique=True
    )
    is_active: Mapped[bool] = mapped_column(nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    staff_member: Mapped[StaffMember | None] = relationship(back_populates="user_account")
    student: Mapped[Student | None] = relationship(back_populates="user_account")
    parent: Mapped["Parent | None"] = relationship(back_populates="user_account")


class Parent(Base):
    __tablename__ = "parents"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    full_name: Mapped[str] = mapped_column(String(160), nullable=False)
    email: Mapped[str | None] = mapped_column(String(254), unique=True)
    phone: Mapped[str] = mapped_column(String(30), nullable=False)
    address: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    students: Mapped[list[Student]] = relationship(
        secondary=student_parents, back_populates="parents"
    )
    user_account: Mapped["UserAccount | None"] = relationship(
        back_populates="parent",
        uselist=False,
        cascade="all, delete-orphan",
    )


class Grade(Base):
    __tablename__ = "grades"
    __table_args__ = (
        CheckConstraint("score >= 0 AND score <= 100", name="ck_grades_score_range"),
        UniqueConstraint(
            "student_id",
            "subject_id",
            "academic_year",
            "term",
            name="uq_grades_student_subject_year_term",
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    student_id: Mapped[str] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )
    subject_id: Mapped[int] = mapped_column(
        ForeignKey("subjects.id", ondelete="RESTRICT"), nullable=False
    )
    teacher_id: Mapped[str | None] = mapped_column(
        ForeignKey("staff_members.id", ondelete="SET NULL")
    )
    academic_year: Mapped[int] = mapped_column(nullable=False)
    term: Mapped[str] = mapped_column(String(30), nullable=False)
    score: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    student: Mapped[Student] = relationship(back_populates="grades")
    subject: Mapped[Subject] = relationship(back_populates="grades")


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"
    __table_args__ = (
        CheckConstraint(
            "status IN ('Present', 'Absent', 'Late', 'Excused')",
            name="ck_attendance_records_status",
        ),
        UniqueConstraint("student_id", "attendance_date", name="uq_attendance_student_date"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    student_id: Mapped[str] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )
    attendance_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    check_in_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    check_out_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    recorded_by: Mapped[str | None] = mapped_column(
        ForeignKey("staff_members.id", ondelete="SET NULL")
    )
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    student: Mapped[Student] = relationship(back_populates="attendance_records")


class StaffAttendanceRecord(Base):
    __tablename__ = "staff_attendance_records"
    __table_args__ = (
        CheckConstraint(
            "status IN ('Present', 'Absent', 'Late', 'Excused')",
            name="ck_staff_attendance_status",
        ),
        UniqueConstraint(
            "staff_id", "attendance_date", name="uq_staff_attendance_date"
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    staff_id: Mapped[str] = mapped_column(
        ForeignKey("staff_members.id", ondelete="CASCADE"), nullable=False
    )
    attendance_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    check_in_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    check_out_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    staff_member: Mapped[StaffMember] = relationship()


class GateEvent(Base):
    __tablename__ = "gate_events"
    __table_args__ = (
        CheckConstraint(
            "event_type IN ('Entry', 'Exit')",
            name="ck_gate_events_type",
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    student_id: Mapped[str] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )
    event_type: Mapped[str] = mapped_column(String(10), nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    recorded_by: Mapped[str | None] = mapped_column(
        ForeignKey("staff_members.id", ondelete="SET NULL")
    )

    student: Mapped[Student] = relationship(back_populates="gate_events")


class LeaveRequest(Base):
    __tablename__ = "leave_requests"
    __table_args__ = (
        CheckConstraint(
            "status IN ('Pending', 'Approved', 'Rejected')",
            name="ck_leave_requests_status",
        ),
        CheckConstraint("end_time > start_time", name="ck_leave_requests_time_range"),
    )

    id: Mapped[str] = mapped_column(String(20), primary_key=True)
    staff_id: Mapped[str] = mapped_column(
        ForeignKey("staff_members.id", ondelete="CASCADE"), nullable=False
    )
    leave_date: Mapped[date] = mapped_column(Date, nullable=False)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="Pending")
    remarks: Mapped[str | None] = mapped_column(Text)
    reviewed_by: Mapped[str | None] = mapped_column(
        ForeignKey("staff_members.id", ondelete="SET NULL")
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    staff_member: Mapped[StaffMember] = relationship(
        back_populates="leave_requests", foreign_keys=[staff_id]
    )
    reviewer: Mapped[StaffMember | None] = relationship(foreign_keys=[reviewed_by])


class Visitor(Base):
    __tablename__ = "visitors"
    __table_args__ = (
        CheckConstraint(
            "checked_out_at IS NULL OR checked_out_at >= checked_in_at",
            name="ck_visitors_checkout_after_checkin",
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    visitor_name: Mapped[str] = mapped_column(String(160), nullable=False)
    id_number: Mapped[str | None] = mapped_column(String(50))
    phone: Mapped[str | None] = mapped_column(String(30))
    purpose: Mapped[str] = mapped_column(Text, nullable=False)
    person_to_visit: Mapped[str] = mapped_column(String(160), nullable=False)
    vehicle_number: Mapped[str | None] = mapped_column(String(30))
    checked_in_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    checked_out_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    recorded_by: Mapped[str | None] = mapped_column(
        ForeignKey("staff_members.id", ondelete="SET NULL")
    )


class Announcement(Base):
    __tablename__ = "announcements"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    published_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    created_by: Mapped[str | None] = mapped_column(
        ForeignKey("staff_members.id", ondelete="SET NULL")
    )


class SystemSetting(Base):
    __tablename__ = "system_settings"

    key: Mapped[str] = mapped_column(String(50), primary_key=True)
    enabled: Mapped[bool] = mapped_column(nullable=False, default=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_by: Mapped[str | None] = mapped_column(
        ForeignKey("staff_members.id", ondelete="SET NULL")
    )
