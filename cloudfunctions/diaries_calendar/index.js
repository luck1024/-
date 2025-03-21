// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { year, month, includePartner = false } = event
  
  try {
    // 获取当前用户
    const userResult = await db.collection('users').where({
      _openid: wxContext.OPENID
    }).get()
    
    if (userResult.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    
    const user = userResult.data[0]
    
    // 验证年月参数
    if (!year || !month) {
      return { success: false, message: '请提供有效的年月参数' }
    }
    
    // 构建查询条件
    let query = {}
    
    if (includePartner && user.bindUserId) {
      query.$or = [
        { userId: user._id },
        { userId: user.bindUserId, isShared: true }
      ]
    } else {
      query.userId = user._id
    }
    
    // 按年月筛选
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)
    
    query.createTime = db.command.and([
      db.command.gte(startDate),
      db.command.lte(endDate)
    ])
    
    // 获取该月的日记
    const diariesResult = await db.collection('diaries')
      .where(query)
      .field({
        _id: true,
        title: true,
        mood: true,
        weather: true,
        createTime: true,
        userId: true
      })
      .get()
    
    // 按日期分组
    const calendarData = {}
    
    diariesResult.data.forEach(diary => {
      const date = new Date(diary.createTime)
      const day = date.getDate()
      
      if (!calendarData[day]) {
        calendarData[day] = []
      }
      
      calendarData[day].push({
        id: diary._id,
        title: diary.title,
        mood: diary.mood,
        weather: diary.weather,
        isOwner: diary.userId === user._id
      })
    })
    
    // 获取月份统计
    const totalDays = Object.keys(calendarData).length
    const totalDiaries = diariesResult.data.length
    
    return {
      success: true,
      year: year,
      month: month,
      calendarData: calendarData,
      statistics: {
        totalDays: totalDays,
        totalDiaries: totalDiaries,
        completionRate: (totalDays / endDate.getDate() * 100).toFixed(1)
      }
    }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}