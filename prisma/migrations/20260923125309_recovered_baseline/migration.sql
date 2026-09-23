-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('ADMIN', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "DayType" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CoverRequestStatus" AS ENUM ('OPEN', 'PENDING_USER', 'PENDING_ADMIN', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CoverRequestType" AS ENUM ('COVER', 'SWAP');

-- CreateEnum
CREATE TYPE "AvailabilityEntryMode" AS ENUM ('TIME', 'SHIFT');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone_number" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stores" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_users" (
    "store_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "user_type" "UserType" NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "store_users_pkey" PRIMARY KEY ("store_id","user_id")
);

-- CreateTable
CREATE TABLE "work_types" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "archived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "work_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_user_work_types" (
    "store_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "work_type_id" UUID NOT NULL,

    CONSTRAINT "store_user_work_types_pkey" PRIMARY KEY ("store_id","user_id","work_type_id")
);

-- CreateTable
CREATE TABLE "shift_types" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "shift_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_type_day_times" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "shift_type_id" UUID NOT NULL,
    "day_of_week" "DayType" NOT NULL,
    "start_time" TIME(0) NOT NULL,
    "end_time" TIME(0) NOT NULL,

    CONSTRAINT "shift_type_day_times_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "week_shift_requirements" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "shift_type_id" UUID NOT NULL,
    "day_of_week" "DayType" NOT NULL,
    "work_type_id" UUID NOT NULL,
    "required_count" INTEGER NOT NULL,
    "weekly_template_id" UUID NOT NULL,

    CONSTRAINT "week_shift_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_templates" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weekly_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedules" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "status" "ScheduleStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by" UUID NOT NULL,
    "published_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "published_at" TIMESTAMP(3),

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_weeks" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "schedule_id" UUID NOT NULL,
    "weekly_template_id" UUID,
    "week_start_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_weeks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_days" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "schedule_week_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "day_of_week" "DayType" NOT NULL,
    "admin_notes" TEXT,
    "employee_notes" TEXT,

    CONSTRAINT "schedule_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_assignments" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "schedule_day_id" UUID NOT NULL,
    "user_id" UUID,
    "work_type_id" UUID NOT NULL,
    "shift_type_id" UUID,
    "start_time" TIME(0) NOT NULL,
    "end_time" TIME(0) NOT NULL,
    "assigned_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shift_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability_periods" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "entry_mode" "AvailabilityEntryMode" NOT NULL,
    "is_open" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "availability_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "day_availability" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "user_availability_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "start_time" TIME(0) NOT NULL,
    "end_time" TIME(0) NOT NULL,

    CONSTRAINT "day_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability_shift_preferences" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "user_availability_id" UUID NOT NULL,
    "day_of_week" "DayType" NOT NULL,
    "shift_type_id" UUID NOT NULL,

    CONSTRAINT "availability_shift_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_availability" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "availability_period_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "preferred_num_shifts" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cover_requests" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "shift_assignment_id" UUID NOT NULL,
    "swap_assignment_id" UUID,
    "request_type" "CoverRequestType" NOT NULL DEFAULT 'COVER',
    "requesting_user_id" UUID NOT NULL,
    "covering_user_id" UUID,
    "status" "CoverRequestStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "cover_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cover_request_events" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "cover_request_id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cover_request_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "store_users_store_id_idx" ON "store_users"("store_id");

-- CreateIndex
CREATE INDEX "store_users_user_id_idx" ON "store_users"("user_id");

-- CreateIndex
CREATE INDEX "work_types_store_id_idx" ON "work_types"("store_id");

-- CreateIndex
CREATE UNIQUE INDEX "work_types_store_id_name_key" ON "work_types"("store_id", "name");

-- CreateIndex
CREATE INDEX "store_user_work_types_store_id_user_id_idx" ON "store_user_work_types"("store_id", "user_id");

-- CreateIndex
CREATE INDEX "store_user_work_types_work_type_id_idx" ON "store_user_work_types"("work_type_id");

-- CreateIndex
CREATE INDEX "shift_types_store_id_idx" ON "shift_types"("store_id");

-- CreateIndex
CREATE UNIQUE INDEX "shift_types_store_id_name_key" ON "shift_types"("store_id", "name");

-- CreateIndex
CREATE INDEX "shift_type_day_times_store_id_idx" ON "shift_type_day_times"("store_id");

-- CreateIndex
CREATE UNIQUE INDEX "shift_type_day_times_shift_type_id_day_of_week_key" ON "shift_type_day_times"("shift_type_id", "day_of_week");

-- CreateIndex
CREATE INDEX "week_shift_requirements_store_id_idx" ON "week_shift_requirements"("store_id");

-- CreateIndex
CREATE INDEX "week_shift_requirements_weekly_template_id_idx" ON "week_shift_requirements"("weekly_template_id");

-- CreateIndex
CREATE UNIQUE INDEX "week_shift_requirements_weekly_template_id_shift_type_id_da_key" ON "week_shift_requirements"("weekly_template_id", "shift_type_id", "day_of_week", "work_type_id");

-- CreateIndex
CREATE INDEX "weekly_templates_store_id_idx" ON "weekly_templates"("store_id");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_templates_store_id_name_key" ON "weekly_templates"("store_id", "name");

-- CreateIndex
CREATE INDEX "schedules_store_id_idx" ON "schedules"("store_id");

-- CreateIndex
CREATE INDEX "schedule_weeks_schedule_id_idx" ON "schedule_weeks"("schedule_id");

-- CreateIndex
CREATE INDEX "schedule_weeks_weekly_template_id_idx" ON "schedule_weeks"("weekly_template_id");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_weeks_schedule_id_week_start_date_key" ON "schedule_weeks"("schedule_id", "week_start_date");

-- CreateIndex
CREATE INDEX "schedule_days_schedule_week_id_idx" ON "schedule_days"("schedule_week_id");

-- CreateIndex
CREATE INDEX "schedule_days_store_id_date_idx" ON "schedule_days"("store_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_days_schedule_week_id_date_key" ON "schedule_days"("schedule_week_id", "date");

-- CreateIndex
CREATE INDEX "shift_assignments_store_id_schedule_day_id_idx" ON "shift_assignments"("store_id", "schedule_day_id");

-- CreateIndex
CREATE INDEX "shift_assignments_store_id_user_id_idx" ON "shift_assignments"("store_id", "user_id");

-- CreateIndex
CREATE INDEX "shift_assignments_work_type_id_idx" ON "shift_assignments"("work_type_id");

-- CreateIndex
CREATE INDEX "shift_assignments_shift_type_id_idx" ON "shift_assignments"("shift_type_id");

-- CreateIndex
CREATE INDEX "availability_periods_store_id_idx" ON "availability_periods"("store_id");

-- CreateIndex
CREATE UNIQUE INDEX "availability_periods_store_id_start_date_end_date_key" ON "availability_periods"("store_id", "start_date", "end_date");

-- CreateIndex
CREATE INDEX "day_availability_store_id_date_idx" ON "day_availability"("store_id", "date");

-- CreateIndex
CREATE INDEX "day_availability_user_availability_id_idx" ON "day_availability"("user_availability_id");

-- CreateIndex
CREATE INDEX "availability_shift_preferences_store_id_idx" ON "availability_shift_preferences"("store_id");

-- CreateIndex
CREATE UNIQUE INDEX "availability_shift_preferences_user_availability_id_day_of__key" ON "availability_shift_preferences"("user_availability_id", "day_of_week", "shift_type_id");

-- CreateIndex
CREATE INDEX "user_availability_store_id_idx" ON "user_availability"("store_id");

-- CreateIndex
CREATE INDEX "user_availability_user_id_idx" ON "user_availability"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_availability_availability_period_id_user_id_key" ON "user_availability"("availability_period_id", "user_id");

-- CreateIndex
CREATE INDEX "cover_requests_store_id_status_idx" ON "cover_requests"("store_id", "status");

-- CreateIndex
CREATE INDEX "cover_requests_shift_assignment_id_idx" ON "cover_requests"("shift_assignment_id");

-- CreateIndex
CREATE INDEX "cover_requests_swap_assignment_id_idx" ON "cover_requests"("swap_assignment_id");

-- CreateIndex
CREATE INDEX "cover_request_events_store_id_idx" ON "cover_request_events"("store_id");

-- CreateIndex
CREATE INDEX "cover_request_events_cover_request_id_idx" ON "cover_request_events"("cover_request_id");

-- AddForeignKey
ALTER TABLE "stores" ADD CONSTRAINT "stores_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_users" ADD CONSTRAINT "store_users_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_users" ADD CONSTRAINT "store_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_types" ADD CONSTRAINT "work_types_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_user_work_types" ADD CONSTRAINT "store_user_work_types_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_user_work_types" ADD CONSTRAINT "store_user_work_types_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_user_work_types" ADD CONSTRAINT "store_user_work_types_work_type_id_fkey" FOREIGN KEY ("work_type_id") REFERENCES "work_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_types" ADD CONSTRAINT "shift_types_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_type_day_times" ADD CONSTRAINT "shift_type_day_times_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_type_day_times" ADD CONSTRAINT "shift_type_day_times_shift_type_id_fkey" FOREIGN KEY ("shift_type_id") REFERENCES "shift_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "week_shift_requirements" ADD CONSTRAINT "week_shift_requirements_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "week_shift_requirements" ADD CONSTRAINT "week_shift_requirements_shift_type_id_fkey" FOREIGN KEY ("shift_type_id") REFERENCES "shift_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "week_shift_requirements" ADD CONSTRAINT "week_shift_requirements_work_type_id_fkey" FOREIGN KEY ("work_type_id") REFERENCES "work_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "week_shift_requirements" ADD CONSTRAINT "week_shift_requirements_weekly_template_id_fkey" FOREIGN KEY ("weekly_template_id") REFERENCES "weekly_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_templates" ADD CONSTRAINT "weekly_templates_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_published_by_fkey" FOREIGN KEY ("published_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_weeks" ADD CONSTRAINT "schedule_weeks_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "schedules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_weeks" ADD CONSTRAINT "schedule_weeks_weekly_template_id_fkey" FOREIGN KEY ("weekly_template_id") REFERENCES "weekly_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_weeks" ADD CONSTRAINT "schedule_weeks_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_days" ADD CONSTRAINT "schedule_days_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_days" ADD CONSTRAINT "schedule_days_schedule_week_id_fkey" FOREIGN KEY ("schedule_week_id") REFERENCES "schedule_weeks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_assignments" ADD CONSTRAINT "shift_assignments_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_assignments" ADD CONSTRAINT "shift_assignments_schedule_day_id_fkey" FOREIGN KEY ("schedule_day_id") REFERENCES "schedule_days"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_assignments" ADD CONSTRAINT "shift_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_assignments" ADD CONSTRAINT "shift_assignments_work_type_id_fkey" FOREIGN KEY ("work_type_id") REFERENCES "work_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_assignments" ADD CONSTRAINT "shift_assignments_shift_type_id_fkey" FOREIGN KEY ("shift_type_id") REFERENCES "shift_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_assignments" ADD CONSTRAINT "shift_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_periods" ADD CONSTRAINT "availability_periods_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "day_availability" ADD CONSTRAINT "day_availability_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "day_availability" ADD CONSTRAINT "day_availability_user_availability_id_fkey" FOREIGN KEY ("user_availability_id") REFERENCES "user_availability"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_shift_preferences" ADD CONSTRAINT "availability_shift_preferences_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_shift_preferences" ADD CONSTRAINT "availability_shift_preferences_user_availability_id_fkey" FOREIGN KEY ("user_availability_id") REFERENCES "user_availability"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_shift_preferences" ADD CONSTRAINT "availability_shift_preferences_shift_type_id_fkey" FOREIGN KEY ("shift_type_id") REFERENCES "shift_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_availability" ADD CONSTRAINT "user_availability_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_availability" ADD CONSTRAINT "user_availability_availability_period_id_fkey" FOREIGN KEY ("availability_period_id") REFERENCES "availability_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_availability" ADD CONSTRAINT "user_availability_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cover_requests" ADD CONSTRAINT "cover_requests_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cover_requests" ADD CONSTRAINT "cover_requests_shift_assignment_id_fkey" FOREIGN KEY ("shift_assignment_id") REFERENCES "shift_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cover_requests" ADD CONSTRAINT "cover_requests_swap_assignment_id_fkey" FOREIGN KEY ("swap_assignment_id") REFERENCES "shift_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cover_requests" ADD CONSTRAINT "cover_requests_requesting_user_id_fkey" FOREIGN KEY ("requesting_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cover_requests" ADD CONSTRAINT "cover_requests_covering_user_id_fkey" FOREIGN KEY ("covering_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cover_request_events" ADD CONSTRAINT "cover_request_events_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cover_request_events" ADD CONSTRAINT "cover_request_events_cover_request_id_fkey" FOREIGN KEY ("cover_request_id") REFERENCES "cover_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cover_request_events" ADD CONSTRAINT "cover_request_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
