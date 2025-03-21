// pages/tasks/detail/detail.js
const app = getApp();
const db = wx.cloud.database();

Page({

  /**
   * 页面的初始数据
   */
  data: {
    taskId: '',
    task: null,
    isLoading: true,
    isOwner: false,
    showSubmitPopup: false,
    submitContent: '',
    submitImages: [],
    submitting: false,
    statusText: {
      pending: '待处理',
      inProgress: '进行中',
      submitted: '已提交',
      completed: '已完成'
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    if (options.id) {
      this.setData({ taskId: options.id });
      this.loadTaskDetail(options.id);
    } else {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      });
      setTimeout(() => wx.navigateBack(), 1500);
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
    if (!this.data.task) return {};
    return {
      title: this.data.task.title,
      path: `/pages/tasks/detail/detail?id=${this.data.task._id}`
    };
  },

  async loadTaskDetail(id) {
    try {
      this.setData({ isLoading: true });
      
      const openid = app.globalData.openid;
      if (!openid) {
        console.error('未获取到 openid');
        return;
      }

      // 获取任务详情
      const taskResult = await db.collection('tasks').doc(id).get();
      
      if (!taskResult.data) {
        throw new Error('任务不存在');
      }

      const task = taskResult.data;
      
      // 格式化时间
      const createTime = new Date(task.createTime);
      const formattedTime = this.formatDate(createTime);

      // 格式化完成时间（如果有）
      let completedFormattedTime = null;
      if (task.completedTime) {
        completedFormattedTime = this.formatDate(new Date(task.completedTime));
      }

      // 格式化提交时间（如果有）
      let submitFormattedTime = null;
      if (task.submitTime) {
        submitFormattedTime = this.formatDate(new Date(task.submitTime));
      }

      this.setData({
        task: {
          ...task,
          formattedTime,
          completedFormattedTime,
          submitFormattedTime
        },
        isLoading: false,
        isOwner: task._openid === openid
      });

    } catch (err) {
      console.error('加载任务详情失败:', err);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  formatDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  },

  showSubmitPopup() {
    this.setData({
      showSubmitPopup: true,
      submitContent: '',
      submitImages: []
    });
  },

  hideSubmitPopup() {
    this.setData({
      showSubmitPopup: false
    });
  },

  onContentInput(e) {
    this.setData({
      submitContent: e.detail.value
    });
  },

  async chooseImages() {
    const count = 9 - this.data.submitImages.length;
    if (count <= 0) {
      wx.showToast({
        title: '最多上传9张图片',
        icon: 'none'
      });
      return;
    }

    try {
      const res = await wx.chooseMedia({
        count,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        sizeType: ['compressed']
      });

      this.setData({
        submitImages: [...this.data.submitImages, ...res.tempFiles.map(file => file.tempFilePath)]
      });
    } catch (error) {
      console.log('用户取消选择', error);
    }
  },

  previewImage(e) {
    const { url } = e.currentTarget.dataset;
    const urls = this.data.task.submission ? 
                 this.data.task.submission.images : 
                 this.data.submitImages;
                 
    wx.previewImage({
      current: url,
      urls
    });
  },

  removeImage(e) {
    const { index } = e.currentTarget.dataset;
    const submitImages = [...this.data.submitImages];
    submitImages.splice(index, 1);
    this.setData({ submitImages });
  },

  async submitTask() {
    if (!this.data.submitContent.trim()) {
      wx.showToast({
        title: '请输入提交内容',
        icon: 'none'
      });
      return;
    }

    this.setData({ submitting: true });

    try {
      // 上传图片
      const fileIDs = [];
      for (const image of this.data.submitImages) {
        const cloudPath = `submissions/${this.data.taskId}/${Date.now()}-${Math.random().toString(36).substring(2, 10)}.jpg`;
        const { fileID } = await wx.cloud.uploadFile({
          cloudPath,
          filePath: image
        });
        fileIDs.push(fileID);
      }

      // 更新任务
      await db.collection('tasks').doc(this.data.taskId).update({
        data: {
          status: 'submitted',
          submitTime: db.serverDate(),
          updateTime: db.serverDate(),
          submission: {
            content: this.data.submitContent,
            images: fileIDs,
            submitTime: db.serverDate()
          }
        }
      });

      wx.showToast({
        title: '提交成功',
        icon: 'success'
      });

      this.hideSubmitPopup();
      this.loadTaskDetail(this.data.taskId);

    } catch (error) {
      console.error('提交任务失败:', error);
      wx.showToast({
        title: '提交失败',
        icon: 'none'
      });
    } finally {
      this.setData({ submitting: false });
    }
  },

  async completeTask() {
    try {
      await db.collection('tasks').doc(this.data.taskId).update({
        data: {
          status: 'completed',
          completedTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      });
      
      wx.showToast({
        title: '任务已完成',
        icon: 'success'
      });
      
      this.loadTaskDetail(this.data.taskId);
      
    } catch (err) {
      console.error('完成任务失败:', err);
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      });
    }
  },

  editTask() {
    wx.navigateTo({
      url: `/pages/tasks/create/create?id=${this.data.taskId}`
    });
  },

  deleteTask() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个任务吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await db.collection('tasks').doc(this.data.taskId).remove();
            
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });
            
            setTimeout(() => {
              const pages = getCurrentPages();
              const prevPage = pages[pages.length - 2];
              if (prevPage && prevPage.loadTasks) {
                prevPage.loadTasks();
              }
              wx.navigateBack();
            }, 1500);
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

  shareTask() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage']
    });
  }
})