const app = getApp();
const db = wx.cloud.database();

Page({
  data: {
    content: '',
    moods: ['开心', '想你', '难过', '生气', '平静'],
    moodEmojis: ['😊', '🥰', '😢', '😠', '😌'],
    selectedMood: -1,
    currentDate: '',
    weather: '',
    canSave: false,
    userInfo: null,
    isSubmitting: false
  },

  onLoad() {
    // 设置当前日期
    const now = new Date();
    const dateStr = `${now.getFullYear()}年${String(now.getMonth() + 1).padStart(2, '0')}月${String(now.getDate()).padStart(2, '0')}日`;
    this.setData({
      currentDate: dateStr
    });

    // 获取天气信息（如果需要的话）
    this.getWeather();
    
    // 获取用户信息
    this.getUserInfo();
  },
  
  // 获取用户信息
  async getUserInfo() {
    try {
      const userData = wx.getStorageSync('userData');
      if (userData) {
        this.setData({
          userInfo: userData
        });
        
        // 检查是否有伴侣
        if (!userData.partnerId) {
          wx.showToast({
            title: '请先绑定伴侣',
            icon: 'none'
          });
        }
      } else {
        console.error('未找到用户信息');
      }
    } catch (err) {
      console.error('获取用户信息失败:', err);
    }
  },

  onInput(e) {
    const content = e.detail.value;
    this.setData({
      content,
      canSave: content.trim().length > 0 && this.data.selectedMood !== -1
    });
  },

  selectMood(e) {
    const selectedMood = e.currentTarget.dataset.index;
    this.setData({
      selectedMood,
      canSave: this.data.content.trim().length > 0 && selectedMood !== -1
    });
  },

  getWeather() {
    // 这里可以接入天气API
    // 示例数据
    // this.setData({
    //   weather: '晴朗 23℃'
    // });
  },

  cancelWrite() {
    if (this.data.content.trim().length > 0) {
      wx.showModal({
        title: '提示',
        content: '确定要放弃编写吗？',
        success: (res) => {
          if (res.confirm) {
            wx.navigateBack();
          }
        }
      });
    } else {
      wx.navigateBack();
    }
  },

  async saveLetter() {
    if (!this.data.canSave) return;
    
    try {
      this.setData({ isSubmitting: true });
      
      const openid = app.globalData.openid;
      if (!openid) {
        console.error('未获取到 openid');
        wx.showToast({
          title: '用户信息获取失败',
          icon: 'none'
        });
        this.setData({ isSubmitting: false });
        return;
      }
      
      // 获取用户信息
      const userInfo = this.data.userInfo;
      if (!userInfo) {
        console.error('未找到用户信息');
        wx.showToast({
          title: '用户信息获取失败',
          icon: 'none'
        });
        this.setData({ isSubmitting: false });
        return;
      }
      
      // 检查是否有伴侣
      if (!userInfo.partnerId) {
        wx.showToast({
          title: '请先绑定伴侣',
          icon: 'none'
        });
        this.setData({ isSubmitting: false });
        return;
      }

      const { content, selectedMood, moods, moodEmojis, currentDate, weather } = this.data;
      
      // 构建情书数据
      const letterData = {
        content: content.trim(),
        mood: moods[selectedMood],
        moodEmoji: moodEmojis[selectedMood],
        weather: weather || '',
        senderId: openid,
        senderName: userInfo.nickName || '未知用户',
        senderAvatar: userInfo.avatarUrl || '/images/default-avatar.png',
        receiverId: userInfo.partnerId,
        createTime: db.serverDate(),
        isRead: false
      };

      // 保存到云数据库
      await db.collection('letters').add({
        data: letterData
      });

      wx.showToast({
        title: '发送成功',
        icon: 'success',
        duration: 1500,
        success: () => {
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        }
      });

    } catch (err) {
      console.error('保存情书失败:', err);
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      });
    } finally {
      this.setData({ isSubmitting: false });
    }
  }
}); 