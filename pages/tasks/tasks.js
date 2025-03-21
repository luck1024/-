const app = getApp();
const db = wx.cloud.database();
const _ = db.command;

Page({
  data: {
    currentCategory: 'daily',
    currentDate: '',
    featuredTasks: [
      {
        id: 1,
        title: '早安亲亲',
        description: '每天互道早安，开启美好一天',
        participants: 2,
        reward: '爱心+1',
        color: 'linear-gradient(45deg, #ff9a9e, #fad0c4)'
      },
      // ... 其他推荐任务
    ],
    currentTasks: [],
    dailyCount: 0,
    challengeCount: 0,
    customCount: 0,
    completedToday: 0,
    remainingToday: 0,
    streakDays: 0,
    progressRate: 0,
    tasks: [],
    typeIcons: {
      daily: 'calendar-today',
      challenge: 'hearts',
      custom: 'create-new'
    },
    isLoading: true
  },

  onLoad() {
    this.setCurrentDate();
    this.loadTasks();
  },

  onShow() {
    this.loadTasks();
  },

  setCurrentDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    this.setData({
      currentDate: `${year}-${month}-${day}`
    });
  },

  async loadTasks() {
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
        // 如果有伴侣，获取两个人的任务
        query = {
          _openid: _.in([openid, userInfo.partnerId])
        };
      } else {
        // 没有伴侣，只获取自己的任务
        query = {
          _openid: openid
        };
      }

      // 查询任务数据
      const tasksResult = await db.collection('tasks')
        .where(query)
        .orderBy('createTime', 'desc')
        .get();

      const allTasks = tasksResult.data;
      const today = this.data.currentDate;

      // 1. 处理今日任务进度
      const todayTasks = allTasks.filter(task => {
        return task.type === 'daily' && 
               (!task.deadline || task.deadline === today);
      });

      // 修改完成状态的判断逻辑
      const completedToday = todayTasks.filter(task => task.status === 'completed').length;
      const totalToday = todayTasks.length;
      const remainingToday = totalToday - completedToday;
      const progressRate = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;

      // 2. 计算连续打卡天数
      const streakDays = this.calculateStreakDays(allTasks);

      // 3. 根据当前分类筛选显示的任务列表
      let displayTasks = [];
      if (this.data.currentCategory === 'daily') {
        // 每日任务：只显示今天的任务
        displayTasks = todayTasks;
      } else {
        // 其他类型任务：显示对应类型的所有任务
        displayTasks = allTasks.filter(task => task.type === this.data.currentCategory);
      }

      // 4. 任务排序：未完成的在前，已完成的在后
      displayTasks.sort((a, b) => {
        if (a.status !== b.status) {
          return a.status === 'completed' ? 1 : -1;
        }
        return new Date(b.createTime) - new Date(a.createTime);
      });
      console.log(displayTasks);

      // 5. 更新页面数据
      this.setData({
        tasks: displayTasks,
        completedToday,
        remainingToday,
        progressRate,
        streakDays,
        isLoading: false
      });

    } catch (err) {
      console.error('加载任务失败:', err);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
      this.setData({ isLoading: false });
    }
  },

  calculateStreakDays(tasks) {
    const dailyTasks = tasks.filter(task => task.type === 'daily');
    if (dailyTasks.length === 0) return 0;

    // 获取每天的完成情况
    const completionDates = new Set();
    dailyTasks.forEach(task => {
      if (task.status === 'completed') { // 修改这里的判断条件
        const date = task.deadline || this.data.currentDate;
        completionDates.add(date);
      }
    });

    // 计算连续天数
    let streak = 0;
    const today = new Date(this.data.currentDate);
    let currentDate = new Date(today);

    while (completionDates.has(currentDate.toISOString().split('T')[0])) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    }

    return streak;
  },

  switchCategory(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ currentCategory: type }, () => {
      this.loadTasks();
    });
  },

  goToDetail(e) {
    console.log(e);
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/tasks/detail/detail?id=${id}`
    });
  },

  createTask() {
    console.log('createTask');
    
    wx.navigateTo({
      url: '/pages/tasks/create/create'
    });
  },

  viewHistory() {
    wx.navigateTo({
      url: '/pages/tasks/history/history'
    });
  },

  viewAllTasks() {
    wx.navigateTo({
      url: `/pages/tasks/list/list?type=${this.data.currentCategory}`
    });
  },

  editTask(e) {
    console.log(e);
    
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/tasks/create/create?id=${id}`
    });
  },

  shareTask(e) {
    const id = e.currentTarget.dataset.id;
    const task = this.data.tasks.find(t => t._id === id);
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage']
    });
  },

  async deleteTask(e) {
    const id = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个任务吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await db.collection('tasks').doc(id).remove();
            
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });
            
            // 重新加载任务列表
            this.loadTasks();
          } catch (err) {
            console.error('删除任务失败:', err);
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  onShareAppMessage(e) {
    const task = this.data.tasks.find(t => t._id === e.target.dataset.id);
    return {
      title: task ? task.title : '情侣任务',
      path: '/pages/tasks/tasks'
    };
  }
}); 