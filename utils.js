

/**
 * 将日期对象格式化为 YYYY-MM-DD HH:mm:ss 格式的字符串
 *
 * @param dateObj 要格式化的日期对象
 * @returns 格式化后的日期字符串
 */
function formatDateTime(dateObj) {
  const year = dateObj.getFullYear();
  const month = ('0' + (dateObj.getMonth() + 1)).slice(-2);
  const date = ('0' + dateObj.getDate()).slice(-2);
  const hours = ('0' + dateObj.getHours()).slice(-2);
  const minutes = ('0' + dateObj.getMinutes()).slice(-2);
  const seconds = ('0' + dateObj.getSeconds()).slice(-2);

  return `${year}-${month}-${date} ${hours}:${minutes}:${seconds}`;
}

/**
 * 格式化文件大小
 *
 * @param size 文件大小，单位为字节
 * @returns 返回格式化后的文件大小字符串，单位为 bytes、KB 或 MB
 */
function formatFileSize(size) {
  if (size < 1024) {
    return size + ' bytes';
  } else if (size < 1024 * 1024) {
    return (size / 1024).toFixed(2) + ' KB';
  } else {
    return (size / (1024 * 1024)).toFixed(2) + ' MB';
  }
}

module.exports = {
  formatDateTime,
  formatFileSize,
}