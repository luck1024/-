Page({
  data: {
    momentId: '',
    moment: null,
    comments: [],
    commentContent: '',
    isLoading: false,
    isLoadingComments: false,
    page: 1,
    pageSize: 20,
    hasMoreComments: true
  },

  onLoad(options) {
    if (options.id) {
      this.setData({
        momentId: options.id
      });
      this.loadMomentDetail();
      this.loadComments();
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

  onReachBottom() {
    if (this.data.hasMoreComments) {
      this.loadMoreComments();
    }
  },

  // 加载动态详情
  async loadMomentDetail() {
    try {
      this.setData({ isLoading: true });
      
      const result = await wx.cloud.callFunction({
        name: 'moments_detail',
        data: {
          momentId: this.data.momentId
        }
      });
      
      if (result.result.success) {
        this.setData({
          moment: result.result.moment
        });
      } else {
        wx.showToast({
          title: result.result.message || '获取动态失败',
          icon: 'none'
        });
      }
    } catch (err) {
      console.error('获取动态失败', err);
      wx.showToast({
        title: '获取动态失败，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // 加载评论
  async loadComments() {
    try {
      this.setData({ isLoadingComments: true });
      
      const result = await wx.cloud.callFunction({
        name: 'moments_getComments',
        data: {
          momentId: this.data.momentId,
          page: 1,
          pageSize: this.data.pageSize
        }
      });
      
      if (result.result.success) {
        this.setData({
          comments: result.result.comments,
          hasMoreComments: result.result.currentPage < result.result.totalPages
        });
      } else {
        wx.showToast({
          title: result.result.message || '获取评论失败',
          icon: 'none'
        });
      }
    } catch (err) {
      console.error('获取评论失败', err);
      wx.showToast({
        title: '获取评论失败，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ isLoadingComments: false });
    }
  },

  // 加载更多评论
  async loadMoreComments() {
    if (!this.data.hasMoreComments || this.data.isLoadingComments) {
      return;
    }
    
    try {
      this.setData({ isLoadingComments: true });
      
      const nextPage = this.data.page + 1;
      const result = await wx.cloud.callFunction({
        name: 'moments_getComments',
        data: {
          momentId: this.data.momentId,
          page: nextPage,
          pageSize: this.data.pageSize
        }
      });
      
      if (result.result.success) {
        this.setData({
          comments: [...this.data.comments, ...result.result.comments],
          page: nextPage,
          hasMoreComments: nextPage < result.result.totalPages
        });
      } else {
        wx.showToast({
          title: result.result.message || '获取更多评论失败',
          icon: 'none'
        });
      }
    } catch (err) {
      console.error('获取更多评论失败', err);
      wx.showToast({
        title: '获取更多评论失败，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ isLoadingComments: false });
    }
  },

  // 输入评论内容
  inputComment(e) {
    this.setData({
      commentContent: e.detail.value
    });
  },

  // 发表评论
  async submitComment() {
    const { commentContent, momentId } = this.data;
    
    if (!commentContent.trim()) {
      wx.showToast({
        title: '请输入评论内容',
        icon: 'none'
      });
      return;
    }
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'moments_comment',
        data: {
          momentId,
          content: commentContent
        }
      });
      
      if (result.result.success) {
        wx.showToast({
          title: '评论成功'
        });
        
        // 清空输入框
        this.setData({
          commentContent: ''
        });
        
        // 重新加载评论
        this.setData({
          page: 1,
          comments: [],
          hasMoreComments: true
        }, () => {
          this.loadComments();
        });
      } else {
        wx.showToast({
          title: result.result.message || '评论失败',
          icon: 'none'
        });
      }
    } catch (err) {
      console.error('评论失败', err);
      wx.showToast({
        title: '评论失败，请重试',
        icon: 'none'
      });
    }
  },

  // 删除评论
  deleteComment(e) {
    const { commentId } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条评论吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await wx.cloud.callFunction({
              name: 'moments_deleteComment',
              data: {
                commentId
              }
            });
            
            if (result.result.success) {
              wx.showToast({
                title: '删除成功'
              });
              
              // 从列表中移除该评论
              const newComments = this.data.comments.filter(item => item._id !== commentId);
              this.setData({
                comments: newComments
              });
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

  // 点赞/取消点赞
  async toggleLike() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'moments_toggleLike',
        data: {
          momentId: this.data.momentId
        }
      });
      
      if (result.result.success) {
        // 更新点赞状态
        const moment = { ...this.data.moment };
        moment.isLiked = !moment.isLiked;
        moment.likeCount = moment.isLiked ? moment.likeCount + 1 : moment.likeCount - 1;
        
        this.setData({
          moment
        });
      } else {
        wx.showToast({
          title: result.result.message || '操作失败',
          icon: 'none'
        });
      }
    } catch (err) {
      console.error('操作失败', err);
      wx.showToast({
        title: '操作失败，请重试',
        icon: 'none'
      });
    }
  },

  // 预览图片
  previewImage(e) {
    const { index } = e.currentTarget.dataset;
    const { images } = this.data.moment;
    
    wx.previewImage({
      current: images[index],
      urls: images
    });
  },

  // 分享
  onShareAppMessage() {
    const { moment } = this.data;
    return {
      title: moment.content.substring(0, 30) || '分享一个动态',
      path: `/pages/moment/detail/detail?id=${this.data.momentId}`,
      imageUrl: moment.images && moment.images.length > 0 ? moment.images[0] : ''
    };
  }
}) 