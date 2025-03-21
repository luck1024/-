// pages/moments/moments.js
const app = getApp();
const db = wx.cloud.database();
const _ = db.command;

Page({

  /**
   * 页面的初始数据
   */
  data: {
    userInfo: {
      avatar: '/images/mhhy/1681e8119e167779d04c40e5cb65fba.jpg',
      nickname: '靓仔'
    },
    moments: [
      {
        id: 1,
        avatar: '/images/mhhy/1681e8119e167779d04c40e5cb65fba.jpg',
        nickname: '靓仔',
        time: '永远',
        content: '和你在一起的每一天都很开心 ❤️',
        images: [
          '/images/mhhy/1681e8119e167779d04c40e5cb65fba.jpg',
          '/images/mhhy/d2fa3e23aa25a9652e36f2fa3fb841e.jpg'
        ],
        location: '杭州市',
        likes: 12,
        isLiked: false,
        comments: [
          {
            id: 1,
            nickname: '叼毛',
            content: '真好看！'
          }
        ]
      },
      // 可以添加更多动态数据
    ],
    isLoading: false,
    isEmpty: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // this.loadMoments();
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 获取用户信息
    const userData = wx.getStorageSync('userData');
    if (userData) {
      this.setData({
        userInfo: {
          avatarUrl: userData.avatarUrl || '/images/default-avatar.png',
          nickname: userData.nickName || '用户'
        }
      });
    }
    
    this.loadMoments();
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },

  createPost() {
    wx.navigateTo({
      url: '/pages/moments/post/post'
    });
  },

  previewImage(e) {
    const { url, images } = e.currentTarget.dataset;
    console.log('预览图片:', url, images);
    
    wx.previewImage({
      current: url, // 当前显示图片的链接
      urls: images // 需要预览的图片链接列表
    });
  },

  toggleLike(e) {
    const id = e.currentTarget.dataset.id;
    const moments = this.data.moments.map(moment => {
      if (moment.id === id) {
        return {
          ...moment,
          isLiked: !moment.isLiked,
          likes: moment.isLiked ? moment.likes - 1 : moment.likes + 1
        };
      }
      return moment;
    });
    this.setData({ moments });
  },

  showCommentInput(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '评论',
      editable: true,
      placeholderText: '说点什么...',
      success: (res) => {
        if (res.confirm && res.content) {
          const moments = this.data.moments.map(moment => {
            if (moment.id === id) {
              return {
                ...moment,
                comments: [...moment.comments, {
                  id: moment.comments.length + 1,
                  nickname: this.data.userInfo.nickname,
                  content: res.content
                }]
              };
            }
            return moment;
          });
          this.setData({ moments });
        }
      }
    });
  },

  // 加载动态
  async loadMoments() {
    try {
      this.setData({ isLoading: true });
      
      const openid = app.globalData.openid;
      if (!openid) {
        console.error('未获取到 openid');
        return;
      }

      // 获取用户信息
      const userInfo = wx.getStorageSync('userData');
      if (!userInfo) {
        console.error('未找到用户信息');
        return;
      }

      // 构建查询条件
      let query = {};
      
      if (userInfo.partnerId) {
        // 如果有伴侣，获取两个人的动态
        query = {
          _openid: _.in([openid, userInfo.partnerId])
        };
      } else {
        // 没有伴侣，只获取自己的动态
        query = {
          _openid: openid
        };
      }

      // 查询动态数据 - 使用 diaries 表
      const diariesResult = await db.collection('diaries')
        .where(query)
        .orderBy('createTime', 'desc')
        .get();

      const diaries = diariesResult.data;
      
      this.setData({
        moments: diaries, // 保持页面变量名不变，但数据来源改为 diaries
        isLoading: false,
        isEmpty: diaries.length === 0
      });

    } catch (err) {
      console.error('加载动态失败:', err);
      // 检查是否是集合不存在的错误
      if (err.errCode === -502005) {
        console.log('diaries 集合不存在');
      }
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
      this.setData({ 
        isLoading: false,
        isEmpty: true
      });
    }
  },

  formatTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minute = 60 * 1000;
    const hour = minute * 60;
    const day = hour * 24;
    const month = day * 30;
    const year = day * 365;

    // 小于1分钟
    if (diff < minute) {
      return '刚刚';
    }
    // 小于1小时
    if (diff < hour) {
      return Math.floor(diff / minute) + '分钟前';
    }
    // 小于24小时
    if (diff < day) {
      return Math.floor(diff / hour) + '小时前';
    }
    // 小于30天
    if (diff < month) {
      return Math.floor(diff / day) + '天前';
    }
    // 小于365天
    if (diff < year) {
      return Math.floor(diff / month) + '个月前';
    }
    // 大于365天
    return Math.floor(diff / year) + '年前';
  },

  // 点赞功能
  async handleLike(e) {
    const { id } = e.currentTarget.dataset;
    console.log('点赞动态:', id);
    
    try {
      // 获取当前动态
      const moment = this.data.moments.find(m => m._id === id);
      if (!moment) {
        console.error('未找到对应动态');
        return;
      }
      
      // 检查是否已点赞
      const isLiked = moment.isLiked || false;
      const newLikes = (moment.likes || 0) + (isLiked ? -1 : 1);
      
      console.log('当前点赞状态:', isLiked, '新点赞数:', newLikes);
      
      // 更新云数据库
      await db.collection('diaries').doc(id).update({
        data: {
          likes: newLikes
        }
      });
      
      console.log('数据库更新成功');
      
      // 更新本地数据
      const moments = this.data.moments.map(m => {
        if (m._id === id) {
          return {
            ...m,
            likes: newLikes,
            isLiked: !isLiked
          };
        }
        return m;
      });
      
      this.setData({ moments });
      console.log('本地数据更新成功');
      
    } catch (err) {
      console.error('点赞失败:', err);
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      });
    }
  },

  // 评论功能
  async handleComment(e) {
    const { id } = e.currentTarget.dataset;
    console.log('评论动态:', id);
    
    wx.showModal({
      title: '评论',
      editable: true,
      placeholderText: '说点什么...',
      success: async (res) => {
        if (res.confirm && res.content.trim()) {
          try {
            console.log('评论内容:', res.content);
            
            // 获取用户信息
            const userInfo = wx.getStorageSync('userData');
            if (!userInfo) {
              console.error('未找到用户信息');
              wx.showToast({
                title: '用户信息获取失败',
                icon: 'none'
              });
              return;
            }
            
            // 获取当前动态
            const moment = this.data.moments.find(m => m._id === id);
            if (!moment) {
              console.error('未找到对应动态');
              return;
            }
            
            // 构建新评论
            const newComment = {
              id: Date.now().toString(),
              content: res.content.trim(),
              nickname: userInfo.nickName || '用户',
              time: new Date().toISOString()
            };
            
            console.log('新评论:', newComment);
            
            // 更新评论列表
            const comments = moment.comments || [];
            const newComments = [...comments, newComment];
            
            // 更新云数据库
            await db.collection('diaries').doc(id).update({
              data: {
                comments: newComments
              }
            });
            
            console.log('数据库更新成功');
            
            // 更新本地数据
            const moments = this.data.moments.map(m => {
              if (m._id === id) {
                return {
                  ...m,
                  comments: newComments
                };
              }
              return m;
            });
            
            this.setData({ moments });
            console.log('本地数据更新成功');
            
            wx.showToast({
              title: '评论成功',
              icon: 'success'
            });
          } catch (err) {
            console.error('评论失败:', err);
            wx.showToast({
              title: '评论失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 删除动态
  async deleteMoment(e) {
    const { id } = e.currentTarget.dataset;
    wx.showModal({
      title: '提示',
      content: '确定要删除这条动态吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            // 从云数据库删除
            await db.collection('diaries').doc(id).remove();
            
            // 更新本地数据
            const moments = this.data.moments.filter(moment => moment._id !== id);
            this.setData({ moments });
            
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });
          } catch (err) {
            console.error('删除动态失败:', err);
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            });
          }
        }
      }
    });
  }
})