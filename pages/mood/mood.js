Page({
  data: {
    moods: [],
    isLoading: true,
    currentMonth: '',
    months: []
  },

  onLoad: function() {
    this.setCurrentMonth();
    this.loadMoods();
  },
  
  onShow: function() {
    // 检查登录状态
    const app = getApp();
    if (app.checkLoginStatus()) {
      this.loadMoods();
    }
  },
  
  // 设置当前月份
  setCurrentMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    this.setData({
      currentMonth: `${year}年${month}月`
    });
    
    // 生成最近6个月的选项
    const months = [];
    for (let i = 0; i < 6; i++) {
      const date = new Date(year, month - 1 - i, 1);
      const y = date.getFullYear();
      const m = date.getMonth() + 1;
      months.push({
        text: `${y}年${m}月`,
        value: `${y}-${m < 10 ? '0' + m : m}`
      });
    }
    this.setData({ months });
  },
  
  // 加载心情记录
  async loadMoods() {
    try {
      this.setData({ isLoading: true });
      
      const app = getApp();
      const userData = app.globalData.userInfo;
      
      if (!userData || !app.globalData.openid) {
        throw new Error('用户数据不存在');
      }
      
      // 获取当前月份的开始和结束日期
      const currentMonth = this.data.months[0].value;
      const [year, month] = currentMonth.split('-');
      const startDate = `${currentMonth}-01`;
      const endDate = `${currentMonth}-${new Date(year, month, 0).getDate()}`;
      
      // 从云数据库获取心情记录
      const db = wx.cloud.database();
      const moodsResult = await db.collection('moods')
        .where({
          _openid: app.globalData.openid,
          date: db.command.gte(startDate).and(db.command.lte(endDate))
        })
        .orderBy('date', 'desc')
        .get();
      
      this.setData({
        moods: moodsResult.data
      });
      
    } catch (err) {
      console.error('加载心情记录失败', err);
      wx.showToast({
        title: '加载数据失败',
        icon: 'none'
      });
    } finally {
      this.setData({ isLoading: false });
    }
  },
  
  // 切换月份
  changeMonth(e) {
    const index = e.detail.value;
    this.setData({
      currentMonth: this.data.months[index].text
    });
    this.loadMoods();
  },
  
  // 跳转到记录心情页面
  goToRecordMood() {
    wx.navigateTo({
      url: '/pages/mood/record/record'
    });
  },
  
  // 查看心情详情
  viewMoodDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/mood/detail/detail?id=${id}`
    });
  }
}) 