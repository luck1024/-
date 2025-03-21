Page({
  data: {
    wishes: [],
    filteredWishes: [],
    showModal: false,
    newWish: '',
    note: '',
    dueDate: '',
    today: '',
    searchKeyword: '',
    categories: ['全部', '旅行', '美食', '纪念日', '购物', '其他'],
    selectedCategory: '全部',
    tags: ['旅行', '美食', '电影', '购物', '纪念日'],
    selectedTag: -1,
    priorities: [
      { text: '普通', class: 'normal' },
      { text: '重要', class: 'important' },
      { text: '紧急', class: 'urgent' }
    ],
    selectedPriority: 0,
    sortType: 'date',
    stats: {
      total: 0,
      completed: 0,
      urgent: 0
    }
  },

  onLoad() {
    const today = new Date();
    this.setData({
      today: today.toISOString().split('T')[0]
    });
    this.loadWishes();
  },

  onShow() {
    this.loadWishes();
  },

  loadWishes() {
    const storedWishes = wx.getStorageSync('wishes') || [];
    const newWishes = [...this.data.wishes, ...storedWishes];
    
    // 去重
    const uniqueWishes = Array.from(new Set(newWishes.map(w => w.id)))
      .map(id => newWishes.find(w => w.id === id));
    
    this.setData({ 
      wishes: uniqueWishes,
      filteredWishes: uniqueWishes
    });
    
    this.updateStats();
  },

  updateStats() {
    const wishes = this.data.wishes;
    const stats = {
      total: wishes.length,
      completed: wishes.filter(w => w.completed).length,
      urgent: wishes.filter(w => w.priority === 2).length
    };
    this.setData({ stats });
  },

  onSearch(e) {
    const keyword = e.detail.value.toLowerCase();
    this.setData({ searchKeyword: keyword });
    this.filterWishes();
  },

  filterByCategory(e) {
    const category = e.currentTarget.dataset.category;
    this.setData({ selectedCategory: category });
    this.filterWishes();
  },

  filterWishes() {
    let wishes = [...this.data.wishes];
    const { searchKeyword, selectedCategory } = this.data;

    // 搜索过滤
    if (searchKeyword) {
      wishes = wishes.filter(wish => 
        wish.content.toLowerCase().includes(searchKeyword) ||
        wish.category.toLowerCase().includes(searchKeyword)
      );
    }

    // 分类过滤
    if (selectedCategory !== '全部') {
      wishes = wishes.filter(wish => wish.category === selectedCategory);
    }

    this.setData({ filteredWishes: wishes });
  },

  sortWishes(e) {
    const type = e.currentTarget.dataset.type;
    const wishes = [...this.data.filteredWishes];

    switch(type) {
      case 'date':
        wishes.sort((a, b) => new Date(b.date) - new Date(a.date));
        break;
      case 'priority':
        wishes.sort((a, b) => b.priority - a.priority);
        break;
      case 'completed':
        wishes.sort((a, b) => (a.completed === b.completed) ? 0 : a.completed ? 1 : -1);
        break;
    }

    this.setData({ 
      sortType: type,
      filteredWishes: wishes
    });
  },

  toggleWish(e) {
    const id = e.currentTarget.dataset.id;
    const wishes = this.data.wishes.map(wish => {
      if (wish.id === id) {
        return {
          ...wish,
          completed: !wish.completed,
          completedAt: !wish.completed ? new Date().toISOString() : null
        };
      }
      return wish;
    });

    this.setData({ wishes });
    this.filterWishes();
    this.updateStats();
    wx.setStorageSync('wishes', wishes);
  },

  deleteWish(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '提示',
      content: '确定要删除这个心愿吗？',
      success: (res) => {
        if (res.confirm) {
          const wishes = this.data.wishes.filter(wish => wish.id !== id);
          this.setData({ wishes });
          this.filterWishes();
          this.updateStats();
          wx.setStorageSync('wishes', wishes);
        }
      }
    });
  },

  showAddModal() {
    this.setData({
      showModal: true,
      newWish: '',
      selectedTag: -1,
      selectedPriority: 0,
      dueDate: '',
      note: ''
    });
  },

  hideModal() {
    this.setData({ showModal: false });
  },

  onInput(e) {
    this.setData({ newWish: e.detail.value });
  },

  selectTag(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ selectedTag: index });
  },

  selectPriority(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ selectedPriority: index });
  },

  onDateChange(e) {
    this.setData({ dueDate: e.detail.value });
  },

  onNoteInput(e) {
    this.setData({ note: e.detail.value });
  },

  addWish() {
    const { newWish, selectedTag, tags, selectedPriority, dueDate, note } = this.data;
    
    if (!newWish.trim()) {
      wx.showToast({
        title: '请输入心愿内容',
        icon: 'none'
      });
      return;
    }

    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
    
    const wish = {
      id: Date.now(),
      content: newWish,
      date: dateStr,
      category: selectedTag !== -1 ? tags[selectedTag] : '其他',
      priority: selectedPriority,
      completed: false,
      dueDate: dueDate || null,
      note: note || null
    };

    const wishes = [wish, ...this.data.wishes];
    this.setData({
      wishes,
      showModal: false
    });
    
    this.filterWishes();
    this.updateStats();
    wx.setStorageSync('wishes', wishes);
    
    wx.showToast({
      title: '添加成功',
      icon: 'success'
    });
  }
}); 