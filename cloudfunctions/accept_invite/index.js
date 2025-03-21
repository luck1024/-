// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { code } = event;
  
  try {
    // 开始数据库事务
    const transaction = await db.startTransaction();
    
    try {
      // 获取邀请码信息
      const codeResult = await transaction.collection('invite_codes').where({
        code: code,
        status: 'unused'
      }).get();
      
      if (codeResult.data.length === 0) {
        await transaction.rollback();
        return {
          success: false,
          message: '邀请码无效或已被使用'
        };
      }
      
      const inviteCode = codeResult.data[0];
      
      // 检查是否是邀请码的目标用户
      if (inviteCode.targetOpenid && inviteCode.targetOpenid !== wxContext.OPENID) {
        await transaction.rollback();
        return {
          success: false,
          message: '此邀请码不是发给您的'
        };
      }
      
      // 检查双方是否已经绑定伴侣
      const [userResult, inviterResult] = await Promise.all([
        transaction.collection('users').where({
          _openid: wxContext.OPENID
        }).get(),
        transaction.collection('users').where({
          _openid: inviteCode.inviterOpenid
        }).get()
      ]);
      
      if (userResult.data.length > 0 && userResult.data[0].partnerId) {
        await transaction.rollback();
        return {
          success: false,
          message: '您已经绑定了伴侣'
        };
      }
      
      if (inviterResult.data.length > 0 && inviterResult.data[0].partnerId) {
        await transaction.rollback();
        return {
          success: false,
          message: '邀请者已经绑定了伴侣'
        };
      }
      
      // 更新邀请码状态
      await transaction.collection('invite_codes').doc(inviteCode._id).update({
        data: {
          status: 'used',
          useTime: db.serverDate()
        }
      });
      
      // 更新双方的用户信息
      await Promise.all([
        transaction.collection('users').where({
          _openid: wxContext.OPENID
        }).update({
          data: {
            partnerId: inviteCode.inviterOpenid
          }
        }),
        transaction.collection('users').where({
          _openid: inviteCode.inviterOpenid
        }).update({
          data: {
            partnerId: wxContext.OPENID
          }
        })
      ]);
      
      // 提交事务
      await transaction.commit();
      
      return {
        success: true,
        message: '绑定成功'
      };
      
    } catch (err) {
      // 回滚事务
      await transaction.rollback();
      throw err;
    }
    
  } catch (err) {
    console.error('接受邀请失败:', err);
    return {
      success: false,
      message: '接受邀请失败: ' + err.message
    };
  }
};