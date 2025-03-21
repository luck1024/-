// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { includePartner = false } = event
  
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
      query.userId = db.command.in([user._id, user.bindUserId])
    } else {
      query.userId = user._id
    }
    
    // 获取分类列表
    const categoriesResult = await db.collection('albums_category')
      .where(query)
      .orderBy('createTime', 'desc')
      .get()
    
    // 获取未分类照片数量
    const uncategorizedCount = await db.collection('albums')
      .where({
        ...query,
        categoryId: ''
      })
      .count()
    
    // 构建分类列表，包括"全部"和"未分类"
    const categories = [
      {
        _id: 'all',
        name: '全部照片',
        count: await db.collection('albums').where(query).count().then(res => res.total),
        cover: categoriesResult.data.length > 0 ? categoriesResult.data[0].cover : '',
        system: true
      },
      {
        _id: 'uncategorized',
        name: '未分类',
        count: uncategorizedCount.total,
        cover: '',
        system: true
      },
      ...categoriesResult.data
    ]
    
    return {
      success: true,
      categories: categories
    }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}