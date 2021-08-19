let win: BrowserWindow;

import { join } from 'path';
import { Buffer } from 'buffer';
import { app, BrowserWindow, ipcMain } from 'electron';
import { createServer, createConnection, Socket } from 'net';
import { v4 as generateUUID } from 'uuid';

interface IMsg {
  caller: string;
  callee: string;
  args: string[];
}

function encodeBuffer(obj: IMsg): Buffer {
  let buffer = Buffer.from(JSON.stringify(obj));
  return Buffer.concat([
    Buffer.from([Math.floor(buffer.byteLength / 256), buffer.byteLength % 256]),
    buffer,
  ]);
}

let outsideIPCServerConnection: Socket;
let outsideIPCServerAddress: string = generateUUID();
let outsideIPCServer = createServer((connect) => {
  console.log('已检测到连接');
  outsideIPCServerConnection = connect;
  connect.on('error', (err) => {
    console.log(`对外 IPC 通道发生错误: ${err}`);
    connect.end();
  });
  connect.on('close', () => {
    console.log('对外 IPC 通道已关闭');
  });

  let bufferCache: Buffer = Buffer.from([]);
  connect.on('data', (data: Buffer) => {
    bufferCache = Buffer.concat([bufferCache, data]);
    if (bufferCache.length < 2) {
      return;
    }
    const length = bufferCache[0] * 256 + bufferCache[1];
    if (bufferCache.length < length + 2) {
      return;
    }

    const { caller, callee, args } = JSON.parse(
      bufferCache.slice(2, length + 2).toString('utf8')
    );
    bufferCache = bufferCache.slice(length + 2);
    console.log('入口:', caller, callee, args);
    switch (callee) {
      case 'test':
        win?.webContents.send('asynchronous-reply', args[0]);
        break;
    }
  });
  const uuid = 'web-' + generateUUID();
  console.log('出口:', uuid, 'test', ['1']);
  outsideIPCServerConnection?.write(
    encodeBuffer({ caller: uuid, callee: 'test', args: ['1'] })
  );
}).listen(join('\\\\.\\pipe', `\\${outsideIPCServerAddress}`));

import { exec } from 'child_process';
import { readFileSync } from 'fs';
console.log('尝试启动外部进程...');
let childProcess = exec(
  `${join(
    process.cwd(),
    '../IPCDemo.CS/bin/Debug/net5.0/IPCDemo.CS.exe'
  )} ${outsideIPCServerAddress}`,
  (err) => {
    if (err) {
      console.error(err);
    }
  }
);

let insideIPCServerAddress: string = generateUUID();
createServer((connect) => {
  console.log('步骤1，状态：', connect.destroyed ? '已销毁' : '未销毁');
  const content = readFileSync(join(process.cwd(), './index.html'), 'utf8');
  console.log('步骤2，状态：', connect.destroyed ? '已销毁' : '未销毁');
  connect.setEncoding('utf8');
  console.log('步骤3，状态：', connect.destroyed ? '已销毁' : '未销毁');
  connect.on('error', (e) => console.error(e));
  connect.write(content, (_e) => {
    console.log('步骤4，状态：', connect.destroyed ? '已销毁' : '未销毁');
  });
  console.log('已写出，长度：', content.length);
  connect.destroy();
}).listen(join('\\\\?\\pipe', `\\${insideIPCServerAddress}`));
console.log('已创建内部路径：', `\\\\.\\\\pipe\\\\${insideIPCServerAddress}`);

app.whenReady().then(() => {
  ipcMain.on('asynchronous-message', (_event, raw) => {
    const uuid = 'web-' + generateUUID();
    console.log('出口:', uuid, 'test', [`${raw}`]);
    try {
      outsideIPCServerConnection?.write(
        encodeBuffer({ caller: uuid, callee: 'test', args: [`${raw}`] })
      );
    } catch (_e) {}
  });

  win = new BrowserWindow({
    width: 400,
    height: 300,
    backgroundColor: '#22272e',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.loadFile(`\\\\.\\\\pipe\\\\${insideIPCServerAddress}`);
  win.on('close', () => {
    outsideIPCServer.close(() => {
      childProcess.kill();
      process.exit(0);
    });
  });
});
