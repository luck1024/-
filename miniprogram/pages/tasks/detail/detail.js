Page({
  data: {
    taskId: '',
    task: null,
    isLoading: false,
    isEditing: false,
    editData: {
      title: '',
      description: '',
      deadline: '',
      reminderTime: '',
      assignee: '',
      priority: ''
    }
  },

  onLoad(options) {
    if (options.id) {
      this.setData({
        taskId: options.id
      });
      this.loadTaskDetail();
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

  // 加载任务详情
  async loadTaskDetail() {
    try {
      this.setData({ isLoading: true });
      
      const result = await wx.cloud.callFunction({
        name: 'tasks_detail',
        data: {
          taskId: this.data.taskId
        }
      });
      
      if (result.result.success) {
        this.setData({
          task: result.result.task,
          editData: { ...result.result.task }
        });
      } else {
        wx.showToast({
          title: result.result.message || '获取任务失败',
          icon: 'none'
        });
      }
    } catch (err) {
      console.error('获取任务失败', err);
      wx.showToast({
        title: '获取任务失败，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // 切换编辑模式
  toggleEdit() {
    this.setData({
      isEditing: !this.data.isEditing,
      editData: { ...this.data.task }
    });
  },

  // 输入标题
  inputTitle(e) {
    this.setData({
      'editData.title': e.detail.value
    });
  },

  // 输入描述
  inputDescription(e) {
    this.setData({
      'editData.description': e.detail.value
    });
  },

  // 选择截止日期
  selectDeadline(e) {
    this.setData({
      'editData.deadline': e.detail.value
    });
  },

  // 选择提醒时间
  selectReminderTime(e) {
    this.setData({
      'editData.reminderTime': e.detail.value
    });
  },

  // 选择执行人
  selectAssignee(e) {
    this.setData({
      'editData.assignee': e.currentTarget.dataset.value
    });
  },

  // 选择优先级
  selectPriority(e) {
    this.setData({
      'editData.priority': e.currentTarget.dataset.value
    });
  },

  // 保存编辑
  async saveEdit() {
    const { title } = this.data.editData;
    
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
        name: 'tasks_update',
        data: {
          taskId: this.data.taskId,
          ...this.data.editData
        }
      });
      
      if (result.result.success) {
        wx.showToast({
          title: '保存成功'
        });
        
        this.setData({
          task: { ...this.data.editData },
          isEditing: false
        });
      } else {
        wx.showToast({
          title: result.result.message || '保存失败',
          icon: 'none'
        });
      }
    } catch (err) {
      console.error('保存失败', err);
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // 完成任务
  async completeTask() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'tasks_complete',
        data: {
          taskId: this.data.taskId
        }
      });
      
      if (result.result.success) {
        wx.showToast({
          title: '任务已完成'
        });
        
        const task = { ...this.data.task };
        task.status = 'completed';
        task.completedTime = new Date().toISOString();
        
        this.setData({ task });
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

  // 删除任务
  deleteTask() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个任务吗？删除后无法恢复。',
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await wx.cloud.callFunction({
              name: 'tasks_delete',
              data: {
                taskId: this.data.taskId
              }
            });
            
            if (result.result.success) {
              wx.showToast({
                title: '删除成功'
              });
              
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
  }
}) 