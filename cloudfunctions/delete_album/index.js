// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { albumId } = event
  
  try {
    console.log('删除相册, ID:', albumId, '用户:', wxContext.OPENID)
    
    if (!albumId) {
      return {
        success: false,
        message: '相册ID不能为空'
      }
    }
    
    // 获取相册信息
    const albumResult = await db.collection('albums').doc(albumId).get()
    
    if (!albumResult.data) {
      return {
        success: false,
        message: '相册不存在'
      }
    }
    
    // 检查权限
    if (albumResult.data.userId !== wxContext.OPENID) {
      return {
        success: false,
        message: '没有权限删除该相册'
      }
    }
    
    // 删除相册
    await db.collection('albums').doc(albumId).remove()
    
    return {
      success: true
    }
    
  } catch (err) {
    console.error('删除相册失败:', err)
    return {
      success: false,
      message: err.message
    }
  }
}