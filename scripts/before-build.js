'use strict';

// 本项目没有生产依赖（package.json 的 dependencies 为空），node_modules 不需要
// 安装/rebuild/收集。返回 false 告诉 electron-builder：依赖由外部处理，跳过
// installOrRebuild 与 node_modules 收集（同时避免其 spawn 子进程）。
module.exports = () => false;
