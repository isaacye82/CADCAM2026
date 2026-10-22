# 迁移资料

- [MIGRATION.md](MIGRATION.md)：原始迁移说明。
- [manifest.json](manifest.json)：迁移时的文件清单与哈希。
- [audit.json](audit.json)：迁移审计信息。
- [verification.json](verification.json)：迁移验证结果。
- [normalization-validation.json](normalization-validation.json)：目录规范化时的发布文件、ZIP 和浏览器验证结果。
- [GITIGNORE.recommended.txt](GITIGNORE.recommended.txt)：历史忽略规则建议。

本目录由根目录 `migration/` 迁入，原根目录 `MIGRATION.md` 一并归档。构建脚本、测试和配置不依赖这些路径，因此不需要保留原目录。

JSON 中的路径、哈希及迁移说明中的旧目录树均描述历史快照，保留原始数据，不按当前目录重写。当前开发与发布流程见仓库根目录 [README.md](../../README.md)，目录规范化说明见 [NORMALIZATION.md](../NORMALIZATION.md)。
