// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { page = 1, pageSize = 10 } = event
  
  try {
    console.log('获取相册列表, 用户:', wxContext.OPENID)
    
    // 获取用户信息
    const userResult = await db.collection('users').where({
      _openid: wxContext.OPENID
    }).get()
    
    let partnerId = null
    if (userResult.data.length > 0 && userResult.data[0].partnerId) {
      partnerId = userResult.data[0].partnerId
    }
    
    // 构建查询条件
    let query = {
      userId: wxContext.OPENID
    }
    
    // 如果有伴侣，也获取伴侣的相册
    if (partnerId) {
      query = _.or([
        { userId: wxContext.OPENID },
        { userId: partnerId }
      ])
    }
    
    // 计算分页
    const skip = (page - 1) * pageSize
    
    // 获取总数
    const countResult = await db.collection('albums').where(query).count()
    const total = countResult.total
    
    // 获取相册列表
    const albumsResult = await db.collection('albums')
      .where(query)
      .orderBy('createTime', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get()
    
    return {
      success: true,
      data: albumsResult.data,
      total: total,
      hasMore: skip + albumsResult.data.length < total
    }
    
  } catch (err) {
    console.error('获取相册列表失败:', err)
    return {
      success: false,
      message: err.message
    }
  }
}