Page({
  data: {
    title: '',
    description: '',
    deadline: '',
    reminderTime: '',
    assignee: 'self', // self, partner, both
    priority: 'normal', // low, normal, high
    isLoading: false,
    partnerInfo: null,
    today: ''
  },

  onLoad() {
    // 设置今天的日期
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    
    this.setData({
      today: `${year}-${month}-${day}`
    });
    
    // 获取伴侣信息
    this.loadPartnerInfo();
  },

  // 加载伴侣信息
  async loadPartnerInfo() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'user_getPartnerInfo'
      });
      
      if (result.result.success) {
        this.setData({
          partnerInfo: result.result.partner
        });
      }
    } catch (err) {
      console.error('获取伴侣信息失败', err);
    }
  },

  // 输入标题
  inputTitle(e) {
    this.setData({
      title: e.detail.value
    });
  },

  // 输入描述
  inputDescription(e) {
    this.setData({
      description: e.detail.value
    });
  },

  // 选择截止日期
  selectDeadline(e) {
    this.setData({
      deadline: e.detail.value
    });
  },

  // 选择提醒时间
  selectReminderTime(e) {
    this.setData({
      reminderTime: e.detail.value
    });
  },

  // 选择执行人
  selectAssignee(e) {
    this.setData({
      assignee: e.currentTarget.dataset.value
    });
  },

  // 选择优先级
  selectPriority(e) {
    this.setData({
      priority: e.currentTarget.dataset.value
    });
  },

  // 添加任务
  async addTask() {
    const { title, description, deadline, reminderTime, assignee, priority } = this.data;
    
    if (!title.trim()) {
      wx.showToast({
        title: '请输入任务标题',
        icon: 'none'
      });
      return;
    }
    
    try {
      this.setData({ isLoading: true });
      
      const result = await wx.cloud.callFunction({
        name: 'tasks_add',
        data: {
          title,
          description,
          deadline,
          reminderTime,
          assignee,
          priority
        }
      });
      
      if (result.result.success) {
        wx.showToast({
          title: '添加成功'
        });
        
        // 返回上一页
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({
          title: result.result.message || '添加失败',
          icon: 'none'
        });
      }
    } catch (err) {
      console.error('添加失败', err);
      wx.showToast({
        title: '添加失败，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ isLoading: false });
    }
  }
}) 