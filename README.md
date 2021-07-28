# Electron IPC 通信测试

该例程用于测试从 Electron 的渲染进程到 Electron 主进程、再通过命名管道向外部进程进行通信的过程。

请通过`npm i`或`yarn`指令进行依赖库安装，然后通过`npm start`指令启动进程。

如果您所在的地区无法正常下载 Electron 依赖，请自行手动锁定版本并切换到淘宝镜像，详情见[此文章](https://blog.csdn.net/cookily_liangzai/article/details/107716013)；您也可以通过建立系统级虚拟局域网，转接到能够正常从官方源下载 Electron 的网络环境以解决依赖问题。
