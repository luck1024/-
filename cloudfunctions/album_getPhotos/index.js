// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { categoryId, page = 1, pageSize = 20, includePartner = false } = event
  
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
    
    if (categoryId) {
      query.categoryId = categoryId
    }
    
    if (includePartner && user.bindUserId) {
      query.userId = db.command.in([user._id, user.bindUserId])
    } else {
      query.userId = user._id
    }
    
    // 获取照片总数
    const totalResult = await db.collection('albums').where(query).count()
    
    // 分页获取照片
    const photosResult = await db.collection('albums')
      .where(query)
      .orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()
    
    // 获取分类信息
    let categories = []
    if (includePartner && user.bindUserId) {
      categories = await db.collection('albums_category')
        .where({
          userId: db.command.in([user._id, user.bindUserId])
        })
        .get()
        .then(res => res.data)
    } else {
      categories = await db.collection('albums_category')
        .where({
          userId: user._id
        })
        .get()
        .then(res => res.data)
    }
    
    return {
      success: true,
      photos: photosResult.data,
      categories: categories,
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