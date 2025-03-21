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
      // 查询发送的信件
      query.fromUserId = user._id
      query.isDeletedBySender = false
    } else if (type === 'received') {
      // 查询收到的信件
      query.toUserId = user._id
      query.isDeletedByReceiver = false
      
      // 只查询已到达的信件
      query.$or = [
        { deliveryTime: null },
        { deliveryTime: db.command.lte(db.serverDate()) }
      ]
    } else {
      // 查询所有信件
      query.$or = [
        { fromUserId: user._id, isDeletedBySender: false },
        { toUserId: user._id, isDeletedByReceiver: false }
      ]
      
      // 只查询已到达的信件
      query.$and = [
        {
          $or: [
            { fromUserId: user._id },
            { deliveryTime: null },
            { deliveryTime: db.command.lte(db.serverDate()) }
          ]
        }
      ]
    }
    
    // 获取信件总数
    const totalResult = await db.collection('letters')
      .where(query)
      .count()
    
    // 获取信件列表
    const lettersResult = await db.collection('letters')
      .where(query)
      .orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()
    
    // 获取用户信息
    const userIds = []
    lettersResult.data.forEach(letter => {
      if (letter.fromUserId) userIds.push(letter.fromUserId)
      if (letter.toUserId) userIds.push(letter.toUserId)
    })
    
    const uniqueUserIds = [...new Set(userIds)]
    const usersResult = await db.collection('users').where({
      _id: db.command.in(uniqueUserIds)
    }).get()
    
    const usersMap = {}
    usersResult.data.forEach(user => {
      usersMap[user._id] = {
        nickName: user.nickName,
        avatarUrl: user.avatarUrl
      }
    })
    
    // 组装返回数据
    const letters = lettersResult.data.map(letter => {
      return {
        ...letter,
        fromUser: letter.fromUserId ? usersMap[letter.fromUserId] || { nickName: '未知用户', avatarUrl: '' } : null,
        toUser: letter.toUserId ? usersMap[letter.toUserId] || { nickName: '未知用户', avatarUrl: '' } : null,
        isSender: letter.fromUserId === user._id,
        isReceiver: letter.toUserId === user._id,
        isDelivered: !letter.deliveryTime || new Date(letter.deliveryTime) <= new Date()
      }
    })
    
    return {
      success: true,
      letters: letters,
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