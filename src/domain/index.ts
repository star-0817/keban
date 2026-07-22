// 后续名单、课程、计划、成绩和文档领域模块应从这里复用基础契约。
// 领域层保持纯 TypeScript，不依赖 UniApp、Vue、Pinia、SQLite 或 Android API。
export * from "./entity";
export * from "./grouping";
export * from "./ids";
export * from "./result";
export * from "./roster";
export * from "./time";
export * from "./validation";
