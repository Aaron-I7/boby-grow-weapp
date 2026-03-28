// 日期/积分格式化工具
function formatDate(date) {
  var d = date ? new Date(date) : new Date()
  var y = d.getFullYear()
  var m = (d.getMonth() + 1).toString().padStart(2, '0')
  var day = d.getDate().toString().padStart(2, '0')
  return y + '-' + m + '-' + day
}

function formatTime(date) {
  var d = new Date(date)
  var h = d.getHours().toString().padStart(2, '0')
  var m = d.getMinutes().toString().padStart(2, '0')
  return h + ':' + m
}

function formatDateTime(date) {
  return formatDate(date) + ' ' + formatTime(date)
}

function formatPoints(n) {
  return (n > 0 ? '+' : '') + n
}

function getWeekDays() {
  var days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  return days
}

function getToday() {
  return formatDate(new Date())
}

module.exports = {
  formatDate: formatDate,
  formatTime: formatTime,
  formatDateTime: formatDateTime,
  formatPoints: formatPoints,
  getWeekDays: getWeekDays,
  getToday: getToday
}
