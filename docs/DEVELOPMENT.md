# Campus Toolbox Development Document

## 1. Overview

### 1.1 Product name

Working name: Campus Toolbox (Chinese name to be decided before release).

### 1.2 Product statement

Campus Toolbox is an Android-first, offline utility app for university students and class committee members. It combines class administration, study planning, and document processing into fast, privacy-conscious tools.

### 1.3 Product goals

- Complete a common student task in three interactions or fewer where practical.
- Require no account, server, or cloud sync for core features.
- Keep user data and documents on the device by default.
- Provide a useful first release before introducing advanced AI, OCR, or speech features.

### 1.4 Non-goals for v1

- Social feed, class chat, or collaboration service.
- User accounts, server-side storage, or cross-device synchronization.
- Online job aggregation or web scraping.
- Cloud OCR, cloud speech recognition, or automatic AI content generation.
- Storing PDF, image, or audio binary content in the database.

## 2. Target Users and Scenarios

| User | Situation | Desired outcome |
| --- | --- | --- |
| Student | Needs a clean assignment cover quickly | Fill a form and export a PDF cover |
| Student | Has several photos of notes or homework | Create one ordered PDF locally |
| Student | Needs to track courses, assignments, and exams | See today's schedule and upcoming deadlines |
| Student | Wants to manage grades and attendance | Calculate weighted average, GPA, and absence margin |
| Class committee member | Needs to choose a student fairly in class | Pick from a roster and retain a draw history |
| Class committee member | Needs to divide classmates into teams | Build balanced random groups from an imported roster |

## 3. Scope and Priorities

### 3.1 Release 1: publishable MVP

| Area | Feature | Notes |
| --- | --- | --- |
| App shell | Bottom navigation, theme, onboarding, privacy notice | No sign-in |
| Home | Today cards, upcoming deadlines, recent tools | Home is a dashboard, not a tool directory |
| Class | Roster, random picker, random grouping, history | Import plain text or CSV first |
| Study | Timetable, deadlines, study plans, Pomodoro | Local notifications for events |
| Calculators | Weighted average/GPA and attendance margin | Configurable grading and attendance rules |
| Documents | Assignment cover, image-to-PDF, PDF merge, page order | All processing happens locally |
| Data | Local database, JSON backup, restore validation | Files are referenced by URI/path only |
| Settings | Dark mode, notifications, data management, privacy page | Include delete-all-local-data action |

### 3.2 Release 2: after validation

- PDF split, compression, watermark, and page deletion.
- Class fund ledger and homework submission checklist.
- Course-table home-screen widget.
- More assignment-cover templates, including importable school templates.
- App-level SQLite export and encrypted backup option.
- Premium purchase and rewarded-ad integration after value validation.

### 3.3 Release 3: native/offline intelligence

- On-device OCR for image text extraction.
- On-device speech-to-text.
- Local document scanning: edge detection, perspective correction, and image enhancement.

These features require native Android libraries or models. They must remain optional downloads or clearly disclose package-size impact.

## 4. Information Architecture

```text
Home
Class
  Roster
  Random picker
  Random grouping
  Draw history
Study
  Timetable
  Deadlines
  Study plans
  Pomodoro
  Grade calculator
  Attendance calculator
Documents
  Assignment cover
  Image to PDF
  PDF merge
  Page sorting
Profile
  Backup and restore
  Settings
  Privacy
  Pro upgrade
```

Bottom navigation: Home, Class, Study, Documents, Profile.

## 5. Functional Requirements

### 5.1 Class tools

- Create multiple rosters, each with a name and optional class metadata.
- Add students manually or import CSV/plain-text names.
- Pick one or more students randomly and optionally exclude previously selected people.
- Split a roster into a specified number of groups or a target group size.
- Save draw/group history locally; allow history clearing.
- Do not claim randomness suitable for lotteries or other high-stakes decisions.

### 5.2 Study tools

- Support weekly timetable entries: course name, teacher, room, weekday, start/end section, and odd/even week rule.
- Create deadline events: assignment, exam, activity, and custom event.
- Create plans with tasks, estimated duration, status, and due date.
- Run a configurable Pomodoro timer and record completed focus sessions.
- Calculate weighted average and GPA from course score and credit values.
- Calculate remaining allowable absence from total lessons, absence count, and minimum attendance percentage.

### 5.3 Document tools

- Generate an assignment cover from a structured form and a local template.
- Select multiple images, reorder them, and export one PDF.
- Select multiple PDFs, reorder them, and merge them into a new PDF.
- Keep source files unchanged; all output must use a newly created file name.
- Show progress, errors, cancellation, and final save/share action for long operations.
- Clearly state that files are processed locally.

### 5.4 Backup and restoration

- Export structured records as a versioned JSON file.
- Validate schema/version before importing.
- Default import behavior is merge with duplicate detection; replace-all requires an explicit confirmation.
- File references are restored only when still valid on the device; missing references show a recoverable warning.

## 6. Technical Architecture

```text
UniApp (Vue 3 + TypeScript)
  |
  +-- Presentation: pages, reusable components, composables
  +-- State: Pinia stores
  +-- Domain: pure TypeScript services and validators
  +-- Persistence: repository layer over SQLite
  +-- Platform bridge: UniApp APIs and Android native plugins
       +-- Files and share sheet
       +-- PDF generation and manipulation
       +-- Local notifications
       +-- Optional OCR and speech modules (later)
```

### 6.1 Recommended stack

| Concern | Choice | Reason |
| --- | --- | --- |
| App framework | UniApp, Vue 3, TypeScript | Reuses the team's Vue skills and builds Android packages |
| State | Pinia | Predictable feature-level state |
| Local database | SQLite | Reliable queries and scalable structured local records |
| Small preferences | UniApp storage | Theme, onboarding status, and simple flags |
| File processing | Android native UniApp plugins | Better performance and API access than JavaScript alone |
| Notifications | Android local-notification plugin | No server required |
| Backup format | Versioned JSON | Transparent and portable |
| Testing | Vitest for domain logic; manual Android acceptance tests | Good fit for offline app logic |

### 6.2 Code layout

```text
src/
  pages/             Feature screens
  components/        Reusable UI components
  stores/            Pinia state stores
  services/          Domain logic and use cases
  repositories/      SQLite persistence implementations
  types/             Shared TypeScript types
  utils/             Pure helpers and validators
  plugins/           TypeScript wrappers for Android native plugins
  assets/            Icons, cover templates, and static resources
docs/                Product and development documentation
```

### 6.3 Android-native boundary

Use native plugins only behind typed wrappers. The UI must never invoke Android APIs directly. Each plugin should define:

- input/output TypeScript contracts;
- supported Android version range;
- permission requirements;
- cancellation behavior;
- error codes and user-safe messages;
- manual test cases on a physical Android device.

## 7. Local Data Model

| Table | Primary fields |
| --- | --- |
| `rosters` | id, name, metadata, created_at, updated_at |
| `students` | id, roster_id, name, student_no, tags, created_at |
| `draw_history` | id, roster_id, mode, selected_student_ids, created_at |
| `timetable_entries` | id, course_name, weekday, start_slot, end_slot, week_rule, room |
| `events` | id, title, type, due_at, reminder_at, status, note |
| `study_plans` | id, title, start_at, due_at, status |
| `study_tasks` | id, plan_id, title, estimated_minutes, due_at, status |
| `focus_sessions` | id, task_id, started_at, duration_seconds, completed |
| `grade_courses` | id, term, name, credit, score, grade_point |
| `attendance_courses` | id, name, total_lessons, absences, minimum_rate |
| `document_jobs` | id, type, display_name, output_uri, created_at, status |
| `settings` | key, value, updated_at |

Store paths or Android content URIs for files. Do not store image/PDF/audio binary data in SQLite.

## 8. Privacy, Permissions, and Compliance

- No account is required.
- Explain local-only storage during onboarding and before document processing.
- Request media/file access only at the action that requires it.
- Request notification permission only after a user creates a reminder.
- Include a readable privacy policy before publishing.
- Provide delete-all-local-data and document-cache cleanup controls.
- If ads or analytics are later added, update the privacy policy and allow choices where required.
- Never upload user documents, recordings, student rosters, or grades without a separate explicit opt-in.

## 9. Quality Requirements

- Offline core flows remain usable after initial installation.
- App start reaches Home in under 2 seconds on a representative mid-range Android device.
- UI remains responsive while documents process; use background native processing where available.
- Source documents are never overwritten.
- Every storage mutation has validation and recoverable error feedback.
- Color contrast and touch targets support basic accessibility.

## 10. Monetization Principles

### Free tier

- Class tools, timetable, GPA, attendance calculator, and basic cover generation.
- A modest daily/batch limit for expensive document operations if needed.

### Paid options after user validation

- Rewarded ad: unlock an individual PDF operation or premium cover export.
- Pro one-time purchase (target range: CNY 9.9-19.9): no ads, unlimited document tools, advanced templates, advanced class tools, and backup export.

Do not add ads before the core workflows are reliable. Avoid subscriptions in the initial release.

## 11. Delivery Plan

| Milestone | Deliverables | Exit criteria |
| --- | --- | --- |
| M0: Foundation | UniApp project, navigation, theme, SQLite wrapper, privacy shell | Android debug build installs and persists a sample record |
| M1: Class tools | Roster, picker, grouping, history, import | 20- and 60-person rosters work without duplicate/corruption issues |
| M2: Study tools | Timetable, deadlines, plans, Pomodoro, calculators | Schedule survives restart and reminders can be scheduled locally |
| M3: Documents | Cover PDF, image-to-PDF, PDF merge/order | Outputs open correctly and source files remain unchanged |
| M4: Data and polish | Backup/restore, error states, dark theme, settings | Backup can restore to a clean install and manual acceptance passes |
| M5: Internal beta | Signed APK, feedback workflow, bug fixes | 20 student testers complete key flows successfully |

## 12. Acceptance Checklist for v1

- [ ] User can create a roster, import names, pick a student, and view history.
- [ ] User can create a class schedule and see today's courses after app restart.
- [ ] User can add an assignment deadline and schedule a local reminder.
- [ ] User can calculate weighted average/GPA and attendance margin with clear input validation.
- [ ] User can generate an assignment cover PDF locally.
- [ ] User can convert selected images into a correctly ordered PDF locally.
- [ ] User can merge selected PDFs without changing originals.
- [ ] User can export local records and restore them from a validated backup.
- [ ] App works without a user account and explains its local-data behavior.
- [ ] Core flows are tested on at least one physical Android device.

## 13. Open Decisions

- Final Chinese product name and icon direction.
- Android minimum SDK and target SDK.
- Exact native PDF library and its license compatibility.
- Whether class-fund bookkeeping belongs in release 2 or is removed.
- Which GPA conversion rules to include by default and how users customize them.
- Whether Pro unlock uses an app-store in-app purchase, a one-time license, or both.
