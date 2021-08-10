# Electron IPC 通信测试

该例程用于测试从 Electron 的渲染进程到 Electron 主进程、再通过命名管道向外部进程进行通信的过程。这里的外部进程以 C# 编写，作为示例。

这个 Demo 主要是为解决 Electron 调用 Windows NT 系统下的 DLL 而编写的，它是`electron-ffl`的替代方案之一。

请通过`npm i`或`yarn`指令进行依赖库安装，然后通过`npm start`指令启动进程。

如果您所在的地区无法正常下载 Electron 依赖，请自行手动锁定版本并切换到淘宝镜像，详情见[此文章](https://blog.csdn.net/cookily_liangzai/article/details/107716013)；您也可以通过建立系统级虚拟局域网，转接到能够正常从官方源下载 Electron 的网络环境以解决依赖问题。

### 我的后端是以 NodeJS 写的，是否有从 Electron 到 NodeJS 的通信代码？

事实上，NodeJS 乃至 Electron 自己已经提供了更恰当的解决方案，通过`child-process`模块创建子进程即可，本质上是 NodeJS 自带的匿名管道。

该示例是为从 Electron 向由其它语言编写的程序创建的 IPC 管道进行通信而编写的，故不加入这方面的示例。
