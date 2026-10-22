> 历史记录：以下路径与快照策略描述迁移当时状态。当前唯一发布目录为 `CADCAM2026_Show/`，开发和发布流程见 [README.md](README.md)，本轮验证见 [NORMALIZATION.md](NORMALIZATION.md)。

# 云端开发基线与验收记录

日期：2026-10-22（北京时间）。本记录补充原 MIGRATION.md，原迁移审计材料不改写。

## 环境与复现

项目根目录：包含 package.json 的 CADCAM2026_cloud_project/。
实测 Linux、Node 24.19.0、pnpm 11.25.0。Node 最低要求 >=22.13.0；.node-version 固定实测版本。

```sh
pnpm install --frozen-lockfile
pnpm run build
pnpm test
sites-preview start <项目绝对路径>
# 云端浏览器打开 http://terminal.local:4173/
# 完成检查后停止：
sites-preview stop
```

托管预览已成功打开首页及全部十个课程页。该地址仅供内部 QA，不是公网地址，也不代表部署。此前普通服务器的回环地址无法跨环境访问；改用平台提供的预览管理服务后连通。每次验收需重新启动服务。

## 工程修改

- 新增 .openai/hosting.json，仅指定静态目录 dist；未注册 Site，也没有项目 ID 或部署动作。
- package.json 增加 engines.node >=22.13.0，依赖版本和 packageManager 保持不变。
- 新增 .node-version：24.19.0。
- scripts/serve.mjs 支持 HOST/PORT，默认仍为 127.0.0.1:4173；非法端口会明确报错。
- README.md 更新锁定安装方式、精确环境要求、普通/托管预览方式和快照约定。
- 新增本 CLOUD_VALIDATION.md。

src/、tests/、pnpm-lock.yaml、pnpm-workspace.yaml、netlify.toml 及原迁移材料均未修改。未修改教学功能。

## 已执行的验证

- pnpm install --frozen-lockfile 成功；pnpm run build 成功；pnpm test：24/24 通过，无失败、跳过。
- 普通预览脚本默认地址/端口和 HOST=0.0.0.0 PORT=4187 均可返回完整首页；非法端口被拒绝。
- 已在浏览器打开首页，通过首页搜索 Bezier 进入课程 10，再依次点击上一课程直至课程 1，返回首页；全部页面导航成功。
- 首页 Bezier 搜索得到 1/10，曲线与曲面筛选得到 4/10。
- 课程 1（凸组合与重心坐标）初始化成功，调整 A 权重后读数更新，重置后三角形和读数恢复。
- CADCAM2026_Show/ 全部 12 个 HTML 与原 ZIP 字节一致；构建的首页及 10 个正式课程页与对应原快照逐字节一致。error 对照页只保留在快照中。
- dist 仍为首页、10 个正式演示页、404.html 和许可文件，共 13 个文件。

## 浏览器验收阻塞

课程 2–10 页面能够打开，但演示初始化失败。浏览器控制台明确报告：

```text
THREE.WebGLRenderer: Error creating WebGL context.
GL_VENDOR = Disabled, GL_RENDERER = Disabled
```

页面正确显示现有 WebGL2/硬件加速要求提示，document.body.dataset.ready 为 error。课程 1 为 true。不能将“页面可访问”解释为“三维交互通过”。本轮未改动应用以绕过渲染要求，也未更改浏览器安全或硬件设置。

尚未验证：Bezier 四项展示的实际切换/叠加、动画默认播放及暂停/单步/重置、XYZ 坐标系显示状态及其保持、二维/三维控制点拖动、手机竖屏实际布局与触摸交互、Safari/Firefox、真正断网 file:// 使用。手机断点逻辑此前仅做源码检查，本次没有设备模拟或手机实测。

后续先在具备 WebGL2 的浏览器中继续验收，再决定是否进行教学功能开发。本基线仅确认构建、自动化测试、导航、首页交互及课程 1 的上述操作；不是完整浏览器验收通过版本。

## 保存与边界

基线源码包保留原始 CADCAM2026_Show 快照及全部源码、锁文件、文档和工程配置；不包含 node_modules、dist、Git 目录或运行缓存。dist 可按上述命令重建。

没有推送、部署，也没有覆盖原上传迁移 ZIP。验收结束停止托管预览服务。
