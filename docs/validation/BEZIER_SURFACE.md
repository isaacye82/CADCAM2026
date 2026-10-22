# 作业 11 Bézier 曲面验收记录

日期：2026-10-22。仓库：isaacye82/CADCAM2026。

## 基线

- 初始分支 `work`，工作区干净，无旧开发分支或未提交修改。
- GitHub 连接器实时读取 `main`，与本地 HEAD、origin/main 均为 `3cd992bbd4c439d4ea08516fcb75827ab9409245`。
- 初次 fetch 被执行沙箱的 socket 限制阻止；允许网络连接后成功执行 `git fetch origin --prune`，SHA 再次一致。
- 从该 origin/main 建立 `codex/11-bezier-surface`，目标为 main，不合并。

## 实现

页面：`CADCAM2026_Show/courses/11.bezier-surface.html`。源码入口：`src/modules/bezier-surface.js`。

复用项目 Three.js 0.180.0、OrbitControls、TransformControls 与公共布局。四种次数共用 Bernstein 权重与通用张量积求值。Qᵢ(v)、Rⱼ(u)、等参数曲线、当前位置均与控制网格联动；控制点支持鼠标三轴柄与数值编辑。法线由两方向解析一阶导数的叉积计算，退化处仅使用向上法线作为显示后备。

同一非索引网格包含位置、解析顶点法线、面法线、面中心和参数属性，三种材质共享光照参数。Flat 在顶点 Shader 中使用同一面中心与面法线求光照，每个面三个顶点输出相同颜色；Gouraud 在各顶点用位置和法线求光照后插值颜色；Phong 插值位置与法线，在片元 Shader 中归一化后求完整环境光、漫反射和镜面反射。三种模式均使用同一方向光和 Phong 反射公式，不依赖 flatShading 属性。

动画模式 A 沿当前等参数曲线移动点；模式 B 移动曲线扫掠成面。可交换 U/V 构造方向，提供播放、暂停、重置和速度。扫掠用参数空间片元裁剪连续显示；动画复用缓冲区，仅在次数或分辨率改变时替换曲面几何。构建后全部代码、Shader、CSS 和 Three.js 内联为普通 IIFE 脚本，无 ES Module 或 CDN 运行依赖。

## 验证结果

- `pnpm run build`：成功，11 个独立课程页面。
- `pnpm test`：34/34 通过，包括全部既有测试及新增 7 项曲面测试。预览测试需要允许本机 socket。
- `pnpm run check:site`：14 个发布文件通过，导航、锚点和本地资源引用完整。
- `git diff --check`：通过。
- 数学测试覆盖四种控制网格、四角与边界插值、非负归一化权重、凸包支持半空间、两种张量积次序一致性、编辑权重响应、辅助点数量、解析法线与退化后备。
- Chromium / SwiftShader WebGL2：四种网格、Y 轴鼠标拖动、坐标输入、u/v 联动、两种动画、播放暂停重置、U/V 切换、旋转、图层及渐进显示均通过。
- 三种 Shader 均实际编译渲染；低分辨率下画布截图 SHA-256 各不相同；无 JS 或 Shader 错误。
- 通过拦截 WebGL2 createBuffer/createTexture/createProgram，确认连续动画窗口内资源创建计数不变。
- 使用本机 `/CADCAM2026/` 子路径模拟 Pages，首页 11 个入口与作业 11 导航通过。
- 页面加载后断网，再编辑参数，仍可交互。
- 390×844 手机尺寸无页面横向溢出；控制台默认收起，展开正常。

原始浏览器结果：`BEZIER_SURFACE_BROWSER.json`。浏览器自动化脚本：`tests/browser/bezier-surface.py`，需要可用的 Python Playwright、`/usr/bin/chromium` 及本机 socket 权限。执行 `python3 tests/browser/bezier-surface.py`，截图和 JSON 写入 `work/`；不属于默认 Node 测试，不增加生产依赖。

## 未完成的人工验收

实际尝试以 `file://` 打开最终 HTML，但当前 Chromium 管理策略返回 `ERR_BLOCKED_BY_ADMINISTRATOR`。因此仅能确认资源已完整内联、没有外部依赖，以及页面载入后断网可交互；不能将这些结果记为“直接双击离线运行”已通过。

请在普通 Chrome、Edge 或 Firefox 中断网，直接打开生成 HTML，验证四种网格、三轴编辑与两种动画。单个课程 HTML 可独立演示，首页及相邻课程导航需要保留目录结构。

当前三维验证采用软件 WebGL2；真实 GPU 帧率、实体手机触控与不同浏览器还需人工验证。正式 GitHub Pages 站点的最终验收须等待用户审核并合并 main 后进行。

## 文件清单

新增：

- `src/bezier-surface.js`
- `src/surface-shaders.js`
- `src/modules/bezier-surface.js`
- `tests/bezier-surface.test.mjs`
- `tests/browser/bezier-surface.py`
- `docs/validation/BEZIER_SURFACE.md`
- `docs/validation/BEZIER_SURFACE_BROWSER.json`
- `CADCAM2026_Show/courses/11.bezier-surface.html`

修改：

- `src/catalog.js`、`src/main.js`、`src/thumbnails.js`：第 11 课注册、入口卡片及缩略图。
- `scripts/build.mjs`：首页数量由目录动态生成。
- `tests/structure.test.mjs`、`tests/publish.test.mjs`：课程及发布文件数量更新，保留原有断言。
- `README.md`：课程数量与作业 11 说明。
- `CADCAM2026_Show/index.html` 与既有 `courses/*.html` 共 11 个文件：由构建统一重新生成，旧课程源码及 URL 保持；第 10 课下一页指向第 11 课。

未执行 release，未更新 `CADCAM2026_Show.zip`。未修改 `.github/workflows/static.yml`、`netlify.toml`，未部署或合并。
