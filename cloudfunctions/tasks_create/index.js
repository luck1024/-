// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { title, description, deadline, type, isShared } = event
  
  try {
    // 获取当前用户
    const userResult = await db.collection('users').where({
      _openid: wxContext.OPENID
    }).get()
    
    if (userResult.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    
    const user = userResult.data[0]
    
    if (!title) {
      return { success: false, message: '任务标题不能为空' }
    }
    
    const taskData = {
      userId: user._id,
      title: title,
      description: description || '',
      deadline: deadline ? new Date(deadline) : null,
      type: type || 'personal',
      isShared: isShared === true,
      status: 'pending',
      completedTime: null,
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    }
    
    // 如果是共享任务，添加伴侣ID
    if (isShared && user.bindUserId) {
      taskData.sharedWithUserId = user.bindUserId
    }
    
    const result = await db.collection('tasks').add({
      data: taskData
    })
    
    // 如果是共享任务，发送通知给伴侣
    if (isShared && user.bindUserId) {
      await db.collection('notifications').add({
        data: {
          userId: user.bindUserId,
          type: 'task',
          content: `${user.nickName || '您的伴侣'}创建了一个共享任务: ${title}`,
          isRead: false,
          relatedId: result._id,
          createTime: db.serverDate()
        }
      })
    }
    
    return {
      success: true,
      taskId: result._id,
      message: '创建成功'
    }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}