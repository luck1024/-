// pages/letter/detail/detail.js
const app = getApp();
const db = wx.cloud.database();

Page({

  /**
   * 页面的初始数据
   */
  data: {
    letter: null,
    isLoading: true,
    isSender: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    if (options.id) {
      this.loadLetterDetail(options.id);
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

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

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

  // 加载情书详情
  async loadLetterDetail(id) {
    try {
      this.setData({ isLoading: true });
      
      const openid = app.globalData.openid;
      if (!openid) {
        console.error('未获取到 openid');
        return;
      }

      // 获取情书详情
      const result = await db.collection('letters').doc(id).get();
      const letter = result.data;
      
      if (!letter) {
        wx.showToast({
          title: '情书不存在',
          icon: 'none'
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
        return;
      }

      // 格式化日期
      const date = new Date(letter.createTime);
      const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      // 判断是否是发送者
      const isSender = letter.senderId === openid;
      
      // 如果是接收者且未读，标记为已读
      if (!isSender && !letter.isRead) {
        await db.collection('letters').doc(id).update({
          data: {
            isRead: true
          }
        });
      }
      
      this.setData({
        letter: {
          ...letter,
          date: formattedDate
        },
        isLoading: false,
        isSender
      });

    } catch (err) {
      console.error('加载情书详情失败:', err);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
      this.setData({ isLoading: false });
    }
  },

  // 删除情书
  async deleteLetter() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这封情书吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await db.collection('letters').doc(this.data.letter._id).remove();
            
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });
            
            setTimeout(() => {
              wx.navigateBack();
            }, 1500);
          } catch (err) {
            console.error('删除情书失败:', err);
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