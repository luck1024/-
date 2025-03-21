Page({
  data: {
    version: '1.0.0',
    updateLog: [
      {
        version: '1.0.0',
        date: '2024-03-20',
        content: [
          '首次发布',
          '支持情侣之间发送私密信件',
          '支持共同任务管理',
          '支持发布动态与评论互动'
        ]
      }
      // 可以添加更多版本更新记录
    ]
  },

  // 复制客服微信
  copyWechat() {
    wx.setClipboardData({
      data: 'your_wechat_id', // 替换为实际的客服微信号
      success: () => {
        wx.showToast({
          title: '已复制客服微信'
        });
      }
    });
  },

  // 发送反馈邮件
  sendFeedback() {
    wx.setClipboardData({
      data: '2692405643@qq.com', // 替换为实际的反馈邮箱
      success: () => {
        wx.showToast({
          title: '已复制反馈邮箱'
        });
      }
    });
  },

  // 查看用户协议
  viewUserAgreement() {
    wx.navigateTo({
      url: '/pages/auth/agreement/agreement'
    });
  },

  // 查看隐私政策
  viewPrivacyPolicy() {
    wx.navigateTo({
      url: '/pages/auth/privacy/privacy'
    });
  }
}) 