// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { page = 1, pageSize = 10, year, month, includePartner = false } = event
  
  try {
    // 获取当前用户
    const userResult = await db.collection('users').where({
      _openid: wxContext.OPENID
    }).get()
    
    if (userResult.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    
    const user = userResult.data[0]
    
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
    if (year && month) {
      const startDate = new Date(year, month - 1, 1)
      const endDate = new Date(year, month, 0)
      
      query.createTime = db.command.and([
        db.command.gte(startDate),
        db.command.lte(endDate)
      ])
    } else if (year) {
      const startDate = new Date(year, 0, 1)
      const endDate = new Date(year, 11, 31)
      
      query.createTime = db.command.and([
        db.command.gte(startDate),
        db.command.lte(endDate)
      ])
    }
    
    // 获取日记总数
    const totalResult = await db.collection('diaries').where(query).count()
    
    // 分页获取日记
    const diariesResult = await db.collection('diaries')
      .where(query)
      .orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()
    
    // 获取用户信息
    const userIds = [...new Set(diariesResult.data.map(d => d.userId))]
    const usersResult = await db.collection('users')
      .where({
        _id: db.command.in(userIds)
      })
      .field({
        _id: true,
        nickName: true,
        avatarUrl: true
      })
      .get()
    
    // 构建用户信息映射
    const userMap = {}
    usersResult.data.forEach(u => {
      userMap[u._id] = {
        nickName: u.nickName,
        avatarUrl: u.avatarUrl
      }
    })
    
    // 为日记添加用户信息
    const diaries = diariesResult.data.map(diary => {
      return {
        ...diary,
        userInfo: userMap[diary.userId] || {},
        isOwner: diary.userId === user._id
      }
    })
    
    return {
      success: true,
      diaries: diaries,
      total: totalResult.total,
      currentPage: page,
      pageSize: pageSize,
      totalPages: Math.ceil(totalResult.total / pageSize)
    }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}