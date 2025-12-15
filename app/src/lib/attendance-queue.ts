type Task = () => Promise<void>;

class AttendanceQueue {
    private queue: Task[] = [];
    private isProcessing = false;

    enqueue(task: Task) {
        this.queue.push(task);
        this.process();
    }

    private async process() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            while (this.queue.length > 0) {
                const task = this.queue.shift();
                if (task) {
                    try {
                        await task();
                    } catch (error) {
                        console.error('Error processing attendance task:', error);
                    }
                    // Add a small delay between tasks to prevent hammering the server
                    // and give the UI/router.refresh() a moment to breathe
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
            }
        } catch (err) {
            console.error("Queue fatal error", err);
        } finally {
            this.isProcessing = false;
            // If items were added during the final steps/delay
            if (this.queue.length > 0) {
                // use setTimeout to break the stack and ensure valid async recursion restart
                setTimeout(() => this.process(), 0);
            }
        }
    }
}

export const attendanceQueue = new AttendanceQueue();
