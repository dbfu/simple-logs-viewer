#!/usr/bin/env node

const express = require('express');
const app = express();
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');

const { createServer } = require('http');
const { Server } = require('socket.io');

const server = createServer(app);
const io = new Server(server);

const chokidar = require('chokidar');

const { formatDateTime, formatFileSize } = require('./utils');


app.use(express.static(__dirname + '/public'));

// 设置默认端口号30070
let port = 30070;

// 获取命令行参数
const commandLineArgs = process.argv.slice(2);

// 获取端口号
if (commandLineArgs.length > 0) {
  port = commandLineArgs[0];
}

// 获取当前启动服务的文件夹地址
const dirPath = process.cwd();

const fileSocketMap = new Map();

io.on('connection', (socket) => {
  // 获取文件名
  const fileName = socket.handshake.query.file;
  // 获取当前文件大小
  const contentLength = socket.handshake.query.contentLength;

  // 判断当前文件是否已经存在，如果存在则把socket添加到数组中，如果不存在则创建
  // 存放contentLength是为了截取文件内容，把最新的内容发送给前端，因为日志文件内容只会增长，不会减少
  if (fileSocketMap.has(fileName)) {
    fileSocketMap.get(fileName).push({
      fileName,
      socket,
      contentLength,
    })
  } else {
    fileSocketMap.set(fileName, [{
      fileName,
      socket,
      contentLength,
    }]);
  }

  // 断开连接时，把当前socket从fileSocketMap中移除
  socket.on('disconnect', () => {
    const clients = fileSocketMap.get(fileName);
    const index = clients.findIndex((item) => item.socket === socket);
    clients.splice(index, 1);
  });
})

app.get('/', (req, res) => {
  fs.readdir(dirPath, async (err, files) => {
    if (err) {
      console.error(err);
      res.send('error');
      return;
    }
    // 创建一个包含文件详细信息对象的数组
    let fileDetails = files.map((file) => {
      // 获取文件完整路径
      const filePath = path.join(dirPath, file);
      // 获取文件信息
      const stats = fs.statSync(filePath);

      // 返回文件信息对象
      return {
        // 文件名
        name: file,
        // 文件修改时间
        mtime: stats.mtime,
        // 格式化文件修改时间
        formatMtime: formatDateTime(stats.mtime),
        // 文件大小
        size: stats.size,
        // 格式化文件大小
        formatSize: formatFileSize(stats.size)
      };
    });

    // 按文件修改时间倒序排序
    fileDetails.sort((a, b) => {
      return b.mtime - a.mtime;
    });

    const html = await ejs.renderFile(path.join(__dirname, 'views/logs.ejs'),
      { files: fileDetails }
    );

    res.send(html);
  });
});

app.get('/:file', async (req, res) => {
  // 获取文件名
  const fileName = req.params.file;
  const filePath = path.join(dirPath, fileName);
  // 判断传入的地址是否在当前文件夹下面，防止访问其他文件夹下面的文件
  const relativePath = path.relative(dirPath, filePath);

  if (relativePath.startsWith('..')) {
    res.send('不能访问其他文件夹下的内容');
    return;
  }

  // 判断文件是否存在
  if (!fs.existsSync(filePath)) {
    res.send('文件不存在');
    return;
  }

  // 读取当前日志文件内容
  const content = fs.readFileSync(filePath, 'utf8').toString();
  // 渲染模板
  const html = await ejs.renderFile(path.join(__dirname, 'views/detail.ejs'), {
    content,
    file: fileName,
    contentLength: content.length,
    port,
  });
  res.send(html);
});

// 监听文件变化
chokidar.watch(dirPath).on('change', (changeFile) => {
  // 获取文件名
  const changeFileName = path.basename(changeFile);
  // 获取文件内容
  const content = fs.readFileSync(changeFile, 'utf8').toString();
  // 获取当前文件对应的socket
  if (fileSocketMap.has(changeFileName)) {
    const clients = fileSocketMap.get(changeFileName) || [];
    clients.forEach((item) => {
      // 最新的文件内容
      item.socket.emit('change', content.slice(item.contentLength));
      item.contentLength = content.length;
    })
  }
});

process.on('uncaughtException', (error) => {
  console.error('Caught exception: ', error);
});

server.listen(port, () => {
  console.log(`启动成功，访问http://localhost:${port}`)
});



