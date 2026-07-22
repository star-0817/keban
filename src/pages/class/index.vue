<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { storeToRefs } from "pinia";

import AppShell from "@/components/layout/AppShell.vue";
import type { EntityId } from "@/domain";
import type { Student } from "@/domain/roster";
import { validateStudentInput } from "@/domain/roster";
import { useClassToolsStore } from "@/stores/classTools";

type SegmentKey = "roster" | "draw" | "group";
type GroupModeKey = "group-count" | "max-members-per-group";

const classToolsStore = useClassToolsStore();
const {
  students,
  totalCount,
  temporaryDataNotice,
  importPreview,
  drawResult,
  groupResult,
  errorMessage,
  loading,
} = storeToRefs(classToolsStore);

const activeSegment = ref<SegmentKey>("roster");
const editingStudentId = ref<EntityId | null>(null);
const importText = ref("");
const excludedIds = ref<EntityId[]>([]);
const drawCount = ref(1);
const drawExcludedNames = ref("");
const groupMode = ref<GroupModeKey>("group-count");
const groupCount = ref(2);
const maxMembersPerGroup = ref(4);
const groupExcludedNames = ref("");
const copiedSeed = ref("");

const studentForm = reactive({
  name: "",
  studentNo: "",
  note: "",
});
const formError = ref("");

const segmentItems: readonly { key: SegmentKey; label: string }[] = [
  { key: "roster", label: "名单" },
  { key: "draw", label: "抽人" },
  { key: "group", label: "分组" },
];

const availableCount = computed(
  () => students.value.length - excludedIds.value.length,
);

onMounted(async () => {
  await classToolsStore.loadStudents();
});

async function submitStudentForm(): Promise<void> {
  const validation = validateStudentInput({
    name: studentForm.name,
    studentNo: studentForm.studentNo,
    note: studentForm.note,
  });

  if (!validation.ok) {
    formError.value = validation.error.message;
    return;
  }

  if (editingStudentId.value === null) {
    await classToolsStore.addStudent(validation.value);
  } else {
    await classToolsStore.updateStudent(
      editingStudentId.value,
      validation.value,
    );
  }

  if (classToolsStore.errorMessage.length === 0) {
    resetStudentForm();
  }
}

function startEditing(student: Student): void {
  editingStudentId.value = student.id;
  studentForm.name = student.name;
  studentForm.studentNo = student.studentNo ?? "";
  studentForm.note = student.note ?? "";
  formError.value = "";
  activeSegment.value = "roster";
}

function resetStudentForm(): void {
  editingStudentId.value = null;
  studentForm.name = "";
  studentForm.studentNo = "";
  studentForm.note = "";
  formError.value = "";
}

function deleteStudent(student: Student): void {
  uni.showModal({
    title: "删除学生",
    content: `确定删除「${student.name}」吗？`,
    confirmText: "删除",
    cancelText: "取消",
    success: (result) => {
      if (result.confirm) {
        void classToolsStore.deleteStudent(student.id);
        excludedIds.value = excludedIds.value.filter((id) => id !== student.id);
      }
    },
  });
}

async function previewImport(): Promise<void> {
  if (importText.value.trim().length === 0) {
    uni.showToast({ title: "请先粘贴名单文本", icon: "none" });
    return;
  }

  await classToolsStore.previewImport(importText.value);
}

async function confirmImport(): Promise<void> {
  await classToolsStore.confirmImport();

  if (classToolsStore.errorMessage.length === 0) {
    importText.value = "";
  }
}

function toggleExcluded(studentId: EntityId): void {
  excludedIds.value = excludedIds.value.includes(studentId)
    ? excludedIds.value.filter((id) => id !== studentId)
    : [...excludedIds.value, studentId];
}

function isExcluded(studentId: EntityId): boolean {
  return excludedIds.value.includes(studentId);
}

async function drawStudents(): Promise<void> {
  await classToolsStore.drawStudents({
    count: Number(drawCount.value),
    excludedStudentIds: excludedIds.value,
    excludedNamesText: drawExcludedNames.value,
  });
}

async function groupStudents(): Promise<void> {
  await classToolsStore.groupStudents({
    mode:
      groupMode.value === "group-count"
        ? { type: "group-count", groupCount: Number(groupCount.value) }
        : {
            type: "max-members-per-group",
            maxMembersPerGroup: Number(maxMembersPerGroup.value),
          },
    excludedStudentIds: excludedIds.value,
    excludedNamesText: groupExcludedNames.value,
  });
}

function copySeed(seed: string): void {
  uni.setClipboardData({
    data: seed,
    success: () => {
      copiedSeed.value = seed;
    },
  });
}
</script>

<template>
  <AppShell active-tab="class">
    <view class="class-page">
      <view class="page-header">
        <text class="page-title">班级工具</text>
        <text class="page-description">管理名单，完成课堂抽人和随机分组。</text>
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

      <view v-if="activeSegment === 'roster'" class="panel">
        <view class="panel-header">
          <text class="panel-title">名单列表</text>
          <text class="panel-meta">共 {{ totalCount }} 人</text>
        </view>

        <view class="form">
          <input
            v-model="studentForm.name"
            class="input"
            placeholder="姓名（必填）"
            maxlength="30"
          />
          <input
            v-model="studentForm.studentNo"
            class="input"
            placeholder="学号（可选）"
            maxlength="40"
          />
          <textarea
            v-model="studentForm.note"
            class="textarea"
            placeholder="备注（可选）"
            maxlength="200"
          />
          <text v-if="formError" class="field-error">{{ formError }}</text>
          <view class="button-row">
            <button
              class="primary-button"
              type="button"
              @tap="submitStudentForm"
            >
              {{ editingStudentId === null ? "新增学生" : "保存修改" }}
            </button>
            <button
              v-if="editingStudentId !== null"
              class="secondary-button"
              type="button"
              @tap="resetStudentForm"
            >
              取消
            </button>
          </view>
        </view>

        <view class="import-box">
          <text class="sub-title">粘贴导入</text>
          <textarea
            v-model="importText"
            class="textarea textarea--large"
            placeholder="每行一个姓名，或粘贴 CSV：姓名,学号,备注"
          />
          <view class="button-row">
            <button class="secondary-button" type="button" @tap="previewImport">
              解析预览
            </button>
            <button
              class="primary-button"
              type="button"
              :disabled="
                !importPreview || importPreview.summary.validCount === 0
              "
              @tap="confirmImport"
            >
              确认导入
            </button>
          </view>

          <view v-if="importPreview" class="preview">
            <text class="preview-summary">
              有效 {{ importPreview.summary.validCount }} 条，跳过
              {{ importPreview.summary.skippedCount }} 行，错误
              {{ importPreview.summary.errorCount }} 行
            </text>
            <text
              v-for="record in importPreview.records"
              :key="`valid-${record.lineNumber}`"
              class="preview-line"
            >
              第 {{ record.lineNumber }} 行：{{ record.input.name }}
            </text>
            <text
              v-for="item in importPreview.skipped"
              :key="`skip-${item.lineNumber}`"
              class="preview-line preview-line--muted"
            >
              第 {{ item.lineNumber }} 行：{{ item.reason }}
            </text>
            <text
              v-for="item in importPreview.errors"
              :key="`error-${item.lineNumber}`"
              class="preview-line preview-line--error"
            >
              {{ item.message }}
            </text>
          </view>
        </view>

        <view v-if="students.length === 0" class="empty-state">
          <text>暂无学生，请先新增或导入名单。</text>
        </view>
        <view v-else class="student-list">
          <view
            v-for="student in students"
            :key="student.id"
            class="student-item"
          >
            <view class="student-main">
              <text class="student-name">{{ student.name }}</text>
              <text v-if="student.studentNo" class="student-detail">
                学号：{{ student.studentNo }}
              </text>
              <text v-if="student.note" class="student-detail">
                备注：{{ student.note }}
              </text>
            </view>
            <view class="student-actions">
              <button
                class="mini-button"
                type="button"
                @tap="startEditing(student)"
              >
                编辑
              </button>
              <button
                class="mini-button mini-button--danger"
                type="button"
                @tap="deleteStudent(student)"
              >
                删除
              </button>
            </view>
          </view>
        </view>
      </view>

      <view v-if="activeSegment === 'draw'" class="panel">
        <view class="panel-header">
          <text class="panel-title">随机抽人</text>
          <text class="panel-meta">可用 {{ availableCount }} 人</text>
        </view>
        <input
          v-model.number="drawCount"
          class="input"
          type="number"
          placeholder="抽取人数"
        />
        <input
          v-model="drawExcludedNames"
          class="input"
          placeholder="排除姓名，可用空格、逗号或换行分隔"
        />
        <view class="checkbox-list">
          <button
            v-for="student in students"
            :key="student.id"
            class="check-item"
            :class="{ 'check-item--active': isExcluded(student.id) }"
            type="button"
            @tap="toggleExcluded(student.id)"
          >
            {{ isExcluded(student.id) ? "已排除" : "可抽取" }} ·
            {{ student.name }}
          </button>
        </view>
        <button
          class="primary-button"
          type="button"
          :disabled="loading"
          @tap="drawStudents"
        >
          开始抽取
        </button>

        <view v-if="drawResult" class="result-box">
          <view class="seed-row">
            <text>种子：{{ drawResult.seed }}</text>
            <button
              class="mini-button"
              type="button"
              @tap="copySeed(drawResult.seed)"
            >
              复制
            </button>
          </view>
          <text
            v-for="member in drawResult.selectedMembers"
            :key="member.id"
            class="result-name"
          >
            {{ member.name }}
          </text>
        </view>
      </view>

      <view v-if="activeSegment === 'group'" class="panel">
        <view class="panel-header">
          <text class="panel-title">随机分组</text>
          <text class="panel-meta">共 {{ totalCount }} 人</text>
        </view>
        <view class="segments segments--compact">
          <button
            class="segment"
            :class="{ 'segment--active': groupMode === 'group-count' }"
            type="button"
            @tap="groupMode = 'group-count'"
          >
            指定组数
          </button>
          <button
            class="segment"
            :class="{
              'segment--active': groupMode === 'max-members-per-group',
            }"
            type="button"
            @tap="groupMode = 'max-members-per-group'"
          >
            每组最大人数
          </button>
        </view>
        <input
          v-if="groupMode === 'group-count'"
          v-model.number="groupCount"
          class="input"
          type="number"
          placeholder="组数"
        />
        <input
          v-else
          v-model.number="maxMembersPerGroup"
          class="input"
          type="number"
          placeholder="每组最大人数"
        />
        <input
          v-model="groupExcludedNames"
          class="input"
          placeholder="排除姓名，可用空格、逗号或换行分隔"
        />
        <button
          class="primary-button"
          type="button"
          :disabled="loading"
          @tap="groupStudents"
        >
          生成分组
        </button>

        <view v-if="groupResult" class="result-box">
          <view class="seed-row">
            <text>种子：{{ groupResult.seed }}</text>
            <button
              class="mini-button"
              type="button"
              @tap="copySeed(groupResult.seed)"
            >
              复制
            </button>
          </view>
          <view
            v-for="group in groupResult.groups"
            :key="group.groupNumber"
            class="group-card"
          >
            <text class="group-title">第 {{ group.groupNumber }} 组</text>
            <text class="group-members">
              {{ group.members.map((member) => member.name).join("、") }}
            </text>
          </view>
        </view>
      </view>

      <text v-if="copiedSeed" class="copy-tip"
        >已复制种子：{{ copiedSeed }}</text
      >
    </view>
  </AppShell>
</template>

<style scoped>
.class-page {
  display: flex;
  flex-direction: column;
  gap: var(--kb-space-md);
  width: 100%;
  overflow-x: hidden;
}

.page-header,
.panel,
.form,
.import-box,
.preview,
.student-list,
.result-box,
.checkbox-list {
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
.student-detail,
.preview-line,
.copy-tip {
  color: var(--kb-color-text-secondary);
  font-size: var(--kb-font-body);
  line-height: 1.45;
}

.notice,
.error-banner,
.panel {
  padding: var(--kb-space-md);
  background: var(--kb-color-surface);
  border: 1rpx solid var(--kb-color-border);
  border-radius: var(--kb-radius-card);
}

.notice {
  color: var(--kb-color-warning);
  font-size: var(--kb-font-body);
  line-height: 1.45;
  background: #fff8e8;
}

.error-banner {
  color: #b42318;
  font-size: var(--kb-font-body);
  background: #fff1f0;
}

.segments {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--kb-space-xs);
}

.segments--compact {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.segment,
.primary-button,
.secondary-button,
.mini-button,
.check-item {
  min-width: 0;
  margin: 0;
  border: 0;
  border-radius: var(--kb-radius-md);
}

.segment {
  height: 72rpx;
  color: var(--kb-color-text-secondary);
  font-size: var(--kb-font-body);
  line-height: 72rpx;
  background: var(--kb-color-surface-muted);
}

.segment::after,
.primary-button::after,
.secondary-button::after,
.mini-button::after,
.check-item::after {
  border: 0;
}

.segment--active {
  color: var(--kb-color-brand);
  font-weight: 700;
  background: var(--kb-color-brand-soft);
}

.panel-header,
.button-row,
.student-item,
.student-actions,
.seed-row {
  display: flex;
  gap: var(--kb-space-sm);
  align-items: center;
}

.panel-header,
.student-item,
.seed-row {
  justify-content: space-between;
}

.panel-title,
.sub-title,
.student-name,
.group-title {
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

.textarea--large {
  height: 200rpx;
}

.field-error,
.preview-line--error {
  color: #b42318;
  font-size: var(--kb-font-body);
  line-height: 1.4;
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
.mini-button,
.check-item {
  color: var(--kb-color-text-primary);
  background: var(--kb-color-surface-muted);
}

.preview {
  padding: var(--kb-space-sm);
  background: var(--kb-color-background);
  border-radius: var(--kb-radius-md);
}

.preview-summary {
  color: var(--kb-color-text-primary);
  font-size: var(--kb-font-body);
  font-weight: 700;
}

.preview-line--muted {
  color: var(--kb-color-text-muted);
}

.empty-state {
  padding: var(--kb-space-lg);
  color: var(--kb-color-text-secondary);
  font-size: var(--kb-font-body);
  line-height: 1.5;
  text-align: center;
  background: var(--kb-color-surface-muted);
  border-radius: var(--kb-radius-md);
}

.student-item,
.group-card {
  padding: var(--kb-space-sm);
  background: var(--kb-color-surface-muted);
  border-radius: var(--kb-radius-md);
}

.student-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--kb-space-xxs);
  min-width: 0;
}

.student-actions {
  flex: 0 0 auto;
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

.check-item {
  height: 76rpx;
  color: var(--kb-color-text-secondary);
  font-size: var(--kb-font-body);
  line-height: 76rpx;
  text-align: left;
}

.check-item--active {
  color: var(--kb-color-brand);
  background: var(--kb-color-brand-soft);
}

.result-box {
  padding: var(--kb-space-md);
  background: var(--kb-color-background);
  border-radius: var(--kb-radius-md);
}

.seed-row {
  color: var(--kb-color-text-secondary);
  font-size: var(--kb-font-body);
}

.result-name {
  padding: var(--kb-space-sm);
  color: var(--kb-color-text-primary);
  font-size: var(--kb-font-body-large);
  font-weight: 700;
  background: var(--kb-color-surface);
  border-radius: var(--kb-radius-md);
}

.group-card {
  display: flex;
  flex-direction: column;
  gap: var(--kb-space-xxs);
}

.group-members {
  color: var(--kb-color-text-secondary);
  font-size: var(--kb-font-body);
  line-height: 1.5;
}
</style>
