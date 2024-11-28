import { Worker } from 'worker_threads';

interface Task {
  data: any;
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}

export class WorkerPool {
  private workers: Worker[] = [];
  private taskQueue: Task[] = [];
  private static instance: WorkerPool | null = null;

  constructor(maxWorkers = 0) {
    for (let i = 0; i < maxWorkers; i++) {
      this.createWorker();
    }
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }

  static getInstance(numWorkers: number = 3): WorkerPool {
    if (!this.instance) {
      this.instance = new WorkerPool(numWorkers);
    }
    return this.instance;
  }

  private createWorker() {
    const worker = new Worker('./src/worker-pool/workers/verifySignature.ts', {
      execArgv: ['--require', 'ts-node/register'],
    });
    worker.on('message', (result) => this.handleWorkerMessage(result, worker));
    worker.on('error', (error) => this.handleWorkerError(error, worker));
    worker.on('exit', (code) => this.handleWorkerExit(code, worker));
    this.workers.push(worker);
  }

  private shutdown() {
    console.log('Shutting down workers...');
    this.workers.forEach((worker) => {
      worker.terminate();
    });
    process.exit(0); // Exit the process
  }

  private handleWorkerMessage(result: any, worker: Worker) {
    console.log(result);
    const task = this.taskQueue.shift();
    if (task) {
      if (result.success) {
        task.resolve(result.data);
      } else {
        task.reject(new Error(result.data));
      }
    }
    worker['isBusy'] = false;
    this.assignTask();
  }

  private handleWorkerError(error: Error, worker: Worker) {
    worker['isBusy'] = false;
    console.error('Worker error:', error);
  }

  private handleWorkerExit(code: number, worker: Worker) {
    console.error(`Worker stopped with exit code ${code}`);
    this.workers = this.workers.filter((w) => w !== worker);
    this.createWorker();
  }

  public async performTask<T>(data: any): Promise<T> {
    console.log('Pushed the task');

    return new Promise((resolve, reject) => {
      const task: Task = { data, resolve, reject };
      this.taskQueue.push(task);
      this.assignTask();
    });
  }

  private assignTask() {
    const availableWorker = this.workers.find((worker) => !worker['isBusy']);
    if (availableWorker && this.taskQueue.length > 0) {
      const task = this.taskQueue[0];
      if (task) {
        availableWorker['isBusy'] = true;
        availableWorker.postMessage(task.data);
      }
    }
  }
}
