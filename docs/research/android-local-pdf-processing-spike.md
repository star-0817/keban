# Android 本地 PDF 处理方案评估与最小验证

关联 Issue：#10

本文评估“课伴”后续实现图片转 PDF、PDF 合并与页面排序时可采用的 Android 本地处理方案。结论限定在 Android 优先、离线优先、UniApp + Vue 3 + TypeScript 应用架构内；本次不实现正式业务页面，也不接入云端能力。

## 结论

推荐方案：采用“TypeScript 类型化封装 + 自定义 Android 原生 UniApp 插件”的架构。插件内部优先使用 Android 系统 `PdfDocument` 完成图片转 PDF，使用 Apache 2.0 许可的 `pdfbox-android` 完成 PDF 合并与后续页面排序；前端仅传入图片或 PDF 的 `content://`/`file://` URI，插件返回新文件 URI。按 2026-07-23 查询结果，Android `PdfDocument` 自 API 19 起可用，`pdfbox-android` 在 Maven Central 可见版本为 `2.0.27.0`，对应 AAR 约 3.25 MB。

不推荐把 PDF 二进制内容写入 SQLite。SQLite 只保存任务元数据、源文件 URI、输出文件 URI、文件名、页数、大小、状态、创建时间和错误码等结构化字段。

## 评估范围

必须支持的首批能力：

- 多张图片按用户排序导出为一个新 PDF。
- 多个 PDF 按用户排序合并为一个新 PDF。
- 后续可扩展到 PDF 页面排序、拆分、删除页、压缩等本地能力。
- 离线运行，不上传用户文件，不依赖账号或自建服务器。
- 不覆盖源文件，所有输出均为新文件。

## 方案对比

| 方案 | 离线可用性 | 图片转 PDF | PDF 合并 | Android 兼容性 | 包体积/性能 | 维护成本 | 许可证风险 | UniApp 集成方式 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UniApp 生态已有能力或插件 | 取决于插件；预览类插件通常离线可用 | 插件市场多偏向预览、签名、打开文件；图片转 PDF 能力不稳定，需逐个确认 | 合并/排序类能力较少，商业插件能力和接口不可控 | 原生插件通常可覆盖 Android，但版本、厂商兼容性需看维护者 | 引入快，包体积由插件决定；黑盒性能难评估 | 低到中；依赖第三方维护节奏 | 商业授权、闭源实现、二次分发条款需逐项审查 | 通过 `uni.requireNativePlugin` 或 `uni_modules` 调用 |
| 自定义 Android 原生插件 | 完全离线 | 可用系统 `android.graphics.pdf.PdfDocument` 将 Bitmap 绘制到 PDF 页面 | 可用 `pdfbox-android` 合并现有 PDF；页面排序也可复用页面导入/复制能力 | 可面向项目最低 Android 版本做测试；`PdfDocument` 为系统 API，`pdfbox-android` 是 Android 适配版本 | 图片解码和 PDF 合并放在原生后台线程，性能更可控；依赖体积可被明确评估 | 中；需要维护 Kotlin 插件和 TypeScript 包装层 | `PdfDocument` 无第三方许可；`pdfbox-android` 为 Apache 2.0，风险可控 | 插件暴露少量异步方法，前端调用类型化 TypeScript 封装 |
| 纯前端 JavaScript 库 | 理论离线可用，库随包发布 | `pdf-lib`/`jsPDF` 可生成 PDF 并嵌入图片 | `pdf-lib` 可复制页面实现合并 | App WebView/JS 引擎内存限制更明显；大图、大 PDF 易卡顿或 OOM | JS 层处理大文件会占用 WebView 内存，二进制在 JS 与原生间传输成本高 | 低到中；实现快但异常处理复杂 | `pdf-lib`/`jsPDF` 为 MIT，许可证宽松 | 通过 npm 包在 Vue/TypeScript 中调用，文件读写仍需 UniApp/原生桥接 |

## 推荐理由

选择自定义 Android 原生插件的理由：

- 文件处理符合项目边界：前端页面不直接调用 Android API，页面调用 TypeScript 插件封装层；插件处理 URI 和文件输出。
- 图片转 PDF 可先不引入第三方依赖，直接用 Android `PdfDocument` 创建页面、绘制图片并写入输出流。
- PDF 合并和页面排序属于 PDF 结构级操作，不适合手写解析；`pdfbox-android` 是面向 Android 的 PDFBox 适配版本，许可为 Apache 2.0，适合后续扩展。
- 大图片和多 PDF 合并更适合放在原生后台线程中做流式读写、进度回调和取消处理，避免 WebView 主线程卡顿。
- 与离线优先、无服务器、不上传用户数据的产品原则一致。

不采用 UniApp 生态插件作为主方案的原因：

- 现有插件市场更常见的是 PDF 预览、签名、批注或办公文件打开，未必覆盖图片转 PDF、PDF 合并、页面排序的完整链路。
- 商业或闭源插件的授权、维护节奏、异常处理、包体积和兼容性不可控。
- 即便可用于原型，也需要在 PR 中逐项审查许可证和二进制来源，不能作为默认架构基线。

不采用纯前端 JavaScript 库作为主方案的原因：

- 图片和 PDF 二进制需要在 JS 内存中读取、解码、复制，面对学生常见的多张高分辨率照片时更容易出现卡顿或内存溢出。
- 输出文件仍需依赖 UniApp/原生能力落盘和分享，无法真正避免平台桥接。
- 更适合作为 H5 或小文件兜底实验，不适合作为 Android 首发的稳定本地处理核心。

## 建议接口草案

TypeScript 层只暴露 URI 和元数据，不暴露二进制内容：

```ts
export interface PdfImageInput {
  uri: string;
  rotationDegrees?: 0 | 90 | 180 | 270;
  pageSize?: 'fit-image' | 'a4';
}

export interface PdfFileInput {
  uri: string;
  password?: string;
}

export interface PdfOutputOptions {
  displayName: string;
  targetDirectory?: 'app-documents' | 'user-picked-directory';
  overwrite?: false;
}

export interface PdfJobResult {
  outputUri: string;
  pageCount: number;
  byteSize: number;
  createdAt: string;
}

export interface AndroidLocalPdfPlugin {
  imagesToPdf(input: {
    images: PdfImageInput[];
    output: PdfOutputOptions;
  }): Promise<PdfJobResult>;

  mergePdfs(input: {
    pdfs: PdfFileInput[];
    output: PdfOutputOptions;
  }): Promise<PdfJobResult>;
}
```

插件调用约束：

- 输入：图片 URI 或 PDF URI，来源于系统文件选择器、相册选择器或 App 私有目录。
- 输出：新 PDF 文件 URI。
- 数据库：仅保存 URI、任务状态和元数据；不得保存图片/PDF 的 Base64、ArrayBuffer 或 Blob 内容。
- 失败：返回稳定错误码，例如 `SOURCE_NOT_FOUND`、`UNSUPPORTED_FORMAT`、`PASSWORD_REQUIRED`、`WRITE_DENIED`、`OUT_OF_MEMORY`、`CANCELLED`。

## Android 权限与文件策略

权限：

- Android 10 及以上优先使用系统文件选择器、相册选择器或 Storage Access Framework，避免申请宽泛外部存储权限。
- 用户主动选择文件后，插件按 URI 读取输入流；需要持久访问时调用持久化 URI 权限。
- 输出到 App 私有目录不需要额外存储权限；输出到用户选择目录时使用 SAF 创建文档。
- 不申请 `MANAGE_EXTERNAL_STORAGE`。

文件保存位置：

- 默认输出到 App 私有文档目录，例如 `context.getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS)/pdf/`。
- 用户点击“保存到...”时再通过系统文档创建器选择目录。
- 分享文件时使用 `FileProvider` 或 `content://` URI，不暴露私有绝对路径。

临时文件清理：

- 临时位图、处理中间 PDF 和锁文件放在 `cacheDir/pdf-jobs/<jobId>/`。
- 任务成功后删除临时目录，仅保留最终输出文件。
- 任务失败、取消或 App 下次启动时，清理超过 24 小时的临时目录。
- 源文件永不覆盖、永不删除。

失败回退策略：

- 单张图片解码失败时中止任务并提示用户替换该图片，不生成不完整 PDF。
- PDF 合并遇到加密或损坏文件时中止任务并保留源文件不变。
- 内存不足时提示用户减少图片数量、降低图片质量或分批处理。
- 写入失败时提示用户改用 App 私有目录或重新选择保存位置。

## 最小验证设计

当前仓库尚未接入 Android 原生插件工程。本次最小验证采用可复制的 Kotlin 片段，验证“本地 URI 输入 -> 原生生成/合并 -> 新 URI 输出”的核心可行性，不接入正式业务页面。

### 验证一：图片转 PDF

目标：在 Android 真机上将两张本地图片写成一个新 PDF，源图片不变。

核心 Kotlin 片段：

```kotlin
fun imagesToPdf(
    context: Context,
    imageUris: List<Uri>,
    outputFile: File
): Uri {
    val document = PdfDocument()

    imageUris.forEachIndexed { index, uri ->
        context.contentResolver.openInputStream(uri).use { input ->
            requireNotNull(input) { "无法读取图片：$uri" }
            val bitmap = BitmapFactory.decodeStream(input)
                ?: error("不支持的图片格式：$uri")

            val pageInfo = PdfDocument.PageInfo.Builder(
                bitmap.width,
                bitmap.height,
                index + 1
            ).create()
            val page = document.startPage(pageInfo)
            page.canvas.drawBitmap(bitmap, 0f, 0f, null)
            document.finishPage(page)
            bitmap.recycle()
        }
    }

    outputFile.outputStream().use { output ->
        document.writeTo(output)
    }
    document.close()

    return FileProvider.getUriForFile(
        context,
        "${context.packageName}.fileprovider",
        outputFile
    )
}
```

预期结果：

- 输出目录生成一个新 PDF。
- PDF 页数等于输入图片数量。
- 每页显示对应图片，顺序与输入 URI 顺序一致。
- 原图片文件未被修改。

### 验证二：PDF 合并

目标：在 Android 真机上将两个本地 PDF 合并成一个新 PDF，源 PDF 不变。

候选依赖：

```kotlin
implementation("com.tom-roush:pdfbox-android:2.0.27.0")
```

核心 Kotlin 片段：

```kotlin
fun mergePdfs(
    context: Context,
    pdfUris: List<Uri>,
    outputFile: File
): Uri {
    val merger = PDFMergerUtility()
    val tempFiles = mutableListOf<File>()

    pdfUris.forEachIndexed { index, uri ->
        val temp = File.createTempFile("source-$index-", ".pdf", context.cacheDir)
        context.contentResolver.openInputStream(uri).use { input ->
            requireNotNull(input) { "无法读取 PDF：$uri" }
            temp.outputStream().use { output -> input.copyTo(output) }
        }
        tempFiles += temp
        merger.addSource(temp)
    }

    outputFile.outputStream().use { output ->
        merger.destinationStream = output
        merger.mergeDocuments(MemoryUsageSetting.setupTempFileOnly())
    }

    tempFiles.forEach { it.delete() }

    return FileProvider.getUriForFile(
        context,
        "${context.packageName}.fileprovider",
        outputFile
    )
}
```

预期结果：

- 输出目录生成一个新 PDF。
- 输出页数等于所有输入 PDF 页数之和。
- 页顺序与输入 PDF 顺序一致。
- 源 PDF 文件未被修改。

## 真机验证步骤

当前电脑未连接 Android 真机，也未创建原生插件工程，因此本次没有声称已经完成真机验证。后续真机验证应按以下步骤执行：

1. 在 Android Studio 或 HBuilderX 原生插件工程中加入上述 Kotlin 验证代码。
2. 若验证 PDF 合并，加入 `com.tom-roush:pdfbox-android` 依赖，并记录实际版本号、AAR 增量和许可证文件。
3. 配置 `FileProvider`，允许分享 App 私有文档目录下的输出 PDF。
4. 在 Android 10、Android 13、Android 15 或可获得的代表性真机上安装 Debug 包。
5. 关闭网络或开启飞行模式，确认处理过程不依赖网络。
6. 使用系统选择器选择 2 张 JPG/PNG 图片，执行图片转 PDF。
7. 验证输出 PDF 可被系统 PDF 查看器打开，页数为 2，源图片未变化。
8. 使用系统选择器选择 2 个 PDF，执行合并。
9. 验证输出 PDF 可打开，页数为两个源 PDF 页数之和，源 PDF 未变化。
10. 使用一张超大图片、一个加密 PDF、一个损坏 PDF 触发失败路径，确认错误码稳定且无残留临时文件。
11. 重启 App 后检查超过策略时间的临时目录清理逻辑。

验收记录模板：

```text
设备：
Android 版本：
App 构建方式：
pdfbox-android 版本：
图片转 PDF：
- 输入：
- 输出 URI：
- 页数：
- 源文件是否保持不变：
PDF 合并：
- 输入：
- 输出 URI：
- 页数：
- 源文件是否保持不变：
离线验证：
失败路径：
临时文件清理：
结论：
```

## 后续实施建议

1. 新增 `src/plugins/androidLocalPdf.ts`，只定义 TypeScript 类型、错误码和 `uni.requireNativePlugin` 封装。
2. 建立最小 Android 原生插件工程，先实现 `imagesToPdf`，不引入第三方依赖。
3. 真机确认图片转 PDF 稳定后，再引入 `pdfbox-android` 实现 `mergePdfs`，并记录包体积变化。
4. PDF 页面排序应复用合并能力：按用户排序后的页列表生成新文件，不修改源 PDF。

## 参考资料

- Android `PdfDocument` 官方文档：https://developer.android.com/reference/kotlin/android/graphics/pdf/PdfDocument
- PdfBox-Android 仓库与许可证：https://github.com/TomRoush/PdfBox-Android
- PdfBox-Android Maven Central 信息：https://central.sonatype.com/artifact/com.tom-roush/pdfbox-android
- pdf-lib 项目说明与许可证：https://github.com/Hopding/pdf-lib
- jsPDF 项目说明与许可证：https://github.com/parallax/jsPDF
- DCloud 插件市场 PDF 搜索结果：https://ext.dcloud.net.cn/search?q=pdf
