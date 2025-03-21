// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { taskId, title, description, deadline, type, isShared } = event
  
  try {
    // 获取当前用户
    const userResult = await db.collection('users').where({
      _openid: wxContext.OPENID
    }).get()
    
    if (userResult.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    
    const user = userResult.data[0]
    
    // 验证任务所有权
    const taskResult = await db.collection('tasks').doc(taskId).get()
    if (!taskResult.data) {
      return { success: false, message: '任务不存在' }
    }
    
    if (taskResult.data.userId !== user._id) {
      return { success: false, message: '无权修改此任务' }
    }
    
    // 更新任务
    const updateData = {
      updateTime: db.serverDate()
    }
    
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (deadline !== undefined) updateData.deadline = new Date(deadline)
    if (type !== undefined) updateData.type = type
    
    // 只有绑定了伴侣才能共享
    if (isShared !== undefined) {
      if (isShared === true && user.bindUserId) {
        updateData.isShared = true
        updateData.sharedWithUserId = user.bindUserId
      } else {
        updateData.isShared = false
        updateData.sharedWithUserId = ''
      }
    }
    
    await db.collection('tasks').doc(taskId).update({
      data: updateData
    })
    
    // 如果是新共享，发送通知给伴侣
    if (isShared === true && user.bindUserId && !taskResult.data.isShared) {
      await db.collection('notifications').add({
        data: {
          userId: user.bindUserId,
          type: 'task',
          content: `${user.nickName || '您的伴侣'}与您共享了一个任务: ${title || taskResult.data.title}`,
          isRead: false,
          relatedId: taskId,
          createTime: db.serverDate()
        }
      })
    }
    
    return {
      success: true,
      message: '更新成功'
    }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}