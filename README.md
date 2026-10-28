# CAD/CAM 课程交互实验室

12 个课程作业、14 个交互演示页面。开发源码位于 `src/`，唯一静态网站目录为 `CADCAM2026_Show/`。

```text
src/ + scripts/build.mjs
          ↓ pnpm run build
CADCAM2026_Show/index.html + courses/*.html + 404.html + THIRD_PARTY_LICENSES.txt
          ↓ pnpm run release（重新构建、测试、校验、打包）
CADCAM2026_Show.zip
```

## 云端开发

从包含 `package.json` 的仓库根目录操作；使用现有 checkout，无需新建 worktree。需要 Node.js >=22.13.0、pnpm 11.25.0，实测 Node 24.19.0（`.node-version`）。不依赖 Windows、本地绝对路径、数据库或 API 密钥。

```sh
pnpm install --frozen-lockfile
pnpm run build
pnpm test
pnpm run check:site
pnpm run preview
```

预览从 `CADCAM2026_Show/` 提供文件，默认仅监听本机 4173 端口。支持 `HOST`、`PORT`，例如 `HOST=0.0.0.0 PORT=4187 pnpm run preview`；按云平台要求配置端口访问。预览进程需要每次重新启动，不等于公开部署。

如果云端用户目录不可写，可以将缓存保存在工作区，保留依赖和 TLS 校验：

```sh
XDG_DATA_HOME=/workspace/cadcam-runtime/data XDG_CACHE_HOME=/workspace/cadcam-runtime/cache pnpm install --frozen-lockfile --store-dir /workspace/cadcam-runtime/store
```

修改 `src/` 后重新构建；不要直接修改生成网页。构建先完成脚本打包，再清空并重新生成 `CADCAM2026_Show/`，避免遗留过期页面。目录内不要放手写资源；新增资源应放在源码中并由构建脚本明确输出。普通构建、测试、预览均不会更新 ZIP。

## 发布打包与下载

```sh
pnpm run release
```

该命令依次执行构建、全部测试、静态网站完整性及链接校验，然后使用锁定的纯 JavaScript ZIP 库生成仓库根目录的 `CADCAM2026_Show.zip`。ZIP 内容在写入前逐文件解压校验；文件顺序、时间戳固定，同一源码生成相同 ZIP。只有全部步骤通过才替换原 ZIP。

ZIP 解压后只得到一个顶层目录 `CADCAM2026_Show/`，目录内直接包含首页和 `courses/`。可从云端文件面板下载，或在明确提交该发布包后从 GitHub 分支下载。发布 ZIP 是显式维护的交付物；需要更新时执行 release 并审查、提交 ZIP，不要让普通开发自动重打包。

Netlify 手动部署：解压 ZIP，将 **`CADCAM2026_Show` 文件夹**拖入手动部署入口。仓库连接部署使用 `netlify.toml`：构建命令 `pnpm run build`，发布目录 `CADCAM2026_Show`。课程 URL 仍为 `/courses/<原文件名>.html`，不需要 SPA 重写。本次没有部署。

## 离线使用与资源

直接打开 `CADCAM2026_Show/index.html`，或单独打开 `courses/` 内的 HTML。正式网页的 CSS、JavaScript、Three.js 和几何数据均内联；单个课程页可脱离目录离线运行，目录与相邻课程导航需要保留文件夹结构。三维页面需要支持 WebGL2 的现代 Chrome、Edge 或 Firefox。

- `src/catalog.js`：课程目录和路由。
- `src/math.js`、`src/modules/`：数学算法与交互。
- `src/prompts.json`：提示词源码档案，不发布。
- `scripts/build.mjs`：唯一网页生成入口。
- `scripts/validate-site.mjs`：15 个发布文件、链接、锚点与资源引用校验。
- `scripts/package.mjs`：ZIP 打包与解压校验，由 release 调用。
- `tests/`：数学、交付结构和发布校验测试。

## 文档导航

- [目录规范化与验证](docs/NORMALIZATION.md)：源码、构建、发布关系及验证记录。
- [迁移说明](docs/migration/MIGRATION.md)：原始迁移背景。
- [迁移审计资料](docs/migration/README.md)：文件清单、哈希及历史验证 JSON。
- [云端验证记录](docs/validation/CLOUD_VALIDATION.md)、[功能验证记录](docs/validation/VALIDATION.md)：历史验收记录。

历史记录中的原始目录树、审计路径和哈希描述当时的快照，不代表当前文件位置；当前开发和发布命令以本 README 为准。

旧根目录 `index.html`、`courses/` 和 `dist/` 不再使用；旧 error 对照页不属于 10 个正式课程，已从发布目录移除，可在 Git 历史查看。课程内容及交互源码未改动。Three.js 和 esbuild 的许可保留于根目录和发布目录的 `THIRD_PARTY_LICENSES.txt`。

## 作业 10 综合实验

入口为 `courses/10.bezier.html`，原先三个子网页已合并。通过四个复选框叠加或独立展示：控制点与曲线构造、de Casteljau 递推、切矢性质、活动标架与曲率挠率。所有展示共用控制点及动画进度，切换展示不会重置状态。新增曲率圆、密切平面和 T/N/B 标架，使用控制点差分解析计算一至三阶导数。提供平面二次/三次、空间三次/四次及直线示例；零导数、零曲率位置明确标注未定义的量。

## 切矢与坐标系显示

展示 3 标出 de Casteljau 倒数第二层的两点 Q₀、Q₁，并演示 B′(t)=n(Q₁−Q₀)：切矢同向，模长是两点距离的 n 倍。场景中的切矢与连线均使用原始坐标长度，另有统一比例尺的二维模长对比，避免透视投影干扰判断。两点重合时明确显示零切矢和方向未定义。

每个三维视图的“视图显示”区域均提供“显示 XYZ 坐标系”复选框，统一控制全局坐标轴及轴名称。观察坐标系页面另有局部观察坐标系开关；曲线和曲面的活动标架保留各自的展示开关。隐藏状态在动画、单步及参数调整期间保留。

## 竖屏与阅读布局

数学说明正文为 17px，公式在桌面为 18px、手机为 17px，配合较宽行距；正文自动换行，长公式保持完整表达式并可在公式区域内横向滑动。桌面保持原有画布尺寸，控制台独立滚动；手机使用单列布局、可折叠控制台和更大的触控输入。观察坐标系与光照对照画面在手机上改为上下排列。Bezier 切矢模长对比在手机上移到画布下方，避免遮挡图形。

## 动画默认播放

具有动画控制的演示页在加载后自动播放，按钮初始显示“暂停”。可以暂停后调整参数、单步观察或重置；没有播放控制的静态交互页不额外增加运动。手机控制台收起时，动画也会正常播放。

## 作业 11 Bézier 曲面

入口为 `courses/11.bezier-surface.html`。四种次数 (2,2)、(3,3)、(4,4)、(2,3) 共用通用 Bernstein 求值；控制点支持三轴拖动与坐标输入。`src/bezier-surface.js` 实现张量积、两种求值次序、辅助点和解析法线；`src/surface-shaders.js` 对同一非索引三角网格分别在面中心、顶点、片元计算同一 Phong 反射模型。曲线和辅助图层复用缓冲区，扫掠通过参数空间裁剪连续显示，动画到终点自动暂停。单个生成 HTML 包含全部脚本、Shader、CSS 与 Three.js，可直接以 file:// 打开。

构建仍仅更新 `CADCAM2026_Show/`，不更新 ZIP。现有 Pages 工作流在 main 更新后直接发布此目录；本功能需经 PR 审核后合并。Netlify 流程保持不变。

作业 11 的完整验收与限制见 [Bézier 曲面验收记录](docs/validation/BEZIER_SURFACE.md)。本云环境已通过 WebGL2 与断网后交互测试，但浏览器管理策略禁止 `file://` 导航，直接双击离线打开仍需人工确认。

## 作业 12 B 样条曲线

入口为 `courses/12.bspline.html`。使用 `𝐫(u)`、控制顶点 `𝐝ᵢ`、次数 `k` 和节点 `uᵢ`。五项展示包括：1–5 次均匀曲线的独立分段与统一参数、均匀基函数、非均匀基函数及曲线、心形特例，以及按割边比例动画展示的 de Boor / de Casteljau 构造。心形三组初始节点对应 4/4/2 段，共享 7 个控制顶点；每组节点可独立编辑，内部重复节点和零长度区间按实际情况处理。

`src/bspline.js` 提供独立数学算法；`src/modules/bspline.js` 和 `bspline-plots.js` 实现 Three.js 场景、节点轴及基函数图。主曲线支持最多 24 个控制顶点、平面拖动、空间三轴及坐标输入。节点编辑支持间距滑块、节点轴拖动和逐项数值，保留非递减约束，无效输入标红且不应用。B 样条曲线默认线宽 3px，可调；控制多边形及递推辅助线固定 1.5px，基函数线宽独立固定。控制顶点名称随控制多边形显示或隐藏，顶点及曲线点标记缩小；WebGL 使用本地 Three.js Line2，基函数图下方提供可点击的 Nᵢ,ₖ，数值不再重复列出。展示 1/2 使用均匀节点，展示 3/5 保留可编辑节点；心形三图可载入展示 3。控制台优先显示参数 u 和节点设置，手机提供不遮挡主要曲线窗口的非模态底部参数面板。de Boor 按课件用蓝／绿／红控制多边形与同色节点区间逐层构造，不再使用抽象三角图；区间行可点击，附四控制点的三次课件示例。权重验证默认折叠，主画面保留一次完整节点矢量和必要读数。

验收与已知限制见 [作业 12 验收记录](docs/validation/BSPLINE.md)。可选浏览器验收：`python3 tests/browser/bspline.py`，需要 Python Playwright、`/usr/bin/chromium` 和本机 socket 权限；结果写入 `work/12-bspline/`。生产页面不增加新依赖。普通构建不更新发布 ZIP。

## 作业 11 三项实验与首页目录

首页按作业 10 → 11A → 11B → 11C → 作业 12 排列。原 `courses/11.bezier-surface.html` 为实验 A；新增实验 B 为 `courses/11.bezier-interpolation.html`（均匀/弦长参数插值），实验 C 为 `courses/11.bezier-tensor-product_surface.html`（双三次张量积动画与双视图）。页面保留中文教学内容，文件名使用英文。首页作业11的三个入口集中成组，搜索和分类包含全部14个实验。

上传页面源码位于 `src/standalone/`，`scripts/standalone.mjs` 在构建中添加网站外壳、实验标识及相邻导航。两个页面使用原有内联 Canvas 算法，无外部依赖；实验 C 的光照为逐三角形、顶点颜色插值、逐像素法线光照。构建会重新生成全部发布文件，不应直接编辑发布目录。其余三维课程使用 Three.js/WebGL2。
