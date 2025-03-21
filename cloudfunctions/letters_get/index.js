// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { page = 1, pageSize = 10, type = 'all' } = event
  
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
    
    if (type === 'sent') {
      // 发出的信件
      query.fromUserId = user._id
    } else if (type === 'received') {
      // 收到的信件
      query.toUserId = user._id
    } else {
      // 所有信件
      query.$or = [
        { fromUserId: user._id },
        { toUserId: user._id }
      ]
    }
    
    // 获取信件总数
    const totalResult = await db.collection('letters').where(query).count()
    
    // 分页获取信件
    const lettersResult = await db.collection('letters')
      .where(query)
      .orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()
    
    // 获取用户信息
    const userIds = [...new Set([
      ...lettersResult.data.map(l => l.fromUserId),
      ...lettersResult.data.map(l => l.toUserId)
    ])]
    
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
    
    // 为信件添加用户信息
    const letters = lettersResult.data.map(letter => {
      return {
        ...letter,
        fromUserInfo: userMap[letter.fromUserId] || {},
        toUserInfo: userMap[letter.toUserId] || {},
        isSender: letter.fromUserId === user._id,
        isReceiver: letter.toUserId === user._id
      }
    })
    
    return {
      success: true,
      letters: letters,
      total: totalResult.total,
      currentPage: page,
      pageSize: pageSize,
      totalPages: Math.ceil(totalResult.total / pageSize),
      unreadCount: await db.collection('letters')
        .where({
          toUserId: user._id,
          isRead: false
        })
        .count()
        .then(res => res.total)
    }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}