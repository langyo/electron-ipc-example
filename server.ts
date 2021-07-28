function log(...args) {
  console.log(
    `[外部进程] ${new Date(Date.now()).toLocaleTimeString()}`,
    ...args
  );
}

import { Socket } from 'net';
import { join } from 'path';

let count = 0;
setInterval(() => {
  log('分发速度：', count);
  count = 0;
}, 1000);

let client = new Socket();
client.setEncoding('utf8');
client.connect(join('\\\\?\\pipe', '\\electronIPCDemo'), () => {
  log('已接入 IPC 服务端');
});

client.on('data', (data: string) => {
  const { type } = JSON.parse(data);
  switch (type) {
    case 'ping':
      count += 1;
      client.write(JSON.stringify({ type: 'pong' }));
      break;
  }
});
client.on('close', () => {
  log('对外 IPC 通道已关闭');
  process.exit();
});
client.on('error', (err) => {
  log('对外 IPC 通道发生错误：', err);
  client.destroy();
  process.exit();
});

client.write(JSON.stringify({ type: 'pong' }));
