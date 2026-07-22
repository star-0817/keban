# 课伴

课伴是一款面向在校学生与班委的 Android 优先、离线优先校园工具 App。它将班级事务、学习管理和文档处理整合到一起，不要求注册账号，也不需要自建服务器。

> 名称含义：课上课下的随身伙伴。

## 产品特点

- 本地优先：学生名单、课程、成绩、计划和文件均默认只保存在手机上。
- 即开即用：不强制登录，常用任务尽量三步内完成。
- 覆盖场景：抽人分组、课程表、学习计划、作业封面、图片转 PDF、PDF 合并等。
- Android 优先：基于 UniApp 开发，后续可根据需求扩展 iOS。

## 首发功能

- 班级：名单管理、随机抽人、随机分组、抽取历史。
- 学习：课程表、作业/考试倒计时、学习计划、番茄钟、绩点和考勤计算。
- 文档：作业封面生成、图片转 PDF、PDF 合并和页面排序。
- 数据：本地保存、备份导出与导入恢复。

完整的产品范围、技术架构、数据模型、开发里程碑和验收标准见 [开发文档](docs/DEVELOPMENT.md)。

## 项目状态

当前已创建 UniApp Android 基础工程，包含 Vue 3、TypeScript、Pinia 和最小首页。

## 本地启动

环境要求：

- Node.js 20.19 或更高版本。
- Android 运行调试需要安装 HBuilderX 或 UniApp CLI 支持的 Android 调试环境。

常用命令：

```bash
npm install
npm run dev:android
npm run type-check
npm test
npm run format:check
```

脚本说明：

- `npm run dev` / `npm run dev:android`：启动 UniApp App 端开发构建。
- `npm run build:android`：生成 App 端构建产物。
- `npm run type-check`：运行 TypeScript 与 Vue 类型检查。
- `npm test`：运行 Vitest 自动化测试。
- `npm run format:check`：检查代码格式。

当前工程仅包含基础启动页和验证 Store；尚未接入 SQLite、原生插件、文件/PDF/OCR、通知、广告、登录、网络请求或云端服务。
