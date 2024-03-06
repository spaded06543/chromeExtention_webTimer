export default class Timer {
    #time = -1;
    #remainTime = -1;
    #timerOutId = -1;
    #startTime = -1;
    #onTimeout = new EventTarget();
    
    constructor(time) {
        this.#time = time;
        this.#remainTime = time;
    }

    Reset() {
        this.Stop();
        this.#remainTime = this.#time;
        this.Start();
    }

    Start() {
        this.#Start(this.#remainTime);
    }

    #Start(time) {
        this.#startTime = Date.now();
        this.#timerOutId = setTimeout(this.#execute, time);
    }

    Stop() {
        if (this.#timerOutId == -1)
            return;
        this.#remainTime -= Date.now() - this.#startTime;
        clearTimeout(this.#timerOutId);
        this.#timerOutId = -1;
    }

    addEventListener(callBack) {
        this.#onTimeout.addEventListener("onTimeout", callBack);
    }

    #execute() {
        this.onTimeout.dispatchEvent(new Event("onTimeout"));
        this.Stop();
    }
}
