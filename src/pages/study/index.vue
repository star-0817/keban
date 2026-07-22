<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { storeToRefs } from "pinia";

import AppShell from "@/components/layout/AppShell.vue";
import type { EntityId, UtcIsoDateTime } from "@/domain";
import type { Course, ScheduleEvent, Weekday } from "@/domain/schedule";
import {
  ATTENDANCE_STATUSES,
  DEFAULT_GPA_RULE,
  type AttendanceGroupBy,
  type AttendanceRecord,
  type AttendanceStatus,
  type CourseGrade,
} from "@/domain/study";
import { useStudyToolsStore } from "@/stores/studyTools";

type SegmentKey = "courses" | "events" | "gpa" | "attendance";
type GradeMode = "score" | "level";
type AttendanceGroupMode = "course" | "month";

type CourseForm = {
  name: string;
  teacher: string;
  location: string;
  weekday: number;
  startSlot: number;
  endSlot: number;
  startTime: string;
  endTime: string;
  termId: string;
};

type EventForm = {
  title: string;
  startsAt: string;
  endsAt: string;
  location: string;
  note: string;
};

type GpaRow = {
  id: string;
  name: string;
  credit: number;
  mode: GradeMode;
  score: number;
  level: string;
};

type AttendanceRow = {
  id: string;
  courseId: string;
  status: AttendanceStatus;
  occurredAt: string;
};

const studyStore = useStudyToolsStore();
const {
  courses,
  events,
  gpaResult,
  attendanceResult,
  temporaryDataNotice,
  errorMessage,
  loading,
} = storeToRefs(studyStore);

const activeSegment = ref<SegmentKey>("courses");
const selectedWeekday = ref<Weekday>(1);
const selectedTermId = ref("2026-fall");
const eventRangeStart = ref("2026-07-01T00:00:00.000Z");
const eventRangeEnd = ref("2026-08-01T00:00:00.000Z");
const editingCourseId = ref<EntityId | null>(null);
const editingEventId = ref<EntityId | null>(null);
const formMessage = ref("");
const attendanceGroupMode = ref<AttendanceGroupMode>("course");

const courseForm = reactive<CourseForm>({
  name: "",
  teacher: "",
  location: "",
  weekday: 1,
  startSlot: 1,
  endSlot: 2,
  startTime: "08:00",
  endTime: "09:40",
  termId: "2026-fall",
});

const eventForm = reactive<EventForm>({
  title: "",
  startsAt: "2026-07-23T01:00:00.000Z",
  endsAt: "2026-07-23T02:00:00.000Z",
  location: "",
  note: "",
});

const gpaRows = ref<GpaRow[]>([
  createGpaRow("gpa-1", "高等数学", 3, "score", 95, "优秀"),
]);
const attendanceRows = ref<AttendanceRow[]>([
  createAttendanceRow(
    "attendance-1",
    "高等数学",
    "出勤",
    "2026-07-23T01:00:00.000Z",
  ),
]);

const segmentItems: readonly { key: SegmentKey; label: string }[] = [
  { key: "courses", label: "课程表" },
  { key: "events", label: "日程" },
  { key: "gpa", label: "绩点" },
  { key: "attendance", label: "考勤" },
];

const weekdays: readonly { value: Weekday; label: string }[] = [
  { value: 1, label: "周一" },
  { value: 2, label: "周二" },
  { value: 3, label: "周三" },
  { value: 4, label: "周四" },
  { value: 5, label: "周五" },
  { value: 6, label: "周六" },
  { value: 7, label: "周日" },
];

const levelOptions = computed(() =>
  Object.keys(DEFAULT_GPA_RULE.levelGradePoints),
);

onMounted(async () => {
  await reloadCourses();
  await reloadEvents();
  await calculateGpaRows();
  await calculateAttendanceRows();
});

async function reloadCourses(): Promise<void> {
  await studyStore.loadCourses(selectedWeekday.value, selectedTermId.value);
}

async function reloadEvents(): Promise<void> {
  await studyStore.loadEvents(eventRangeStart.value, eventRangeEnd.value);
}

async function submitCourse(): Promise<void> {
  formMessage.value = "";
  const input = {
    name: courseForm.name,
    teacher: courseForm.teacher,
    location: courseForm.location,
    weekday: Number(courseForm.weekday),
    startSlot: Number(courseForm.startSlot),
    endSlot: Number(courseForm.endSlot),
    startTime: courseForm.startTime,
    endTime: courseForm.endTime,
    termId: courseForm.termId,
  };

  if (editingCourseId.value === null) {
    await studyStore.addCourse(
      input,
      selectedWeekday.value,
      selectedTermId.value,
    );
  } else {
    await studyStore.updateCourse(
      editingCourseId.value,
      input,
      selectedWeekday.value,
      selectedTermId.value,
    );
  }

  if (!studyStore.errorMessage) {
    resetCourseForm();
    formMessage.value = "课程已保存";
  }
}

function startEditingCourse(course: Course): void {
  editingCourseId.value = course.id;
  courseForm.name = course.name;
  courseForm.teacher = course.teacher ?? "";
  courseForm.location = course.location ?? "";
  courseForm.weekday = course.weekday;
  courseForm.startSlot = course.startSlot;
  courseForm.endSlot = course.endSlot;
  courseForm.startTime = course.startTime;
  courseForm.endTime = course.endTime;
  courseForm.termId = course.termId;
}

function resetCourseForm(): void {
  editingCourseId.value = null;
  courseForm.name = "";
  courseForm.teacher = "";
  courseForm.location = "";
  courseForm.weekday = selectedWeekday.value;
  courseForm.startSlot = 1;
  courseForm.endSlot = 2;
  courseForm.startTime = "08:00";
  courseForm.endTime = "09:40";
  courseForm.termId = selectedTermId.value;
}

function confirmDeleteCourse(course: Course): void {
  uni.showModal({
    title: "删除课程",
    content: `确定删除「${course.name}」吗？`,
    confirmText: "删除",
    cancelText: "取消",
    success: (result) => {
      if (result.confirm) {
        void studyStore.deleteCourse(
          course.id,
          selectedWeekday.value,
          selectedTermId.value,
        );
      }
    },
  });
}

async function submitEvent(): Promise<void> {
  formMessage.value = "";
  const input = {
    title: eventForm.title,
    startsAt: eventForm.startsAt,
    endsAt: eventForm.endsAt,
    location: eventForm.location,
    note: eventForm.note,
  };

  if (editingEventId.value === null) {
    await studyStore.addEvent(
      input,
      eventRangeStart.value,
      eventRangeEnd.value,
    );
  } else {
    await studyStore.updateEvent(
      editingEventId.value,
      input,
      eventRangeStart.value,
      eventRangeEnd.value,
    );
  }

  if (!studyStore.errorMessage) {
    resetEventForm();
    formMessage.value = "日程已保存";
  }
}

function startEditingEvent(event: ScheduleEvent): void {
  editingEventId.value = event.id;
  eventForm.title = event.title;
  eventForm.startsAt = event.startsAt;
  eventForm.endsAt = event.endsAt;
  eventForm.location = event.location ?? "";
  eventForm.note = event.note ?? "";
}

function resetEventForm(): void {
  editingEventId.value = null;
  eventForm.title = "";
  eventForm.startsAt = "2026-07-23T01:00:00.000Z";
  eventForm.endsAt = "2026-07-23T02:00:00.000Z";
  eventForm.location = "";
  eventForm.note = "";
}

function confirmDeleteEvent(event: ScheduleEvent): void {
  uni.showModal({
    title: "删除日程",
    content: `确定删除「${event.title}」吗？`,
    confirmText: "删除",
    cancelText: "取消",
    success: (result) => {
      if (result.confirm) {
        void studyStore.deleteEvent(
          event.id,
          eventRangeStart.value,
          eventRangeEnd.value,
        );
      }
    },
  });
}

async function calculateGpaRows(): Promise<void> {
  await studyStore.calculateGpa(gpaRows.value.map(rowToCourseGrade));
}

function addGpaRow(): void {
  gpaRows.value = [
    ...gpaRows.value,
    createGpaRow(`gpa-${Date.now()}`, "", 1, "score", 90, "优秀"),
  ];
}

async function removeGpaRow(id: string): Promise<void> {
  gpaRows.value = gpaRows.value.filter((row) => row.id !== id);
  await calculateGpaRows();
}

async function calculateAttendanceRows(): Promise<void> {
  const groupBy: AttendanceGroupBy =
    attendanceGroupMode.value === "course"
      ? { type: "course" }
      : { type: "period", period: "month" };

  await studyStore.calculateAttendance(
    attendanceRows.value.map(rowToAttendanceRecord),
    { groupBy },
  );
}

function addAttendanceRow(): void {
  attendanceRows.value = [
    ...attendanceRows.value,
    createAttendanceRow(`attendance-${Date.now()}`, "", "出勤", ""),
  ];
}

async function removeAttendanceRow(id: string): Promise<void> {
  attendanceRows.value = attendanceRows.value.filter((row) => row.id !== id);
  await calculateAttendanceRows();
}

function rowToCourseGrade(row: GpaRow): CourseGrade {
  return {
    id: row.id as EntityId,
    name: row.name,
    credit: Number(row.credit),
    grade:
      row.mode === "score"
        ? { type: "score", score: Number(row.score) }
        : { type: "level", level: row.level },
  };
}

function rowToAttendanceRecord(row: AttendanceRow): AttendanceRecord {
  return {
    id: row.id as EntityId,
    courseId: row.courseId as EntityId,
    status: row.status,
    occurredAt: row.occurredAt as UtcIsoDateTime,
  };
}

function createGpaRow(
  id: string,
  name: string,
  credit: number,
  mode: GradeMode,
  score: number,
  level: string,
): GpaRow {
  return { id, name, credit, mode, score, level };
}

function createAttendanceRow(
  id: string,
  courseId: string,
  status: AttendanceStatus,
  occurredAt: string,
): AttendanceRow {
  return { id, courseId, status, occurredAt };
}
</script>

<template>
  <AppShell active-tab="study">
    <view class="study-page">
      <view class="page-header">
        <text class="page-title">学习</text>
        <text class="page-description">
          管理课程表和日程，并在本地计算绩点与考勤。
        </text>
      </view>

      <view class="notice">
        <text>{{ temporaryDataNotice }}</text>
      </view>

      <view class="segments">
        <button
          v-for="item in segmentItems"
          :key="item.key"
          class="segment"
          :class="{ 'segment--active': activeSegment === item.key }"
          type="button"
          @tap="activeSegment = item.key"
        >
          {{ item.label }}
        </button>
      </view>

      <view v-if="errorMessage" class="error-banner">
        <text>{{ errorMessage }}</text>
      </view>
      <view v-if="formMessage" class="success-banner">
        <text>{{ formMessage }}</text>
      </view>

      <view v-if="activeSegment === 'courses'" class="panel">
        <view class="panel-header">
          <text class="panel-title">课程表</text>
          <text class="panel-meta">按开始节次排序</text>
        </view>

        <view class="filters">
          <view class="field">
            <text class="label">星期</text>
            <view class="weekday-grid">
              <button
                v-for="weekday in weekdays"
                :key="weekday.value"
                class="mini-button"
                :class="{
                  'mini-button--active': selectedWeekday === weekday.value,
                }"
                type="button"
                @tap="
                  selectedWeekday = weekday.value;
                  courseForm.weekday = weekday.value;
                  reloadCourses();
                "
              >
                {{ weekday.label }}
              </button>
            </view>
          </view>
          <view class="field">
            <text class="label">学期标识</text>
            <input
              v-model="selectedTermId"
              class="input"
              placeholder="例如 2026-fall"
              @blur="
                courseForm.termId = selectedTermId;
                reloadCourses();
              "
            />
          </view>
        </view>

        <view class="form">
          <input
            v-model="courseForm.name"
            class="input"
            placeholder="课程名称（必填）"
          />
          <input
            v-model="courseForm.teacher"
            class="input"
            placeholder="教师"
          />
          <input
            v-model="courseForm.location"
            class="input"
            placeholder="地点"
          />
          <view class="grid-two">
            <input
              v-model.number="courseForm.startSlot"
              class="input"
              type="number"
              placeholder="开始节次"
            />
            <input
              v-model.number="courseForm.endSlot"
              class="input"
              type="number"
              placeholder="结束节次"
            />
          </view>
          <view class="grid-two">
            <input
              v-model="courseForm.startTime"
              class="input"
              placeholder="开始时间 HH:mm"
            />
            <input
              v-model="courseForm.endTime"
              class="input"
              placeholder="结束时间 HH:mm"
            />
          </view>
          <view class="button-row">
            <button
              class="primary-button"
              type="button"
              :disabled="loading"
              @tap="submitCourse"
            >
              {{ editingCourseId === null ? "新增课程" : "保存课程" }}
            </button>
            <button
              v-if="editingCourseId !== null"
              class="secondary-button"
              type="button"
              @tap="resetCourseForm"
            >
              取消
            </button>
          </view>
        </view>

        <view v-if="courses.length === 0" class="empty-state">
          <text>暂无课程，请先新增本学期该星期的课程。</text>
        </view>
        <view v-else class="item-list">
          <view v-for="course in courses" :key="course.id" class="item">
            <view class="item-main">
              <text class="item-title">{{ course.name }}</text>
              <text class="item-detail">
                第 {{ course.startSlot }}-{{ course.endSlot }} 节 ·
                {{ course.startTime }}-{{ course.endTime }}
              </text>
              <text class="item-detail">
                {{ course.teacher || "未填写教师" }} ·
                {{ course.location || "未填写地点" }}
              </text>
            </view>
            <view class="item-actions">
              <button
                class="mini-button"
                type="button"
                @tap="startEditingCourse(course)"
              >
                编辑
              </button>
              <button
                class="mini-button mini-button--danger"
                type="button"
                @tap="confirmDeleteCourse(course)"
              >
                删除
              </button>
            </view>
          </view>
        </view>
      </view>

      <view v-if="activeSegment === 'events'" class="panel">
        <view class="panel-header">
          <text class="panel-title">日程</text>
          <text class="panel-meta">使用 UTC ISO 时间</text>
        </view>
        <view class="grid-two">
          <input
            v-model="eventRangeStart"
            class="input"
            placeholder="范围开始 UTC"
            @blur="reloadEvents"
          />
          <input
            v-model="eventRangeEnd"
            class="input"
            placeholder="范围结束 UTC"
            @blur="reloadEvents"
          />
        </view>
        <view class="form">
          <input
            v-model="eventForm.title"
            class="input"
            placeholder="标题（必填）"
          />
          <input
            v-model="eventForm.startsAt"
            class="input"
            placeholder="开始时间 UTC ISO"
          />
          <input
            v-model="eventForm.endsAt"
            class="input"
            placeholder="结束时间 UTC ISO"
          />
          <input
            v-model="eventForm.location"
            class="input"
            placeholder="地点"
          />
          <textarea
            v-model="eventForm.note"
            class="textarea"
            placeholder="备注"
          />
          <view class="button-row">
            <button
              class="primary-button"
              type="button"
              :disabled="loading"
              @tap="submitEvent"
            >
              {{ editingEventId === null ? "新增日程" : "保存日程" }}
            </button>
            <button
              v-if="editingEventId !== null"
              class="secondary-button"
              type="button"
              @tap="resetEventForm"
            >
              取消
            </button>
          </view>
        </view>

        <view v-if="events.length === 0" class="empty-state">
          <text>当前时间范围内暂无日程。</text>
        </view>
        <view v-else class="item-list">
          <view v-for="event in events" :key="event.id" class="item">
            <view class="item-main">
              <text class="item-title">{{ event.title }}</text>
              <text class="item-detail">
                {{ event.startsAt }} 至 {{ event.endsAt }}
              </text>
              <text class="item-detail">{{
                event.location || "未填写地点"
              }}</text>
              <text v-if="event.note" class="item-detail">{{
                event.note
              }}</text>
            </view>
            <view class="item-actions">
              <button
                class="mini-button"
                type="button"
                @tap="startEditingEvent(event)"
              >
                编辑
              </button>
              <button
                class="mini-button mini-button--danger"
                type="button"
                @tap="confirmDeleteEvent(event)"
              >
                删除
              </button>
            </view>
          </view>
        </view>
      </view>

      <view v-if="activeSegment === 'gpa'" class="panel">
        <view class="panel-header">
          <text class="panel-title">绩点计算</text>
          <button class="mini-button" type="button" @tap="addGpaRow">
            添加
          </button>
        </view>
        <view v-for="row in gpaRows" :key="row.id" class="calc-row">
          <input v-model="row.name" class="input" placeholder="课程名称" />
          <view class="grid-two">
            <input
              v-model.number="row.credit"
              class="input"
              type="number"
              placeholder="学分"
            />
            <view class="mode-row">
              <button
                class="mini-button"
                :class="{ 'mini-button--active': row.mode === 'score' }"
                type="button"
                @tap="row.mode = 'score'"
              >
                百分制
              </button>
              <button
                class="mini-button"
                :class="{ 'mini-button--active': row.mode === 'level' }"
                type="button"
                @tap="row.mode = 'level'"
              >
                等级制
              </button>
            </view>
          </view>
          <input
            v-if="row.mode === 'score'"
            v-model.number="row.score"
            class="input"
            type="number"
            placeholder="百分制成绩"
          />
          <view v-else class="weekday-grid">
            <button
              v-for="level in levelOptions"
              :key="level"
              class="mini-button"
              :class="{ 'mini-button--active': row.level === level }"
              type="button"
              @tap="row.level = level"
            >
              {{ level }}
            </button>
          </view>
          <button
            class="mini-button mini-button--danger"
            type="button"
            @tap="removeGpaRow(row.id)"
          >
            删除本行
          </button>
        </view>
        <button class="primary-button" type="button" @tap="calculateGpaRows">
          计算绩点
        </button>

        <view v-if="gpaResult" class="result-box">
          <text class="result-number"
            >加权绩点 {{ gpaResult.weightedGpa }}</text
          >
          <text class="item-detail">
            总学分 {{ gpaResult.totalCredits }} · 纳入
            {{ gpaResult.courseCount }} 门
          </text>
          <text
            v-for="detail in gpaResult.details"
            :key="detail.courseId"
            class="result-line"
          >
            {{ detail.courseName }}：{{ detail.credit }} 学分，绩点
            {{ detail.gradePoint }}
          </text>
        </view>
      </view>

      <view v-if="activeSegment === 'attendance'" class="panel">
        <view class="panel-header">
          <text class="panel-title">考勤计算</text>
          <button class="mini-button" type="button" @tap="addAttendanceRow">
            添加
          </button>
        </view>
        <view class="segments segments--compact">
          <button
            class="segment"
            :class="{ 'segment--active': attendanceGroupMode === 'course' }"
            type="button"
            @tap="attendanceGroupMode = 'course'"
          >
            按课程
          </button>
          <button
            class="segment"
            :class="{ 'segment--active': attendanceGroupMode === 'month' }"
            type="button"
            @tap="attendanceGroupMode = 'month'"
          >
            按月
          </button>
        </view>
        <view v-for="row in attendanceRows" :key="row.id" class="calc-row">
          <input v-model="row.courseId" class="input" placeholder="课程标识" />
          <input
            v-model="row.occurredAt"
            class="input"
            placeholder="UTC 时间"
          />
          <view class="weekday-grid">
            <button
              v-for="status in ATTENDANCE_STATUSES"
              :key="status"
              class="mini-button"
              :class="{ 'mini-button--active': row.status === status }"
              type="button"
              @tap="row.status = status"
            >
              {{ status }}
            </button>
          </view>
          <button
            class="mini-button mini-button--danger"
            type="button"
            @tap="removeAttendanceRow(row.id)"
          >
            删除本行
          </button>
        </view>
        <button
          class="primary-button"
          type="button"
          @tap="calculateAttendanceRows"
        >
          计算考勤
        </button>

        <view v-if="attendanceResult" class="result-box">
          <text class="result-number">
            出勤率 {{ attendanceResult.attendanceRate }}%
          </text>
          <text class="item-detail">
            总记录 {{ attendanceResult.totalRecords }} · 折算出勤
            {{ attendanceResult.weightedAttendance }}
          </text>
          <text
            v-for="(count, status) in attendanceResult.statusCounts"
            :key="status"
            class="result-line"
          >
            {{ status }}：{{ count }} 次
          </text>
          <text
            v-for="group in attendanceResult.groups"
            :key="group.key"
            class="result-line"
          >
            {{ group.key }}：{{ group.totalRecords }} 条，出勤率
            {{ group.attendanceRate }}%
          </text>
        </view>
      </view>
    </view>
  </AppShell>
</template>

<style scoped>
.study-page {
  display: flex;
  flex-direction: column;
  gap: var(--kb-space-md);
  width: 100%;
  overflow-x: hidden;
}

.page-header,
.panel,
.form,
.item-list,
.item-main,
.calc-row,
.result-box,
.filters,
.field {
  display: flex;
  flex-direction: column;
  gap: var(--kb-space-sm);
}

.page-title {
  color: var(--kb-color-text-primary);
  font-size: var(--kb-font-title);
  font-weight: 700;
  line-height: 1.25;
}

.page-description,
.panel-meta,
.item-detail,
.label,
.result-line {
  color: var(--kb-color-text-secondary);
  font-size: var(--kb-font-body);
  line-height: 1.45;
}

.notice,
.error-banner,
.success-banner,
.panel {
  padding: var(--kb-space-md);
  background: var(--kb-color-surface);
  border: 1rpx solid var(--kb-color-border);
  border-radius: var(--kb-radius-card);
}

.notice {
  color: var(--kb-color-warning);
  background: #fff8e8;
}

.error-banner {
  color: #b42318;
  background: #fff1f0;
}

.success-banner {
  color: var(--kb-color-success);
  background: #eefbf3;
}

.segments,
.weekday-grid,
.grid-two,
.mode-row {
  display: grid;
  gap: var(--kb-space-xs);
}

.segments {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.segments--compact,
.grid-two,
.mode-row {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.weekday-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.segment,
.primary-button,
.secondary-button,
.mini-button {
  min-width: 0;
  margin: 0;
  border: 0;
  border-radius: var(--kb-radius-md);
}

.segment::after,
.primary-button::after,
.secondary-button::after,
.mini-button::after {
  border: 0;
}

.segment {
  height: 72rpx;
  color: var(--kb-color-text-secondary);
  font-size: var(--kb-font-body);
  line-height: 72rpx;
  background: var(--kb-color-surface-muted);
}

.segment--active,
.mini-button--active {
  color: var(--kb-color-brand);
  font-weight: 700;
  background: var(--kb-color-brand-soft);
}

.panel-header,
.button-row,
.item,
.item-actions {
  display: flex;
  gap: var(--kb-space-sm);
  align-items: center;
}

.panel-header,
.item {
  justify-content: space-between;
}

.panel-title,
.item-title,
.result-number {
  color: var(--kb-color-text-primary);
  font-size: var(--kb-font-body-large);
  font-weight: 700;
  line-height: 1.35;
}

.input,
.textarea {
  box-sizing: border-box;
  width: 100%;
  min-height: 84rpx;
  padding: var(--kb-space-sm);
  color: var(--kb-color-text-primary);
  font-size: var(--kb-font-body);
  line-height: 1.4;
  background: var(--kb-color-surface-muted);
  border: 1rpx solid var(--kb-color-border);
  border-radius: var(--kb-radius-md);
}

.textarea {
  height: 132rpx;
}

.primary-button,
.secondary-button {
  flex: 1;
  height: 84rpx;
  font-size: var(--kb-font-body);
  font-weight: 700;
  line-height: 84rpx;
}

.primary-button {
  color: #ffffff;
  background: var(--kb-color-brand);
}

.secondary-button,
.mini-button {
  color: var(--kb-color-text-primary);
  background: var(--kb-color-surface-muted);
}

.mini-button {
  height: 64rpx;
  padding: 0 var(--kb-space-sm);
  font-size: var(--kb-font-caption);
  line-height: 64rpx;
}

.mini-button--danger {
  color: #b42318;
}

.empty-state,
.item,
.calc-row,
.result-box {
  padding: var(--kb-space-sm);
  background: var(--kb-color-surface-muted);
  border-radius: var(--kb-radius-md);
}

.empty-state {
  color: var(--kb-color-text-secondary);
  font-size: var(--kb-font-body);
  line-height: 1.5;
  text-align: center;
}

.item-main {
  flex: 1;
  min-width: 0;
}

.item-actions {
  flex: 0 0 auto;
}
</style>
