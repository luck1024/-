const app = getApp();
const db = wx.cloud.database();

Page({
  data: {
    inviteCode: '',
    inviterInfo: null,
    isLoading: false,
    isVerifying: false
  },

  onLoad(options) {
    // 如果是通过分享链接进入，自动填充邀请码
    if (options.code) {
      this.setData({
        inviteCode: options.code
      });
      this.verifyInviteCode();
    }
  },

  // 输入邀请码
  inputInviteCode(e) {
    this.setData({
      inviteCode: e.detail.value.trim(),
      inviterInfo: null
    });
  },

  // 验证邀请码
  async verifyInviteCode() {
    const { inviteCode } = this.data;
    
    if (!inviteCode) {
      wx.showToast({
        title: '请输入邀请码',
        icon: 'none'
      });
      return;
    }
    
    try {
      this.setData({ isVerifying: true });
      
      // 调用云函数验证邀请码
      const result = await wx.cloud.callFunction({
        name: 'user_verifyInviteCode',
        data: { inviteCode }
      });
      
      // 验证成功后，检查邀请者是否已有伴侣
      if (result.result.success) {
        const inviterOpenid = result.result.inviter._openid;
        
        // 查询邀请者的用户信息
        const userResult = await db.collection('users').where({
          _openid: inviterOpenid
        }).get();
        
        if (userResult.data.length === 0) {
          wx.showToast({
            title: '邀请者信息不存在',
            icon: 'none'
          });
          return;
        }
        
        const inviter = userResult.data[0];
        
        // 检查邀请者是否已有伴侣
        if (inviter.partnerId) {
          wx.showToast({
            title: '邀请者已绑定其他伴侣',
            icon: 'none'
          });
          return;
        }
        
        // 检查当前用户是否已有伴侣
        const currentOpenid = app.globalData.openid;
        const currentUserResult = await db.collection('users').where({
          _openid: currentOpenid
        }).get();
        
        if (currentUserResult.data.length > 0 && currentUserResult.data[0].partnerId) {
          wx.showToast({
            title: '您已绑定其他伴侣',
            icon: 'none'
          });
          return;
        }
        
        // 一切验证通过，显示邀请者信息
        this.setData({
          inviterInfo: result.result.inviter
        });
      } else {
        wx.showToast({
          title: result.result.message || '邀请码无效',
          icon: 'none'
        });
      }
    } catch (err) {
      console.error('验证邀请码失败', err);
      wx.showToast({
        title: '验证失败，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ isVerifying: false });
    }
  },

  // 接受邀请
  async acceptInvitation() {
    try {
      this.setData({ isLoading: true });
      
      const inviteCode = this.data.inviteCode;
      
      // 确保有邀请者信息
      if (!this.data.inviterInfo || !this.data.inviterInfo._openid) {
        wx.showToast({
          title: '邀请者信息无效，请重新验证',
          icon: 'none'
        });
        return;
      }
      
      const inviterOpenid = this.data.inviterInfo._openid;
      
      // 调用云函数接受邀请
      const result = await wx.cloud.callFunction({
        name: 'user_acceptInvitation',
        data: {
          inviteCode: inviteCode,
          inviterOpenid: inviterOpenid
        }
      });
      
      if (result.result.success) {
        // 获取当前用户信息
        const currentOpenid = app.globalData.openid;
        const currentUserResult = await db.collection('users').where({
          _openid: currentOpenid
        }).get();
        
        if (currentUserResult.data.length > 0) {
          const currentUser = currentUserResult.data[0];
          
          // 更新本地存储的用户信息
          const updatedUserInfo = {
            ...currentUser,
            partnerId: inviterOpenid,
            partnerNickName: this.data.inviterInfo.nickName,
            partnerAvatarUrl: this.data.inviterInfo.avatarUrl
          };
          
          wx.setStorageSync('userData', updatedUserInfo);
        }
        
        wx.showToast({
          title: '绑定成功',
          icon: 'success'
        });
        
        // 返回首页
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/index/index'
          });
        }, 1500);
      } else {
        wx.showToast({
          title: result.result.message || '绑定失败',
          icon: 'none'
        });
      }
    } catch (err) {
      console.error('绑定失败', err);
      wx.showToast({
        title: '绑定失败，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ isLoading: false });
    }
  }
}) 