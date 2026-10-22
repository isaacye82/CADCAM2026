# CAD/CAM 课程网站云端迁移说明

审查日期：2026-10-22。本次仅检查、复制和打包；没有删除、移动或修改原项目源码、网页与配置，没有推送或部署。迁移包保留原文件字节，新增本说明和 migration/ 审计材料。

## 1. 项目根目录与结构

原开发根目录是 `E:/CodexLab/CADCAM课程知识网页开发`，并非其中的 `CADCAM2026_Show/`。ZIP 解压后，请把包含 package.json 的 `CADCAM2026_cloud_project/` 作为云端工作目录。

```text
CADCAM2026_cloud_project/
  package.json
  pnpm-lock.yaml
  pnpm-workspace.yaml
  netlify.toml
  .gitignore
  src/                         # 应在这里继续开发
    modules/                   # 各演示模块
    math.js, ui.js, ...
  scripts/                     # 构建、预览、可选 Word 提取脚本
  tests/                       # 24 项数学与结构测试
  CADCAM2026_Show/              # 用户整理的网页快照，原样保留
    index.html
    courses/                   # 10 个正式页面 + 1 个 error 对照页面
  AI交互演示作业（含提示词）.docx
  README.md, VALIDATION.md, THIRD_PARTY_LICENSES.txt
  MIGRATION.md
  migration/                   # 文件清单、审计与本次验证记录
```

仅一个 package.json。pnpm-workspace.yaml 只有 `allowBuilds: { esbuild: true }`，没有 packages 列表，不存在独立子项目。不要只上传 CADCAM2026_Show：它能用于静态浏览，但不含开发源码、依赖清单与构建工具。

**现有目录差异：** 构建脚本仍向项目根目录的 `index.html`、`courses/` 和 `dist/` 输出，不会更新 CADCAM2026_Show。测试也仍检查根目录生成文件和 dist。迁移前，根目录生成文件已被整理到 CADCAM2026_Show，因此直接运行测试为 21 通过、3 项因文件不存在失败；先运行构建再测试即可恢复 24 项全通过。本次只在独立副本中构建，未改变原目录布局。

## 2. 环境和依赖要求

| 项目 | 当前配置 / 本次验证 |
| --- | --- |
| Node | package.json 没有 engines；Netlify 指定大版本 22。pnpm 11.25.0 自身 engines.node 为 `>=22.13`，应使用 Node 22.13+；本次验证为 Windows x64 / Node 24.19.0 |
| 包管理器 | packageManager 精确指定 `pnpm@11.25.0`，请使用该版本和现有锁文件 |
| 依赖 | three 0.180.0；开发依赖 esbuild 0.25.11；pnpm-lock.yaml lockfileVersion 9.0，仅根 importer |
| Python | 网站安装、构建、测试不需要。仅重新提取 Word 提示词或使用下述临时云预览时需要 Python 3，无第三方 Python 包 |
| 浏览器 | 三维演示需要 WebGL2 和硬件加速；静态页面无需后端、账户或 API 密钥 |

esbuild 包含平台相关二进制，必须在云端重新安装，不能复制 Windows node_modules。pnpm-workspace.yaml 已允许 esbuild 的安装构建脚本。Linux 环境尚未实机验证。

## 3. 实际安装、开发、构建与测试命令

在解压后包含 package.json 的目录执行。若云端没有指定版本的 pnpm，先安装一次；若平台已提供 pnpm 11.25.0，则跳过全局安装。

```sh
node --version
npm install --global pnpm@11.25.0
pnpm --version
pnpm install --frozen-lockfile
pnpm run build
pnpm test
pnpm run preview
```

- 安装：`pnpm install --frozen-lockfile`，需要从 npm 仓库获取依赖；迁移 ZIP 不含依赖缓存。
- 构建：`pnpm run build` → `node scripts/build.mjs`，生成根目录网页和干净副本 dist，重写许可文件，并清理三个旧 Bezier 生成页名称。只在解压后的副本运行。
- 测试：`pnpm test` → `node --test tests/*.test.mjs`。结构测试依赖构建产物，必须先构建。
- 本地预览：`pnpm run preview` → `node scripts/serve.mjs`，从当前工作目录的 dist 提供服务，固定地址 `http://127.0.0.1:4173`。
- 没有 `dev`、`start`、`lint` 或自动监听脚本。实际开发循环：修改 src → 重新 build → 刷新预览；不要以手工修改生成 HTML 作为后续开发方式。
- npm run build / npm test / npm run preview 可执行同一批脚本；不建议用 npm install 替代锁定的 pnpm 安装，因为当前没有 package-lock.json。
- 可选 `python3 scripts/import-doc.py` 会从根目录的第一个 docx 重建 src/prompts.json；常规构建无需执行，不要无意覆盖提示词存档。

### 云端浏览器预览

现有预览脚本只监听 127.0.0.1，且不读取 HOST/PORT。云平台如果要求监听 0.0.0.0 或动态端口，需要后续修改脚本。临时替代方式（云端有 Python 3 时）：

```sh
pnpm run build
python3 -m http.server 4173 --bind 0.0.0.0 --directory dist
```

在云平台转发 4173 端口；如果平台指定其他端口，替换命令中的 4173。无需改写 HTML 路由。

## 4. 当前开发进度

- 10 个作业、10 个正式交互页面，首页卡片、关键词搜索和主题筛选。
- Bezier 已合并为一个页面，复选框选择控制点构造、递推、切矢性质、活动标架及曲率/挠率四项展示。切矢按 `B′(t)=n(Q1−Q0)` 展示与倒数第二次递推两点的方向和长度关系。
- 三维坐标系显示开关、带动画页面默认播放、数学说明加大字号、手机竖屏响应式布局；原始提示词入口已移除，提示词保留于开发存档。
- HTML 内置样式、脚本、Three.js 和模型数据；正式页面导航使用相对路径。
- CADCAM2026_Show/courses/10.bezier - error.html 是额外对照文件，不在正式目录和构建输出中。本次原样保留，未作为正式功能验收对象。
- Netlify 配置已有：build=`npm run build`，publish=`dist`，NODE_VERSION=`22`。本次没有创建远程仓库、推送或发布。

## 5. 路径与凭据审查

源码、脚本、包配置未发现 Windows 盘符绝对路径或项目外本地导入依赖；未发现 file:/link: 本地依赖。构建以脚本位置解析根目录，跨目录迁移不依赖原机器路径。

所有 12 个现有快照 HTML（首页、10 个正式演示及 error 对照页）的 HTML 资源/导航属性检查未发现外部资源引用、越出项目目录的目标或失效目标。Three.js 内部文档链接字符串不作为运行资源请求。源码未发现 fetch/XMLHttpRequest 或外部模型加载调用。

静态扫描匹配到的 `file://` 只出现在 VALIDATION.md 的验证限制说明，以及结构测试中构造导航 URL 的字符串，不是访问外部本地文件的运行依赖。包内审计记录的原机器路径仅用于说明来源。

对纳入迁移范围的文件进行了凭据文件名与常见 token/私钥特征扫描，未发现可疑项；Word XML 也进行了常见凭据特征检查。扫描未输出任何凭据值。依赖、缓存、诊断与版本库目录整目录排除，不读取其中可能存在的凭据。此扫描不能替代对自定义格式秘密的人工检查。

## 6. .gitignore 与打包排除规则

原 .gitignore 只有 node_modules/、dist/、.netlify/、qa/，已原样保留。建议后续参考 `migration/GITIGNORE.recommended.txt`，补充：

- 各级 .pnpm-store、依赖与缓存目录、覆盖率目录、日志和临时文件。
- .env 及变体、.npmrc/.pnpmrc/.netrc 中的认证、auth.json、credentials 文件、私钥与证书密钥、.aws/.ssh。需要模板时，仅保留确认都是占位值的模板；不要直接复制真实认证配置。
- .git 本身由打包器排除，不需要写进 Git 的 ignore 文件。平台凭据应在平台秘密变量中重新配置，无需迁入本项目。

本 ZIP 排除所有层级的 node_modules、.pnpm-store、.git、dist、qa、.netlify、.vercel 以及常见工具缓存/凭据目录；排除日志、临时文件和凭据相关文件，不追踪链接到项目外的文件。当前实际排除目录为 .pnpm-store、node_modules、dist、qa；未发现符号链接/目录联接或凭据文件。详细策略和实际列表见 migration/audit.json。

CADCAM2026_Show 虽然是生成网页，但按用户要求作为当前成果快照保留。dist 可由源码重新生成，因此不放入 ZIP。原 Word 文档、提示词存档、源码、测试、配置、锁文件与第三方许可均保留。

## 7. 本次验证结果与仍需处理的事项

独立副本验证：锁定依赖重新安装成功 → build 成功 → 24/24 测试通过；重新生成的首页和 10 个正式页面与 CADCAM2026_Show 对应页面逐字节一致。具体文件哈希、HTTP 检查及 ZIP 完整性见 migration/verification.json 和随包完整性记录。

待办：

1. 云端以包含 package.json 的目录为根，不要误选仅含网页的 CADCAM2026_Show。
2. 决定后续是否统一 CADCAM2026_Show 与构建输出位置；当前脚本、测试和 README 仍按根目录 index/courses + dist 工作，CADCAM2026_Show 只作为快照，不会自动更新。
3. 为云端端口转发适配 HOST/PORT 或使用临时 Python 预览命令。
4. 在 package.json 添加准确 Node engines 或版本文件，并让云环境满足 Node >=22.13 / pnpm 11.25.0；README 的“Node 22 或更新”应细化为精确下限。以上配置本次均未改动。
5. 后续合并建议的忽略规则；保留 error 对照页作为档案，正式发布只使用构建得到的 dist。
6. 云端首次执行锁定安装、构建、测试，复验 Linux 与浏览器交互。手机实机、真正断网 file://、Safari/Firefox 兼容性以及 Netlify 线上构建尚未在本次验证，不应视为已完成。

### 云端验收命令

```sh
pnpm install --frozen-lockfile
pnpm run build
pnpm test
find dist -type f
# 另一个终端启动预览后：
curl -f http://127.0.0.1:4173/
curl -f http://127.0.0.1:4173/courses/10.bezier.html
```

预期 dist 中含首页、10 个正式课程页、404.html 和许可文件，共 13 个文件；不应包含源码、Word、凭据或 node_modules。逐页检查动画默认播放、暂停/重置、坐标系开关、Bezier 四项展示及手机竖屏布局，再考虑另行发布。
