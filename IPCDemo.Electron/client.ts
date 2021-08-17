let win: BrowserWindow;

import { join } from 'path';
import { Buffer } from 'buffer';
import { app, BrowserWindow, ipcMain } from 'electron';
import { createServer, Socket } from 'net';
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

function decodeBuffer(buffer: Buffer): IMsg {
  let length = buffer[0] * 256 + buffer[1];
  if (buffer.length !== length + 2) {
    throw Error(
      `无法分析的消息长度，预计长度 ${length + 2}，实际长度 ${buffer.length}`
    );
  }
  return JSON.parse(buffer.slice(2).toString('utf8'));
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
  connect.on('data', (data: Buffer) => {
    const { caller, callee, args } = decodeBuffer(data);
    console.log('入口:', caller, callee, args);
    switch (callee) {
      case '$shakehand':
        const uuid = 'frontend-' + generateUUID();
        console.log('出口:', uuid, 'test', ['0']);
        outsideIPCServerConnection?.write(
          encodeBuffer({ caller: uuid, callee: 'test', args: [`${0}`] })
        );
        break;
      case 'test':
        win?.webContents.send('asynchronous-reply', args[0]);
        break;
    }
  });
}).listen(join('\\\\?\\pipe', `\\${outsideIPCServerAddress}`));

import { exec } from 'child_process';
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

app.whenReady().then(() => {
  ipcMain.on('asynchronous-message', (_event, raw) => {
    const uuid = 'frontend-' + generateUUID();
    console.log('出口:', uuid, 'test', [`${raw}`]);
    outsideIPCServerConnection?.write(
      encodeBuffer({ caller: uuid, callee: 'test', args: [`${raw}`] })
    );
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

  win.loadFile(join(process.cwd(), './index.html'));
  win.on('close', () => {
    outsideIPCServer.close(() => {
      childProcess.kill();
      process.exit(0);
    });
  });
});
