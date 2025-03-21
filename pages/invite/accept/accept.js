const db = wx.cloud.database();
const _ = db.command;

Page({
  data: {
    inviteCode: '',
    loading: false
  },

  onLoad(options) {
    // 如果是通过分享进来的，自动填入邀请码
    if (options.code) {
      this.setData({
        inviteCode: options.code
      });
    }
  },

  // 输入邀请码
  onInputInviteCode(e) {
    this.setData({
      inviteCode: e.detail.value.toUpperCase() // 转换为大写
    });
  },

  // 接受邀请
  async acceptInvite() {
    if (this.data.loading) return;
    
    const { inviteCode } = this.data;
    
    if (!inviteCode.trim()) {
      wx.showToast({
        title: '请输入邀请码',
        icon: 'none'
      });
      return;
    }

    try {
      this.setData({ loading: true });
      wx.showLoading({ title: '验证中...' });
      
      // 1. 检查邀请码是否存在且未使用
      const codeResult = await db.collection('invites').where({
        code: inviteCode,
        status: 'unused'
      }).get();
      
      if (codeResult.data.length === 0) {
        wx.showToast({
          title: '邀请码无效或已被使用',
          icon: 'none'
        });
        return;
      }

      const inviteData = codeResult.data[0];
      const inviterOpenid = inviteData._openid; // 邀请者的 openid
      const currentOpenid = wx.getStorageSync('userData').openid; // 当前用户的 openid

      // 2. 检查是否在试图和自己绑定
      if (inviterOpenid === currentOpenid) {
        wx.showToast({
          title: '不能和自己绑定',
          icon: 'none'
        });
        return;
      }

      // 3. 检查双方是否已经绑定了其他人
      const [userResult, inviterResult] = await Promise.all([
        db.collection('users').where({
          _openid: currentOpenid
        }).get(),
        db.collection('users').where({
          _openid: inviterOpenid
        }).get()
      ]);

      if (userResult.data.length > 0 && userResult.data[0].partnerId) {
        wx.showToast({
          title: '您已经绑定了其他用户',
          icon: 'none'
        });
        return;
      }

      if (inviterResult.data.length > 0 && inviterResult.data[0].partnerId) {
        wx.showToast({
          title: '邀请者已经绑定了其他用户',
          icon: 'none'
        });
        return;
      }

      // 4. 更新邀请码状态
      await db.collection('invites').doc(inviteData._id).update({
        data: {
          status: 'used',
          useTime: db.serverDate(),
          acceptedBy: currentOpenid
        }
      });

      // 5. 更新双方的用户信息
      const currentUser = userResult.data[0];
      const inviter = inviterResult.data[0];
      
      // 更新当前用户信息
      await db.collection('users').doc(currentUser._id).update({
        data: {
          partnerId: inviterOpenid,
          bindTime: db.serverDate(),
          anniversary: db.serverDate() // 设置纪念日为绑定时间
        }
      });

      // 更新邀请者信息
      await db.collection('users').doc(inviter._id).update({
        data: {
          partnerId: currentOpenid,
          bindTime: db.serverDate(),
          anniversary: db.serverDate() // 设置相同的纪念日
        }
      });

      // 6. 更新本地存储的用户数据
      const userData = wx.getStorageSync('userData');
      userData.partnerId = inviterOpenid;
      userData.bindTime = new Date();
      userData.anniversary = new Date();
      wx.setStorageSync('userData', userData);

      wx.hideLoading();
      
      wx.showToast({
        title: '绑定成功',
        icon: 'success'
      });

      // 延迟返回首页
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/index/index'
        });
      }, 1500);

    } catch (err) {
      console.error('接受邀请失败:', err);
      wx.showToast({
        title: '绑定失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
      wx.hideLoading();
    }
  }
}); 