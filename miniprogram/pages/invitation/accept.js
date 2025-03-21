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
      
      const result = await wx.cloud.callFunction({
        name: 'user_verifyInviteCode',
        data: { inviteCode }
      });
      
      if (result.result.success) {
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
      
      const result = await wx.cloud.callFunction({
        name: 'user_acceptInvitation',
        data: {
          inviteCode: this.data.inviteCode
        }
      });
      
      if (result.result.success) {
        wx.showToast({
          title: '绑定成功'
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