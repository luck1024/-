// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { content, contactInfo, type } = event
  
  try {
    // 获取当前用户
    const userResult = await db.collection('users').where({
      _openid: wxContext.OPENID
    }).get()
    
    if (userResult.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    
    const user = userResult.data[0]
    
    if (!content) {
      return { success: false, message: '反馈内容不能为空' }
    }
    
    // 创建反馈记录
    const feedbackData = {
      userId: user._id,
      userNickName: user.nickName || '',
      content: content,
      contactInfo: contactInfo || '',
      type: type || 'suggestion',
      status: 'pending',
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    }
    
    await db.collection('feedback').add({
      data: feedbackData
    })
    
    return {
      success: true,
      message: '反馈提交成功，感谢您的宝贵意见'
    }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}