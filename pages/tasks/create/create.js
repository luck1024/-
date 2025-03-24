const app = getApp();
const db = wx.cloud.database();

Page({
  data: {
    isEdit: false,
    taskId: null,
    taskType: 'daily',
    title: '',
    description: '',
    deadline: '',
    reward: '',
    today: '',
    reminder: false,
    reminderTime: '',
    selectedReward: 0,
    customReward: '',
    showRewardModal: false,
    rewards: [
      { text: '一个拥抱', value: 'hug' },
      { text: '一顿晚餐', value: 'dinner' },
      { text: '一次约会', value: 'date' },
      { text: '一份礼物', value: 'gift' }
    ],
    tags: [
      { text: '生活', selected: false },
      { text: '运动', selected: false },
      { text: '学习', selected: false },
      { text: '工作', selected: false },
      { text: '娱乐', selected: false },
      { text: '其他', selected: false }
    ]
  },

  onLoad(options) {
    // 设置当前日期
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    this.setData({ today: dateStr });

    // 如果有id参数，说明是编辑模式
    if (options.id) {
      this.setData({ 
        isEdit: true,
        taskId: options.id
      });
      this.loadTaskData(options.id);
    }
  },

  async loadTaskData(id) {
    try {
      const taskResult = await db.collection('tasks').doc(id).get();
      const task = taskResult.data;
      
      if (task) {
        // 获取用户信息
        const openid = app.globalData.openid;
        const userInfo = wx.getStorageSync('userData');
        
        // 检查是否为任务创建者或其伴侣
        if (task._openid !== openid && task.partnerId !== openid) {
          wx.showToast({
            title: '无权编辑此任务',
            icon: 'none'
          });
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
          return;
        }
        
        this.setData({
          taskType: task.type,
          title: task.title,
          description: task.description,
          deadline: task.deadline,
          reward: task.reward,
          reminder: task.reminder || false,
          reminderTime: task.reminderTime || ''
        });
      } else {
        wx.showToast({
          title: '任务不存在',
          icon: 'none'
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      }
    } catch (err) {
      console.error('加载任务数据失败:', err);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  selectType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ taskType: type });
  },

  onDateChange(e) {
    this.setData({ deadline: e.detail.value });
  },

  onTimeChange(e) {
    this.setData({ reminderTime: e.detail.value });
  },

  toggleReminder(e) {
    this.setData({ 
      reminder: e.detail.value,
      reminderTime: e.detail.value ? '09:00' : ''
    });
  },

  selectReward(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ selectedReward: index });
  },

  showCustomReward() {
    this.setData({ 
      showRewardModal: true,
      selectedReward: -1
    });
  },

  hideCustomReward() {
    this.setData({ showRewardModal: false });
  },

  onRewardInput(e) {
    this.setData({ customReward: e.detail.value });
  },

  confirmCustomReward() {
    if (this.data.customReward.trim()) {
      this.hideCustomReward();
    } else {
      wx.showToast({
        title: '请输入奖励内容',
        icon: 'none'
      });
    }
  },

  toggleTag(e) {
    const index = e.currentTarget.dataset.index;
    const tags = this.data.tags;
    tags[index].selected = !tags[index].selected;
    this.setData({ tags });
  },

  async submitTask(e) {
    try {
      const formData = e.detail.value;
      
      // 表单验证
      if (!formData.title.trim()) {
        wx.showToast({
          title: '请输入任务标题',
          icon: 'none'
        });
        return;
      }

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

      // 构建任务数据
      const taskData = {
        type: this.data.taskType,
        title: formData.title.trim(),
        description: formData.description.trim(),
        deadline: this.data.deadline,
        reward: formData.reward.trim(),
        status: 'pending',
        reminder: this.data.reminder,
        reminderTime: this.data.reminderTime,
        completed: false,
        nickName: userInfo.nickName,
        avatarUrl: userInfo.avatarUrl,
        partnerId: userInfo.partnerId || null
      };

      // 保存任务
      if (this.data.isEdit) {
        // 编辑模式：先检查权限
        if (this.data.taskId) {
          const taskDoc = await db.collection('tasks').doc(this.data.taskId).get();
          const task = taskDoc.data;
          
          // 检查是否为任务创建者或其伴侣
          if (task._openid !== openid && task.partnerId !== openid) {
            wx.showToast({
              title: '无权修改此任务',
              icon: 'none'
            });
            return;
          }
          
          // 有权限，更新任务
          await db.collection('tasks').doc(this.data.taskId).update({
            data: {
              ...taskData,
              updateTime: db.serverDate()
            }
          });
        }
      } else {
        // 创建模式：添加新任务
        await db.collection('tasks').add({
          data: {
            ...taskData,
            createTime: db.serverDate(),
            updateTime: db.serverDate()
          }
        });
      }

      // 显示成功提示并返回
      wx.showToast({
        title: this.data.isEdit ? '修改成功' : '创建成功',
        icon: 'success',
        duration: 1500,
        success: () => {
          // 返回上一页并刷新
          setTimeout(() => {
            const pages = getCurrentPages();
            const prevPage = pages[pages.length - 2];
            if (prevPage && prevPage.loadTasks) {
              prevPage.loadTasks(); // 刷新任务列表
            }
            wx.navigateBack();
          }, 1500);
        }
      });
    } catch (err) {
      console.error('保存任务失败', err);
      wx.showToast({
        title: '保存失败',
        icon: 'error'
      });
    }
  },

  getRewardText() {
    if (this.data.selectedReward === -1) {
      return this.data.customReward;
    }
    return this.data.rewards[this.data.selectedReward].text;
  },

  setTaskReminder(task) {
    // 设置提醒逻辑
    // 可以使用微信小程序的订阅消息功能
  }
}); 