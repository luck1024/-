Page({
  data: {
    letterId: '',
    letter: null,
    isLoading: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({
        letterId: options.id
      });
      this.loadLetterDetail();
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

  // 加载信件详情
  async loadLetterDetail() {
    try {
      this.setData({ isLoading: true });
      
      const result = await wx.cloud.callFunction({
        name: 'letters_detail',
        data: {
          letterId: this.data.letterId
        }
      });
      
      if (result.result.success) {
        this.setData({
          letter: result.result.letter
        });
        
        // 如果信件未读，标记为已读
        if (!result.result.letter.isRead && !result.result.letter.isSender) {
          this.markAsRead();
        }
      } else {
        wx.showToast({
          title: result.result.message || '获取信件失败',
          icon: 'none'
        });
      }
    } catch (err) {
      console.error('获取信件失败', err);
      wx.showToast({
        title: '获取信件失败，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // 标记信件为已读
  async markAsRead() {
    try {
      await wx.cloud.callFunction({
        name: 'letters_markAsRead',
        data: {
          letterId: this.data.letterId
        }
      });
    } catch (err) {
      console.error('标记已读失败', err);
    }
  },

  // 预览图片
  previewImage(e) {
    const { index } = e.currentTarget.dataset;
    const { images } = this.data.letter;
    
    wx.previewImage({
      current: images[index],
      urls: images
    });
  },

  // 回复信件
  replyLetter() {
    wx.navigateTo({
      url: '/pages/letters/write/write'
    });
  },

  // 删除信件
  deleteLetter() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这封信件吗？删除后无法恢复。',
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await wx.cloud.callFunction({
              name: 'letters_delete',
              data: {
                letterId: this.data.letterId
              }
            });
            
            if (result.result.success) {
              wx.showToast({
                title: '删除成功'
              });
              
              // 返回上一页
              setTimeout(() => {
                wx.navigateBack();
              }, 1500);
            } else {
              wx.showToast({
                title: result.result.message || '删除失败',
                icon: 'none'
              });
            }
          } catch (err) {
            console.error('删除失败', err);
            wx.showToast({
              title: '删除失败，请重试',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 分享
  onShareAppMessage() {
    const { letter } = this.data;
    return {
      title: letter.title || '分享一封信',
      path: `/pages/letters/detail/detail?id=${this.data.letterId}`,
      imageUrl: letter.images && letter.images.length > 0 ? letter.images[0] : ''
    };
  }
}) 