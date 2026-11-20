from datetime import date, datetime, time
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=256)


class AuthenticatedUser(BaseModel):
    id: str
    role: str
    label: str
    short: str
    email: EmailStr
    name: str | None = None
    staffId: str | None = None
    studentId: str | None = None


class LoginResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    user: AuthenticatedUser


class StudentInput(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str = Field(min_length=1, max_length=160)
    class_name: str = Field(alias="className", min_length=1, max_length=30)
    email: EmailStr
    avatar: str | None = None


class LeaveInput(BaseModel):
    leave_date: date = Field(alias="date")
    start_time: time = Field(alias="start")
    end_time: time = Field(alias="end")
    reason: str = Field(min_length=10, max_length=400)


class LeaveDecision(BaseModel):
    status: Literal["Approved", "Rejected"]
    remarks: str | None = Field(default=None, max_length=1000)


class AttendanceInput(BaseModel):
    student_id: str = Field(alias="studentId", min_length=1, max_length=20)
    event_type: Literal["Entry", "Exit"] = Field(alias="type")


class GradeInput(BaseModel):
    student_id: str = Field(alias="studentId", min_length=1, max_length=20)
    subject: str = Field(min_length=1, max_length=80)
    academic_year: int = Field(alias="academicYear", ge=2000, le=2200)
    term: str = Field(min_length=1, max_length=30)
    score: float = Field(ge=0, le=100)


class GradeResponse(BaseModel):
    student_id: str = Field(serialization_alias="studentId")
    subject: str
    academic_year: int = Field(serialization_alias="academicYear")
    term: str
    score: float
    teacher_id: str | None = Field(serialization_alias="teacherId")


class StaffInput(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    email: EmailStr | None = None
    role: Literal["Teacher", "Office Staff", "Security", "Principal"]
    department: str | None = Field(default=None, max_length=100)


class StaffResponse(BaseModel):
    id: str
    name: str
    email: EmailStr | None
    role: str
    department: str | None
    status: str


class VisitorInput(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    id_number: str = Field(alias="idNumber", min_length=1, max_length=50)
    phone: str = Field(min_length=1, max_length=30)
    purpose: str = Field(min_length=1, max_length=500)
    person: str = Field(min_length=1, max_length=160)
    vehicle: str | None = Field(default=None, max_length=30)


class VisitorResponse(BaseModel):
    id: str
    name: str
    idNumber: str | None
    phone: str | None
    purpose: str
    person: str
    vehicle: str | None
    time: datetime
    checkout: datetime | None
    status: str


class StaffAttendanceInput(BaseModel):
    event_type: Literal["in", "out"] = Field(alias="type")


class StaffAttendanceResponse(BaseModel):
    id: str
    staff_id: str = Field(serialization_alias="staffId")
    name: str
    role: str
    check_in: datetime | None = Field(serialization_alias="checkIn")
    check_out: datetime | None = Field(serialization_alias="checkOut")
    status: str


class AnnouncementResponse(BaseModel):
    id: str
    title: str
    body: str
    published_at: datetime = Field(serialization_alias="publishedAt")


class SystemSettingInput(BaseModel):
    enabled: bool


class SystemSettingResponse(BaseModel):
    key: str
    enabled: bool
    updated_at: datetime = Field(serialization_alias="updatedAt")


class UserPrincipal(BaseModel):
    account_id: str
    email: str
    role: str
    staff_id: str | None = None
    student_id: str | None = None
    parent_id: UUID | None = None


class StudentResponse(BaseModel):
    id: str
    name: str
    className: str
    email: EmailStr
    attendance: str
    avatar: str | None = None


class LeaveResponse(BaseModel):
    id: str
    name: str
    staffId: str
    date: date
    slot: str
    reason: str
    status: str
    remarks: str | None = None
    start: time
    end: time


class AttendanceResponse(BaseModel):
    id: str
    student: StudentResponse
    time: datetime
    type: str


class AttendanceRecordResponse(BaseModel):
    student_id: str = Field(serialization_alias="studentId")
    date: date
    status: str
    check_in: datetime | None = Field(serialization_alias="checkIn")
    check_out: datetime | None = Field(serialization_alias="checkOut")
