// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { title, description, location, imageUrl, tags = [] } = event
  
  try {
    console.log('添加相册, 用户:', wxContext.OPENID)
    console.log('接收到的数据:', event)
    
    if (!title) {
      return {
        success: false,
        message: '标题不能为空'
      }
    }
    
    if (!imageUrl) {
      return {
        success: false,
        message: '图片地址不能为空'
      }
    }
    
    // 添加相册
    const result = await db.collection('albums').add({
      data: {
        userId: wxContext.OPENID,
        title,
        description: description || '',
        location: location || '',
        imageUrl,
        tags,
        createTime: db.serverDate()
      }
    })
    
    console.log('添加相册结果:', result)
    
    return {
      success: true,
      albumId: result._id
    }
    
  } catch (err) {
    console.error('添加相册失败:', err)
    return {
      success: false,
      message: err.message
    }
  }
}