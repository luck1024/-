// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { type, content, contactInfo, images } = event
  
  try {
    // 获取当前用户
    const userResult = await db.collection('users').where({
      _openid: wxContext.OPENID
    }).get()
    
    if (userResult.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    
    if (!content) {
      return { success: false, message: '反馈内容不能为空' }
    }
    
    const feedbackData = {
      userId: userResult.data[0]._id,
      userInfo: {
        nickName: userResult.data[0].nickName || '',
        avatarUrl: userResult.data[0].avatarUrl || ''
      },
      type: type || 'suggestion',
      content: content,
      contactInfo: contactInfo || '',
      images: images || [],
      status: 'pending',
      reply: '',
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    }
    
    const result = await db.collection('feedbacks').add({
      data: feedbackData
    })
    
    return {
      success: true,
      feedbackId: result._id,
      message: '反馈提交成功'
    }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}