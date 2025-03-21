Page({
  data: {
    notifications: [],
    isLoading: false,
    page: 1,
    pageSize: 20,
    hasMore: true
  },

  onLoad() {
    this.loadNotifications();
  },

  // 加载通知列表
  async loadNotifications(isRefresh = false) {
    if (isRefresh) {
      this.setData({
        page: 1,
        hasMore: true
      });
    }

    if (!this.data.hasMore || this.data.isLoading) return;

    try {
      this.setData({ isLoading: true });
      
      const result = await wx.cloud.callFunction({
        name: 'notifications_list',
        data: {
          page: this.data.page,
          pageSize: this.data.pageSize
        }
      });
      
      if (result.result.success) {
        const notifications = result.result.notifications;
        
        this.setData({
          notifications: isRefresh ? notifications : [...this.data.notifications, ...notifications],
          page: this.data.page + 1,
          hasMore: notifications.length === this.data.pageSize
        });
      } else {
        wx.showToast({
          title: '获取通知失败',
          icon: 'none'
        });
      }
    } catch (err) {
      console.error('获取通知失败', err);
      wx.showToast({
        title: '获取通知失败',
        icon: 'none'
      });
    } finally {
      this.setData({ isLoading: false });
      wx.stopPullDownRefresh();
    }
  },

  // 处理通知点击
  handleNotificationTap(e) {
    const { notification } = e.currentTarget.dataset;
    
    // 如果通知未读，标记为已读
    if (!notification.isRead) {
      this.markAsRead(notification._id);
    }
    
    // 根据通知类型跳转到相应页面
    switch (notification.type) {
      case 'moment':
        wx.navigateTo({
          url: `/pages/moment/detail/detail?id=${notification.targetId}`
        });
        break;
      case 'letter':
        wx.navigateTo({
          url: `/pages/letters/detail/detail?id=${notification.targetId}`
        });
        break;
      case 'task':
        wx.navigateTo({
          url: `/pages/tasks/detail/detail?id=${notification.targetId}`
        });
        break;
      // 其他类型的通知处理...
    }
  },

  // 标记通知为已读
  async markAsRead(notificationId) {
    try {
      const result = await wx.cloud.callFunction({
        name: 'notifications_markAsRead',
        data: { notificationId }
      });
      
      if (result.result.success) {
        // 更新本地通知状态
        const notifications = this.data.notifications.map(item => {
          if (item._id === notificationId) {
            return { ...item, isRead: true };
          }
          return item;
        });
        
        this.setData({ notifications });
      }
    } catch (err) {
      console.error('标记已读失败', err);
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadNotifications(true);
  },

  // 触底加载更多
  onReachBottom() {
    if (this.data.hasMore) {
      this.loadNotifications();
    }
  }
}) 