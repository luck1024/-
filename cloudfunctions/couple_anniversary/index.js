// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    // 获取当前用户
    const userResult = await db.collection('users').where({
      _openid: wxContext.OPENID
    }).get()
    
    if (userResult.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    
    const user = userResult.data[0]
    
    if (!user.bindUserId) {
      return { success: false, message: '您还没有绑定伴侣' }
    }
    
    if (!user.anniversary) {
      return { success: false, message: '未设置纪念日' }
    }
    
    const anniversary = new Date(user.anniversary)
    const today = new Date()
    
    // 计算在一起的天数
    const togetherDays = Math.floor((today - anniversary) / (1000 * 60 * 60 * 24))
    
    // 计算下一个整百天纪念日
    const nextCentDay = Math.ceil(togetherDays / 100) * 100
    const nextCentDate = new Date(anniversary)
    nextCentDate.setDate(nextCentDate.getDate() + nextCentDay)
    
    // 计算下一个整百天还有多少天
    const daysToNextCent = Math.floor((nextCentDate - today) / (1000 * 60 * 60 * 24))
    
    // 计算下一个月纪念日
    const nextMonthDate = new Date(today.getFullYear(), today.getMonth(), anniversary.getDate())
    if (nextMonthDate < today) {
      nextMonthDate.setMonth(nextMonthDate.getMonth() + 1)
    }
    
    // 计算下一个月纪念日还有多少天
    const daysToNextMonth = Math.floor((nextMonthDate - today) / (1000 * 60 * 60 * 24))
    
    // 计算下一个年纪念日
    const nextYearDate = new Date(today.getFullYear(), anniversary.getMonth(), anniversary.getDate())
    if (nextYearDate < today) {
      nextYearDate.setFullYear(nextYearDate.getFullYear() + 1)
    }
    
    // 计算下一个年纪念日还有多少天
    const daysToNextYear = Math.floor((nextYearDate - today) / (1000 * 60 * 60 * 24))
    
    // 计算在一起的年月日
    const years = Math.floor(togetherDays / 365)
    const months = Math.floor((togetherDays % 365) / 30)
    const days = togetherDays % 30
    
    return {
      success: true,
      anniversary: anniversary,
      togetherDays: togetherDays,
      togetherTime: {
        years: years,
        months: months,
        days: days
      },
      nextCentDay: {
        day: nextCentDay,
        date: nextCentDate,
        daysLeft: daysToNextCent
      },
      nextMonthAnniversary: {
        date: nextMonthDate,
        daysLeft: daysToNextMonth
      },
      nextYearAnniversary: {
        date: nextYearDate,
        daysLeft: daysToNextYear,
        years: years + 1
      }
    }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}