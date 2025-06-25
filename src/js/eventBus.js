// eventBus.js
const EventBus = {
    events: {},
    subscribe(event, callback) {
        if (!this.events[event]) this.events[event] = [];
        this.events[event].push(callback);
    },
    unsubscribe(event, callback) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(cb => cb !== callback);
    },
    publish(event, data) {
        if (!this.events[event]) return;
        this.events[event].forEach(cb => cb(data));
    }
};

export default EventBus;
