# 静态网站目录规范化与验证

2026-10-22，分支 `chore/unify-static-release`。基线为 `0fde0fc375219968ee71f4e284cc2403b4aa534f`。

## 目录和生成关系

```text
CADCAM2026/
├── src/                         # 教学源码，未改动
├── scripts/
│   ├── build.mjs                # 只生成 CADCAM2026_Show/
│   ├── validate-site.mjs        # 发布文件、导航、锚点和资源检查
│   ├── package.mjs              # 确定性 ZIP 与逐文件解压验证
│   ├── serve.mjs                # 预览唯一发布目录
│   └── import-doc.py            # 原有文档导入工具
├── tests/                       # 原有 24 项 + 3 项发布/预览测试
├── migration/                   # 历史资料及本轮验证 JSON
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── netlify.toml
├── .gitignore
├── .node-version
├── README.md
├── MIGRATION.md
├── NORMALIZATION.md
├── CLOUD_VALIDATION.md           # 历史记录
├── VALIDATION.md                 # 历史记录
├── THIRD_PARTY_LICENSES.txt
├── AI交互演示作业（含提示词）.docx
├── CADCAM2026_Show/
│   ├── index.html
│   ├── courses/                 # 原文件名的 10 个正式课程页
│   ├── 404.html
│   └── THIRD_PARTY_LICENSES.txt
└── CADCAM2026_Show.zip           # 仅显式 release 更新
```

`src/` → esbuild 与页面模板 → `CADCAM2026_Show/` → 显式 release → 根目录 ZIP。开发、构建、预览不依赖 Windows。所有网站 CSS、脚本、Three.js 和几何数据维持内联，正式网页字节与基线一致。

## 删除及配置调整

- 删除根目录 `index.html`、`courses/` 的 10 个重复 HTML：均与原发布目录对应文件逐字节相同，且构建不读取它们。
- 移除 `CADCAM2026_Show/courses/10.bezier - error.html`：非正式课程、不被目录引用；原版保留在 Git 历史。
- 不再生成或使用 `dist/`。构建清理唯一输出目录，随后只生成 13 个发布文件，增加 404 和许可。
- `src/`、数学测试、正式课程文件名及 `/courses/*.html` URL 不变。旧迁移记录加历史标注，原始审计文件保留。
- 预览脚本和 Netlify publish 指向唯一目录；新增锁定的打包开发依赖 fflate 0.8.2。ZIP 包含网站文件，不包含源码、开发依赖或迁移资料。

## 命令

```sh
pnpm install --frozen-lockfile
pnpm run build
pnpm test
pnpm run check:site
pnpm run preview
# 仅需要更新发布包时：
pnpm run release
```

云端缓存路径和下载说明见 README。ZIP 解压后得到一个顶层 `CADCAM2026_Show/`，将此文件夹拖入 Netlify 即可手动部署。本轮未部署。

## 已验证

- Linux、Node 24.19.0、pnpm 11.25.0：冻结锁文件安装和构建成功。
- 27/27 测试通过，无失败、跳过；保留原有 24 项，新增完整发布校验、拒绝过期/损坏输出、任意工作目录下的预览 HTTP 集成测试。
- 首页和 10 个课程页 HTTP 200，响应与发布文件逐字节相同；不存在的页面返回 404。
- 13 个发布文件完整；HTML 链接、锚点、静态资源路径检查通过。无根目录网页、根目录 courses 或 dist 副本。
- 首页和 10 个课程输出均与基线根目录 HTML 逐字节相同；教学源码完全未变。
- 注入过期页面后重新构建，旧页面被移除。普通构建和测试前后 ZIP 哈希不变；重复 release 的 ZIP 哈希相同。
- ZIP 共 13 个文件，顶层统一为 `CADCAM2026_Show/`。打包器自身解压比对通过；另用 Python 标准库独立执行 CRC、实际解压及全部文件字节比对，全部通过。
- Headless Chromium 154，1365×900 桌面和 390×844 手机模拟：首页及全部课程可打开，10 个课程初始化标记为 true；课程 2–10 成功创建 WebGL 画布。手机页面宽度无溢出，控制台默认收起，画布区域宽度正常。
- Bezier 页面代表性交互：暂停、单步、重置到既有初始值 0.35、四项展示全部关闭/开启、XYZ 开关在单步后保持。手机截图确认三维曲线和页面布局已渲染。

详细路径、文件哈希、ZIP SHA256、桌面及手机观测值见 `migration/normalization-validation.json`。手机为浏览器模拟，未验证真机触摸、Safari/Firefox、所有课程的全部操作；不能将代表性检查解释为完整教学功能验收。

## 审查与部署边界

本分支只整理目录、构建、预览和发布机制，不开发作业 11。提交的 ZIP 是本次显式执行 release 的结果。未经用户确认，不合并 main，不部署 Netlify。
