// バックグラウンドスクリプト - タスク状態の永続化
class BackgroundTaskManager {
  constructor() {
    this.isRunning = false;
    this.startTime = null;
    this.currentTask = '';
    this.timerInterval = null;
    
    this.initialize();
  }

  initialize() {
    // 保存された状態を復元
    this.loadState();
    
    // メッセージリスナーを設定
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // 非同期レスポンスのため
    });

    // タイマーを開始（実行中のタスクがある場合）
    if (this.isRunning) {
      this.startTimer();
    }
  }

  async handleMessage(request, sender, sendResponse) {
    switch (request.action) {
      case 'getState':
        sendResponse({
          isRunning: this.isRunning,
          currentTask: this.currentTask,
          startTime: this.startTime,
          elapsed: this.isRunning ? Date.now() - this.startTime : 0
        });
        break;

      case 'startTask':
        this.startTask(request.taskName);
        sendResponse({ success: true });
        break;

      case 'stopTask':
        const result = this.stopTask();
        sendResponse(result);
        break;

      case 'getHistory':
        const history = await this.getHistory();
        sendResponse(history);
        break;
    }
  }

  startTask(taskName) {
    this.currentTask = taskName;
    this.isRunning = true;
    this.startTime = Date.now();
    
    this.startTimer();
    this.saveState();
  }

  stopTask() {
    if (!this.isRunning) {
      return { success: false, error: 'No task running' };
    }

    const endTime = Date.now();
    const duration = endTime - this.startTime;
    
    const record = {
      name: this.currentTask,
      startTime: this.startTime,
      endTime: endTime,
      duration: duration
    };

    this.saveTaskRecord(record);
    this.resetTask();
    
    return { success: true, record: record };
  }

  resetTask() {
    this.isRunning = false;
    this.startTime = null;
    this.currentTask = '';
    
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    
    this.saveState();
  }

  startTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    
    this.timerInterval = setInterval(() => {
      if (this.isRunning) {
        // タイマー更新（必要に応じて）
        this.saveState();
      }
    }, 1000);
  }

  saveState() {
    chrome.storage.local.set({
      taskState: {
        isRunning: this.isRunning,
        currentTask: this.currentTask,
        startTime: this.startTime
      }
    });
  }

  async loadState() {
    try {
      const result = await chrome.storage.local.get(['taskState']);
      const state = result.taskState;
      
      if (state && state.isRunning) {
        this.isRunning = state.isRunning;
        this.currentTask = state.currentTask;
        this.startTime = state.startTime;
      }
    } catch (error) {
      console.error('Failed to load state:', error);
    }
  }

  saveTaskRecord(record) {
    const today = new Date().toDateString();
    
    chrome.storage.local.get(['taskHistory'], (result) => {
      const history = result.taskHistory || {};
      
      if (!history[today]) {
        history[today] = [];
      }
      
      history[today].push({
        ...record,
        startTime: record.startTime,
        endTime: record.endTime
      });
      
      chrome.storage.local.set({ taskHistory: history });
    });
  }

  async getHistory() {
    const today = new Date().toDateString();
    
    try {
      const result = await chrome.storage.local.get(['taskHistory']);
      const history = result.taskHistory || {};
      return history[today] || [];
    } catch (error) {
      console.error('Failed to get history:', error);
      return [];
    }
  }
}

// バックグラウンドスクリプトを初期化
new BackgroundTaskManager(); 