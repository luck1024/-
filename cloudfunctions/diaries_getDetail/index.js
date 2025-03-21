// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { diaryId } = event
  
  try {
    // 获取当前用户
    const userResult = await db.collection('users').where({
      _openid: wxContext.OPENID
    }).get()
    
    if (userResult.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    
    const user = userResult.data[0]
    
    // 获取日记详情
    const diaryResult = await db.collection('diaries').doc(diaryId).get()
    if (!diaryResult.data) {
      return { success: false, message: '日记不存在' }
    }
    
    const diary = diaryResult.data
    
    // 验证查看权限
    if (diary.userId !== user._id) {
      if (!user.bindUserId || diary.userId !== user.bindUserId || !diary.isShared) {
        return { success: false, message: '无权查看此日记' }
      }
    }
    
    // 获取作者信息
    const authorResult = await db.collection('users').doc(diary.userId).get()
    
    return {
      success: true,
      diary: {
        ...diary,
        userInfo: {
          nickName: authorResult.data.nickName,
          avatarUrl: authorResult.data.avatarUrl
        },
        isOwner: diary.userId === user._id
      }
    }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}