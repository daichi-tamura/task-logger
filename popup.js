class TaskLogger {
  constructor() {
    this.isRunning = false;
    this.startTime = null;
    this.timerInterval = null;
    this.currentTask = '';
    
    this.initializeElements();
    this.bindEvents();
    this.initializeState();
  }

  initializeElements() {
    this.taskInput = document.getElementById('taskInput');
    this.charCount = document.getElementById('charCount');
    this.startBtn = document.getElementById('startBtn');
    this.stopBtn = document.getElementById('stopBtn');
    this.currentTaskElement = document.getElementById('currentTask');
    this.timerElement = document.getElementById('timer');
    this.taskHistory = document.getElementById('taskHistory');
  }

  bindEvents() {
    this.taskInput.addEventListener('input', () => this.updateCharCount());
    this.taskInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !this.isRunning) {
        this.startTask();
      }
    });
    this.startBtn.addEventListener('click', () => this.startTask());
    this.stopBtn.addEventListener('click', () => this.stopTask());
  }

  async initializeState() {
    // バックグラウンドスクリプトから現在の状態を取得
    const state = await this.sendMessage({ action: 'getState' });
    
    if (state.isRunning) {
      this.isRunning = state.isRunning;
      this.currentTask = state.currentTask;
      this.startTime = state.startTime;
      
      this.startBtn.disabled = true;
      this.stopBtn.disabled = false;
      this.taskInput.disabled = true;
      this.taskInput.value = this.currentTask;
      
      this.currentTaskElement.textContent = `実行中: ${this.currentTask}`;
      this.startTimer();
    }
    
    this.loadHistory();
    this.updateCharCount();
  }

  updateCharCount() {
    const count = this.taskInput.value.length;
    this.charCount.textContent = count;
    
    if (count > 25) {
      this.charCount.style.color = '#f44336';
    } else if (count > 20) {
      this.charCount.style.color = '#ff9800';
    } else {
      this.charCount.style.color = '#666';
    }
  }

  async startTask() {
    const taskName = this.taskInput.value.trim();
    
    if (!taskName) {
      alert('タスク内容を入力してください');
      return;
    }

    // バックグラウンドスクリプトにタスク開始を通知
    const result = await this.sendMessage({ 
      action: 'startTask', 
      taskName: taskName 
    });

    if (result.success) {
      this.currentTask = taskName;
      this.isRunning = true;
      this.startTime = Date.now();
      
      this.startBtn.disabled = true;
      this.stopBtn.disabled = false;
      this.taskInput.disabled = true;
      
      this.currentTaskElement.textContent = `実行中: ${taskName}`;
      this.startTimer();
    }
  }

  async stopTask() {
    if (!this.isRunning) return;

    // バックグラウンドスクリプトにタスク終了を通知
    const result = await this.sendMessage({ action: 'stopTask' });

    if (result.success) {
      this.resetTask();
      this.loadHistory();
    }
  }

  resetTask() {
    this.isRunning = false;
    this.startTime = null;
    this.currentTask = '';
    
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    
    this.startBtn.disabled = false;
    this.stopBtn.disabled = true;
    this.taskInput.disabled = false;
    this.taskInput.value = '';
    
    this.currentTaskElement.textContent = '';
    this.timerElement.textContent = '';
    this.updateCharCount();
  }

  startTimer() {
    this.timerInterval = setInterval(() => {
      if (this.startTime) {
        const elapsed = Date.now() - this.startTime;
        this.timerElement.textContent = this.formatDuration(elapsed);
      }
    }, 1000);
  }

  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    } else {
      return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
    }
  }

  async loadHistory() {
    const tasks = await this.sendMessage({ action: 'getHistory' });
    this.displayHistory(tasks);
  }

  displayHistory(tasks) {
    if (tasks.length === 0) {
      this.taskHistory.innerHTML = '<div class="empty-history">今日の記録はありません</div>';
      return;
    }

    const historyHTML = tasks
      .slice(-5) // 最新5件のみ表示
      .reverse()
      .map(task => {
        const startTime = new Date(task.startTime);
        const endTime = new Date(task.endTime);
        
        return `
          <div class="task-record">
            <div class="task-name">${task.name}</div>
            <div class="task-time">
              ${startTime.toLocaleTimeString()} - ${endTime.toLocaleTimeString()}
            </div>
            <div class="task-duration">
              実行時間: ${this.formatDuration(task.duration)}
            </div>
          </div>
        `;
      })
      .join('');

    this.taskHistory.innerHTML = historyHTML;
  }

  sendMessage(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response) => {
        resolve(response);
      });
    });
  }
}

// 拡張機能が読み込まれたときにTaskLoggerを初期化
document.addEventListener('DOMContentLoaded', () => {
  new TaskLogger();
}); 