const app = getApp();
const db = wx.cloud.database();
const _ = db.command;

Page({
  data: {
    letters: [],
    moods: ['开心', '想你', '难过', '生气', '平静'],
    isLoading: false,
    isEmpty: false,
    userInfo: null,
    hasPartner: false
  },

  onLoad() {
    this.getUserInfo();
  },

  onShow() {
    this.loadLetters(); // 每次显示页面时重新加载
  },

  // 获取用户信息
  async getUserInfo() {
    try {
      const userData = wx.getStorageSync('userData');
      if (userData) {
        const hasPartner = !!userData.partnerId;
        this.setData({
          userInfo: userData,
          hasPartner: hasPartner
        });
        
        if (hasPartner) {
          this.loadLetters();
        } else {
          this.setData({
            isEmpty: true,
            letters: []
          });
          
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

  // 从云数据库加载情书
  async loadLetters() {
    try {
      this.setData({ isLoading: true });
      
      const openid = app.globalData.openid;
      if (!openid) {
        console.error('未获取到 openid');
        return;
      }

      // 获取用户信息
      const userInfo = this.data.userInfo || wx.getStorageSync('userData');
      if (!userInfo) {
        console.error('未找到用户信息');
        return;
      }

      // 如果没有伴侣，显示提示
      if (!userInfo.partnerId) {
        this.setData({
          letters: [],
          isLoading: false,
          isEmpty: true
        });
        return;
      }

      // 构建查询条件：发送者是自己或伴侣，接收者是自己或伴侣
      const query = {
        $or: [
          // 自己发送的信
          {
            senderId: openid,
            receiverId: userInfo.partnerId
          },
          // 伴侣发送给自己的信
          {
            senderId: userInfo.partnerId,
            receiverId: openid
          }
        ]
      };

      // 查询情书数据
      const lettersResult = await db.collection('letters')
        .where(query)
        .orderBy('createTime', 'desc')
        .get();

      const letters = lettersResult.data.map(letter => {
        // 格式化日期
        const date = new Date(letter.createTime);
        const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        
        return {
          ...letter,
          date: formattedDate,
          isSender: letter.senderId === openid
        };
      });
      
      this.setData({
        letters,
        isLoading: false,
        isEmpty: letters.length === 0
      });

    } catch (err) {
      console.error('加载情书失败:', err);
      // 检查是否是集合不存在的错误
      if (err.errCode === -502005) {
        console.log('letters 集合不存在');
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

  showWriteModal() {
    // 检查是否有伴侣
    const userInfo = this.data.userInfo || wx.getStorageSync('userData');
    if (!userInfo || !userInfo.partnerId) {
      wx.showToast({
        title: '请先绑定伴侣',
        icon: 'none'
      });
      return;
    }
    
    wx.navigateTo({
      url: '/pages/letter/write/write'
    });
  },

  viewLetter(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/letter/detail/detail?id=${id}`
    });
  },

  async deleteLetter(e) {
    const id = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这封情书吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            // 从云数据库删除
            await db.collection('letters').doc(id).remove();
            
            // 重新加载数据
            this.loadLetters();
            
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });
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
}); 