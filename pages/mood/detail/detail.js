Page({
  data: {
    mood: null,
    isLoading: true,
    isDeleting: false
  },

  onLoad: function(options) {
    if (options.id) {
      this.loadMoodDetail(options.id);
    } else {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },
  
  // 加载心情详情
  async loadMoodDetail(id) {
    try {
      this.setData({ isLoading: true });
      
      const db = wx.cloud.database();
      const result = await db.collection('moods').doc(id).get();
      
      if (result.data) {
        this.setData({
          mood: result.data
        });
      } else {
        throw new Error('心情记录不存在');
      }
      
    } catch (err) {
      console.error('加载心情详情失败', err);
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ isLoading: false });
    }
  },
  
  // 编辑心情
  editMood() {
    wx.navigateTo({
      url: `/pages/mood/record/record?id=${this.data.mood._id}`
    });
  },
  
  // 删除心情
  async deleteMood() {
    const that = this;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条心情记录吗？',
      confirmColor: '#ff6b81',
      success: async (res) => {
        if (res.confirm) {
          try {
            that.setData({ isDeleting: true });
            
            const db = wx.cloud.database();
            await db.collection('moods').doc(that.data.mood._id).remove();
            
            wx.showToast({
              title: '删除成功'
            });
            
            // 延迟返回上一页
            setTimeout(() => {
              wx.navigateBack();
            }, 1500);
            
          } catch (err) {
            console.error('删除心情失败', err);
            wx.showToast({
              title: '删除失败，请重试',
              icon: 'none'
            });
            that.setData({ isDeleting: false });
          }
        }
      }
    });
  }
}) 