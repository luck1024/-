const app = getApp();
const db = wx.cloud.database();

Page({
  data: {
    date: '',
    time: '',
    emoji: '😊',
    text: '',
    emojiList: ['😊', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😇', '😉', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😜', '😝', '🤑', '🤗', '🤔', '🤭', '🤫', '🤥', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕']
  },

  onLoad: function() {
    // 设置当前的日期和时间
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    this.setData({
      date: `${year}-${month}-${day}`,
      time: `${hours}:${minutes}`
    });
  },
  
  // 选择日期
  bindDateChange(e) {
    this.setData({
      date: e.detail.value
    });
  },

  // 选择时间
  bindTimeChange(e) {
    this.setData({
      time: e.detail.value
    });
  },
  
  // 选择表情
  selectEmoji(e) {
    const emoji = e.currentTarget.dataset.emoji;
    this.setData({
      emoji: emoji
    });
  },
  
  // 输入心情文字
  inputText(e) {
    this.setData({
      text: e.detail.value
    });
  },
  
  // 保存心情
  async saveMood() {
    if (!this.data.text.trim()) {
      wx.showToast({
        title: '请输入心情内容',
        icon: 'none'
      });
      return;
    }
    
    try {
      wx.showLoading({
        title: '保存中...'
      });
      
      if (!app.globalData.openid) {
        throw new Error('用户未登录');
      }

      // 获取用户信息
      const userInfo = wx.getStorageSync('userData');
      if (!userInfo) {
        throw new Error('用户信息不存在');
      }
      
      // 创建新的心情记录
      const result = await db.collection('moods').add({
        data: {
          date: this.data.date,
          time: this.data.time,
          emoji: this.data.emoji,
          text: this.data.text,
          nickName: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl,
          partnerId: userInfo.partnerId || null, // 如果有伴侣，记录伴侣ID
          createTime: db.serverDate(),
          timestamp: new Date(`${this.data.date} ${this.data.time}`).getTime(), // 用于排序
          isPublic: true // 是否公开显示，可以添加设置
        }
      });
      
      if (!result._id) {
        throw new Error('保存失败');
      }

      wx.hideLoading();
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      });
      
      // 返回上一页并刷新列表
      setTimeout(() => {
        // 设置上一页需要刷新
        const pages = getCurrentPages();
        const prevPage = pages[pages.length - 2];
        if (prevPage) {
          prevPage.setData({
            needRefresh: true
          });
        }
        wx.navigateBack();
      }, 1500);
      
    } catch (err) {
      console.error('保存心情失败:', err);
      wx.hideLoading();
      wx.showToast({
        title: err.message || '保存失败，请重试',
        icon: 'none'
      });
    }
  }
}); 